#!/usr/bin/env python3
"""Bounded Steady hosted acceptance; never reads or changes real users' records.

No deployment, flag mutation, Management API token, emailed OTP, or AI retry.
Default --mode dry-run only runs the local canonical Deno validator.

Credentials: STEADY_ACCEPTANCE_CREDENTIALS=/private/path.json (0600) with
{"url":"https://REF.supabase.co","publishable":"sb_publishable_...",
 "admin":"SERVER_ONLY_SERVICE_ROLE_KEY"}; otherwise use private .env.local keys
SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY.

Run --mode gate before enabling v2: AI consent is false so an unexpectedly enabled
flag still cannot call the provider. --mode sync tests only synthetic rows.
Run --mode live after enabling: at most 4 real plan calls (v1 + 3 v2 scenes).
Default live mode uses two disposable accounts because the unchanged per-user quota is
three plans per day. Every non-dry run requires --project-ref REF and --output receipt.json.
For a bounded diagnostic run use --mode live --scenes bodyweight --skip-sync.
The receipt records skipped sync and never presents it as full acceptance.
"""
from __future__ import annotations
import argparse
import base64
import copy
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
CATALOG_ROOT = ROOT / "Sources/SteadyCore/Resources/TrainingCollections"
CATALOGS = {v: json.loads((CATALOG_ROOT / f"exercise-catalog.v{v}.json").read_text()) for v in (1, 2)}
EXTENDED = ("catalogID", "catalogVersion", "templateID", "role")
SCENES = ("v1", "bodyweight", "dumbbells", "gym")
SAFE_ERROR_CODES = frozenset(("invalid_input", "invalid_output", "plan_conditions_insufficient",
    "lower_body_disabled", "plan_catalog_disabled", "plan_equipment_required", "unauthenticated",
    "consent_required", "rate_limited", "provider_unavailable", "duplicate_request", "request_in_progress",
    "account_deleting", "method_not_allowed", "payload_too_large", "insufficient_data"))


def safe_error_code(payload):
    value = payload.get("code") if isinstance(payload, dict) else None
    return value if isinstance(value, str) and value in SAFE_ERROR_CODES else None


def uid():
    return str(uuid.uuid4())


def metadata(record_id=None):
    now = int(time.time() * 1000)
    return {"id": record_id or uid(), "createdAt": now, "updatedAt": now,
            "source": "manual", "schemaVersion": 1}


def confirmations():
    return [{"conditionID": x["id"], "version": x["version"], "status": "ready"}
            for x in CATALOGS[2]["conditions"]]


def preferences(scene="bodyweight"):
    equipment, ids = {"bodyweight": ("自重", ["stable-chair", "fixed-support"]),
                      "dumbbells": ("哑铃", ["dumbbells"]),
                      "gym": ("健身房", ["leg-press-machine", "leg-curl-machine"]),
                      "v1": ("自重", ["wall"])}[scene]
    result = {"metadata": metadata(), "goal": "下肢基础力量与运动习惯",
              "experience": "初学者", "equipment": equipment,
              "availableEquipmentIDs": ids, "availableMinutes": 30, "limitations": "",
              "healthRead": False, "cloudSync": True, "aiProcessing": True,
              "onboardingComplete": True}
    if scene == "v1":
        result["goal"] = "通过基础上肢推力练习建立运动习惯"
    else:
        result["movementConditions"] = confirmations()
        # These are synthetic capabilities, chosen to exercise each available scene.
        disabled = {"bodyweight": {"basic-squat", "split-stance"},
                    "dumbbells": {"floor-access"}, "gym": {"basic-squat", "split-stance"}}[scene]
        for item in result["movementConditions"]:
            if item["conditionID"] in disabled:
                item["status"] = "unable"
        if scene == "dumbbells":
            result["goal"] += "；优先使用高脚杯深蹲和双哑铃罗马尼亚硬拉"
    return result


def make_request(consent, scene="bodyweight"):
    request = {"requestID": uid(), "schemaVersion": 1, "consent": consent,
               "preferences": preferences(scene), "planCatalogVersion": 1 if scene == "v1" else 2,
               "today": int(time.time() * 1000), "timeZoneID": "Asia/Shanghai"}
    if scene != "v1":
        request["programKind"] = "lowerBodyBasics"
    return request


VALIDATOR = r'''
import { aiRequest, plan } from "SCHEMA_URL";
import { buildPlan, calendarOffset } from "COACH_URL";
Deno.env.set("STEADY_LOWER_BODY_ENABLED","true");
Deno.env.set("STEADY_PLAN_CATALOG_ENABLED","true");
const input=JSON.parse(await Deno.readTextFile(Deno.args[0]));
const b=aiRequest.parse(input.request);
const value=plan.parse(input.plan);
const day=(ms:number)=>new Intl.DateTimeFormat("en-CA",{timeZone:b.timeZoneID,year:"numeric",month:"2-digit",day:"2-digit"}).format(ms);
const base=Date.parse(day(b.today)+"T00:00:00Z");
const raw={title:value.title,sessions:value.sessions.map(s=>({title:s.title,
 dayOffset:(Date.parse(day(s.scheduledAt)+"T00:00:00Z")-base)/86400000,
 exercises:s.exercises.map(e=>({exerciseID:e.catalogID,role:e.role}))}))};
const expected=buildPlan(raw,b);
if(JSON.stringify(value.generationContext)!==JSON.stringify(expected.generationContext))throw new Error("context differs from canonical request snapshot");
if(value.status!=="draft")throw new Error("provider response must be draft");
if(new Set(value.sessions.map(s=>s.metadata.id)).size!==value.sessions.length)throw new Error("session UUID repeated");
const output=value.sessions.map((s,i)=>{
 const e=expected.sessions[i];
 if(s.scheduledAt!==e.scheduledAt||s.minutes!==e.minutes||s.exercises.length!==e.exercises.length)throw new Error("session date budget or shape differs from canonical build");
 if(new Set(s.exercises.map(x=>x.id)).size!==s.exercises.length)throw new Error("exercise UUID repeated");
 for(let j=0;j<s.exercises.length;j++)for(const key of ["catalogID","catalogVersion","templateID","role","name","prescription"] as const)
  if(s.exercises[j][key]!==e.exercises[j][key])throw new Error("exercise snapshot differs from canonical build");
 return {day:day(s.scheduledAt),minutes:s.minutes,exerciseIDs:s.exercises.map(x=>x.catalogID),templateIDs:s.exercises.map(x=>x.templateID),roles:s.exercises.map(x=>x.role)};
});
console.log(JSON.stringify({valid:true,catalogVersion:b.planCatalogVersion,sessions:output}));
'''


def validate_plan(request, plan):
    """Reuse current production request schema and deterministic canonical builder, offline."""
    deno = shutil.which("deno")
    if not deno:
        raise RuntimeError("Deno is required for canonical response validation")
    with tempfile.TemporaryDirectory(prefix="steady-hosted-validate-") as folder:
        folder = Path(folder)
        code = VALIDATOR.replace("SCHEMA_URL", (ROOT / "supabase/functions/_shared/schema.ts").as_uri())
        code = code.replace("COACH_URL", (ROOT / "supabase/functions/_shared/coach.ts").as_uri())
        script, fixture = folder / "validate.ts", folder / "fixture.json"
        script.write_text(code)
        fixture.write_text(json.dumps({"request": request, "plan": plan}, ensure_ascii=False))
        fixture.chmod(0o600)
        result = subprocess.run([deno, "run", "--cached-only", "--no-prompt", "--allow-read",
                                 "--allow-env", "--config", str(ROOT / "supabase/functions/deno.json"),
                                 str(script), str(fixture)], text=True, capture_output=True, timeout=45)
        if result.returncode:
            # Do not print subprocess input or bodies. These contain only synthetic data,
            # but keeping errors bounded also prevents accidental future credential leaks.
            raise RuntimeError("Canonical Deno validation failed (offline); inspect local validator")
        return json.loads(result.stdout)


def fixture_plan(request):
    v = request["planCatalogVersion"]
    sequence = [("march-in-place", "warmup"),
                ("chair-sit-to-stand", "main"), ("floor-glute-bridge", "main"), ("walk", "cooldown")]
    if v == 1:
        sequence[1:3] = [("wall-push-up", "main")]
    exercises = []
    seconds = 0
    for exercise_id, role in sequence:
        entry = next(e for e in CATALOGS[v]["exercises"] if e["id"] == exercise_id)
        template = next(t for t in entry["templates"] if t["role"] == role and "初学者" in t["experiences"])
        seconds += template["estimatedSeconds"]
        exercises.append({"id": uid(), "name": entry["name"], "prescription": template["prescription"],
                          "catalogID": entry["id"], "catalogVersion": v, "templateID": template["id"], "role": role})
    if v == 2:
        seconds += (len(exercises) - 1) * 30
    p = request["preferences"]
    context = {"experience": p["experience"], "availableEquipmentIDs": p["availableEquipmentIDs"], "availableMinutes": p["availableMinutes"]}
    if v == 2:
        context.update(movementConditions=p["movementConditions"], programKind="lowerBodyBasics", rulesVersion=2)
    return {"metadata": metadata(), "title": "Synthetic local acceptance fixture", "status": "draft",
            "generationContext": context, "sessions": [
                {"metadata": metadata(), "title": "Synthetic session", "scheduledAt": request["today"] + d * 86400000,
                 "minutes": max(10, (seconds + 59) // 60), "exercises": copy.deepcopy(exercises)} for d in (0, 3)]}


def private_values():
    custom = os.environ.get("STEADY_ACCEPTANCE_CREDENTIALS")
    path = Path(custom).expanduser() if custom else ROOT / ".env.local"
    if not path.is_file() or path.stat().st_mode & 0o077:
        raise RuntimeError("Credential file must exist and have private permissions (0600)")
    if custom:
        raw = json.loads(path.read_text())
        values = {key: raw.get(key, "") for key in ("url", "publishable", "admin")}
    else:
        raw = {}
        for line in path.read_text().splitlines():
            name, separator, value = line.partition("=")
            if separator and not name.lstrip().startswith("#"):
                raw[name.strip()] = value.strip().strip('"').strip("'")
        values = {"url": raw.get("SUPABASE_URL", ""), "publishable": raw.get("SUPABASE_PUBLISHABLE_KEY", ""),
                  "admin": raw.get("SUPABASE_SERVICE_ROLE_KEY", "")}
    if not all(isinstance(x, str) and x for x in values.values()):
        raise RuntimeError("Missing URL, publishable key, or server-only admin key")
    return values


class Acceptance:
    def __init__(self, args, values):
        self.args, self.values = args, values
        self.token = self.user_id = None
        self.users = []
        self.report = {"mode": args.mode, "projectRef": args.project_ref, "startedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
                       "status": "running", "checks": [], "realAIRequests": 0, "plans": [], "aiAttempts": [],
                       "selectedScenes": list(getattr(args, "scenes", None) or SCENES) if args.mode == "live" else [],
                       "syncSkipped": bool(getattr(args, "skip_sync", False)), "cleanup": {"completed": False}}
        self.consent = {"deviceID": uid(), "revision": 1, "healthRead": False, "cloudSync": True,
                        "aiProcessing": args.mode == "live", "policyVersion": "2026-09-23"}
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def request(self, path, body=None, *, admin=False, token=None, method="POST", timeout=45):
        key = self.values["admin"] if admin else self.values["publishable"]
        bearer = key if admin else (token or self.token or key)
        request = urllib.request.Request(self.values["url"].rstrip("/") + path,
                    data=None if body is None else json.dumps(body).encode(), method=method,
                    headers={"apikey": key, "Authorization": "Bearer " + bearer, "Content-Type": "application/json"})
        try:
            with self.opener.open(request, timeout=timeout) as response:
                status, raw = response.status, response.read()
        except urllib.error.HTTPError as error:
            status, raw = error.code, error.read()
        except (urllib.error.URLError, TimeoutError):
            raise RuntimeError("Network request failed or timed out; no automatic retry") from None
        try:
            data = json.loads(raw) if raw else {}
        except ValueError:
            data = {}
        return status, data

    def call(self, route, body, **kwargs):
        return self.request("/functions/v1/" + route, body, **kwargs)

    def check(self, condition, label, status=None):
        self.report["checks"].append({"label": label, "passed": bool(condition), **({"httpStatus": status} if status else {})})
        if not condition:
            raise AssertionError(label + (f" (HTTP {status})" if status else ""))
        print("PASS " + label, flush=True)

    def create_user(self):
        email, password = "steady-lower-" + uuid.uuid4().hex + "@example.test", secrets.token_urlsafe(36)
        status, result = self.request("/auth/v1/admin/users", {"email": email, "password": password,
                            "email_confirm": True, "app_metadata": {"steady_acceptance": "lower-body-v2"}}, admin=True)
        self.check(status in (200, 201) and isinstance(result.get("id"), str), "synthetic account created without sending email", status)
        self.user_id = result["id"]
        self.token = None
        self.users.append({"id": self.user_id, "token": None})
        status, result = self.request("/auth/v1/token?grant_type=password", {"email": email, "password": password})
        self.check(status == 200 and bool(result.get("access_token")), "synthetic account signed in", status)
        self.token = result["access_token"]
        self.users[-1]["token"] = self.token
        status, _ = self.call("consents", self.consent)
        self.check(status == 200, "synthetic consent registered", status)

    def push(self, kind, record_id, payload, version=0, parent=None):
        record = {"id": record_id, "kind": kind, "logicalID": "profile" if kind == "profiles" else record_id,
                  "payload": json.dumps(payload, ensure_ascii=False), "version": version, "deleted": False}
        if parent:
            record["parentID"] = parent
        status, result = self.call("sync-push", {"consent": self.consent, "mutation": {"id": uid(), "record": record, "attempt": 0, "retryAt": 0}})
        self.check(status == 200 and result.get("conflict") is not True and result.get("record", {}).get("version") == version + 1,
                   f"synthetic {kind} write version {version + 1}", status)
        return json.loads(result["record"]["payload"])

    def sync(self):
        request = make_request(self.consent)
        plan = fixture_plan(request)
        plan_id, session_id = plan["metadata"]["id"], plan["sessions"][0]["metadata"]["id"]
        header = {**plan, "sessions": []}
        self.push("plans", plan_id, header)
        source = plan["sessions"][0]
        self.push("sessions", session_id, source, parent=plan_id)
        legacy = copy.deepcopy(source)
        for exercise in legacy["exercises"]:
            for key in EXTENDED:
                exercise.pop(key, None)
        legacy["scheduledAt"] += 86400000
        saved = self.push("sessions", session_id, legacy, 1, plan_id)
        self.check(saved["exercises"] == source["exercises"], "old-client date edit preserves all teaching and templates")
        legacy["feedback"] = {"completed": True, "perceivedEffort": 3, "note": "Synthetic acceptance feedback", "recordedAt": int(time.time() * 1000)}
        saved = self.push("sessions", session_id, legacy, 2, plan_id)
        self.check(saved["exercises"] == source["exercises"] and saved["feedback"] == legacy["feedback"], "old-client feedback edit preserves references")
        legacy["exercises"][1]["prescription"] = "合成验收：手动调整处方"
        saved = self.push("sessions", session_id, legacy, 3, plan_id)
        self.check(saved["exercises"][1]["catalogID"] == source["exercises"][1]["catalogID"] and saved["exercises"][1].get("templateID") is None,
                   "old-client prescription edit retains teaching but clears template")
        legacy["exercises"][1]["name"] = "合成验收：自定义动作"
        saved = self.push("sessions", session_id, legacy, 4, plan_id)
        self.check(saved["exercises"][1].get("catalogID") is None, "old-client rename clears teaching association")
        # Explicitly clear an entry that still has a live reference, not the renamed one.
        legacy["exercises"][2].update({key: None for key in EXTENDED})
        saved = self.push("sessions", session_id, legacy, 5, plan_id)
        self.check(all(saved["exercises"][2].get(key) is None for key in EXTENDED), "explicit null clears an existing teaching association")
        expected_exercises = saved["exercises"]
        legacy_header = {key: value for key, value in header.items() if key != "generationContext"}
        saved = self.push("plans", plan_id, legacy_header, 1)
        self.check(saved.get("generationContext") == plan["generationContext"], "old plan header preserves v2 snapshot")
        partial = copy.deepcopy(header)
        partial["generationContext"].pop("movementConditions")
        partial["generationContext"].pop("programKind")
        partial["generationContext"].pop("rulesVersion")
        saved = self.push("plans", plan_id, partial, 2)
        self.check(saved.get("generationContext") == plan["generationContext"], "v1 nested snapshot retains v2 conditions and rules")
        partial["generationContext"]["movementConditions"] = None
        saved = self.push("plans", plan_id, partial, 3)
        self.check(saved["generationContext"]["movementConditions"] is None and saved["generationContext"]["rulesVersion"] == 2,
                   "explicit nested null clears conditions but retains omitted rules")
        profile = copy.deepcopy(request["preferences"])
        profile_id = profile["metadata"]["id"]
        self.push("profiles", profile_id, profile)
        old_profile = {key: value for key, value in profile.items() if key not in ("availableEquipmentIDs", "movementConditions")}
        saved = self.push("profiles", profile_id, old_profile, 1)
        self.check(saved["movementConditions"] == profile["movementConditions"] and saved["availableEquipmentIDs"] == profile["availableEquipmentIDs"],
                   "old same-scene profile retains inventory and conditions")
        old_profile["equipment"] = "健身房"
        saved = self.push("profiles", profile_id, old_profile, 2)
        self.check(saved["movementConditions"] == profile["movementConditions"] and saved["availableEquipmentIDs"] is None,
                   "old changed-scene profile clears inventory and retains conditions")
        saved = self.push("profiles", profile_id, {**old_profile, "movementConditions": None}, 3)
        self.check(saved["movementConditions"] is None, "explicit profile null clears conditions")
        restored = self.pull_restored_record(session_id)
        self.check(restored is not None and restored["version"] == 6 and json.loads(restored["payload"])["exercises"] == expected_exercises,
                   "fresh sync pull restores final synthetic references")

    def pull_restored_record(self, record_id):
        # sync_pull is a change stream, not a unique-record snapshot. Each change
        # joins the current row, so several entries may share UUID and version.
        # Match CloudSyncService: consume in cursor order and accept each envelope.
        cursor, latest, envelope_count, target_mentions = 0, {}, 0, 0
        for page in range(1, 6):  # This bounded fixture creates only 14 changes.
            status, result = self.call("sync-pull", {"cursor": cursor, "consent": self.consent})
            self.check(status == 200 and isinstance(result.get("records"), list)
                       and type(result.get("cursor")) is int and type(result.get("hasMore")) is bool,
                       f"synthetic sync pull page {page} envelope contract", status)
            next_cursor, records = result["cursor"], result["records"]
            self.check(next_cursor >= cursor and (not records or next_cursor > cursor)
                       and (not result["hasMore"] or next_cursor > cursor),
                       f"synthetic sync pull page {page} cursor progress")
            for record in records:
                self.check(isinstance(record, dict) and isinstance(record.get("id"), str)
                           and type(record.get("version")) is int and isinstance(record.get("payload"), str),
                           "synthetic sync pull record envelope")
                latest[record["id"]] = record
                envelope_count += 1
                target_mentions += record["id"] == record_id
            cursor = next_cursor
            if not result["hasMore"]:
                self.report["syncPull"] = {"pages": page, "envelopes": envelope_count,
                    "distinctRecords": len(latest), "repeatedEnvelopes": envelope_count - len(latest),
                    "targetOccurrences": target_mentions, "finalCursor": cursor,
                    "targetVersion": latest.get(record_id, {}).get("version")}
                return latest.get(record_id)
        raise AssertionError("Synthetic sync pull exceeded the five-page fixture bound")

    def gate(self):
        status, result = self.call("plan-draft", make_request(self.consent))
        self.check(status == 503 and result.get("code") == "lower_body_disabled", "v2 rollout is disabled before any provider call", status)

    def live(self):
        calls_this_user = 0
        for scene in (getattr(self.args, "scenes", None) or SCENES):
            if calls_this_user >= 3 or (scene == "bodyweight" and calls_this_user > 0):
                self.create_user()  # Preserve the production limit of 3 plans/user/day.
                calls_this_user = 0
            request = make_request(self.consent, scene)
            self.report["realAIRequests"] += 1
            calls_this_user += 1
            started = time.monotonic()
            status, result = self.call("plan-draft", request, timeout=110)
            error_code = safe_error_code(result)
            self.report["aiAttempts"].append({"scene": scene, "requestID": request["requestID"],
                "httpStatus": status, "elapsedSeconds": round(time.monotonic() - started, 2),
                **({"code": error_code} if error_code else {})})
            self.check(status == 200, f"real AI {scene} plan returned" + (f" [{error_code}]" if error_code else ""), status)
            validated = validate_plan(request, result)
            self.report["plans"].append({"scene": scene, "requestID": request["requestID"],
                                         "elapsedSeconds": round(time.monotonic() - started, 2), **validated})
            self.check(validated["valid"], f"{scene} canonical identities templates conditions budget roles dates validated")
        for label, conditions, code in (
            ("missing", [], "plan_conditions_insufficient"),
            ("stale", [{"conditionID": "floor-access", "version": 999, "status": "ready"}], "invalid_input"),
            ("unsure", [{**x, "status": "unsure"} for x in confirmations()], "plan_conditions_insufficient"),
        ):
            request = make_request(self.consent)
            request["preferences"]["movementConditions"] = conditions
            status, result = self.call("plan-draft", request)
            self.check(status == 400 and result.get("code") == code, f"{label} conditions rejected before AI", status)

    def cleanup(self):
        # Every deletion is confined to a user ID returned by this process's create.
        # A logout/network failure must never prevent attempting account deletion.
        receipts = []
        for created in self.users:
            statuses = {}
            if created["token"]:
                try:
                    statuses["logoutHTTP"], _ = self.request("/auth/v1/logout?scope=global", token=created["token"])
                except Exception as error:
                    statuses["logoutError"] = type(error).__name__
            try:
                statuses["deleteHTTP"], _ = self.request("/auth/v1/admin/users/" + created["id"], admin=True, method="DELETE")
                statuses["verifyUserHTTP"], _ = self.request("/auth/v1/admin/users/" + created["id"], admin=True, method="GET")
                statuses["verifyRecordsHTTP"], rows = self.request("/rest/v1/records?user_id=eq." + created["id"], admin=True, method="GET")
                completed = statuses["deleteHTTP"] in (200, 204) and statuses["verifyUserHTTP"] == 404 and statuses["verifyRecordsHTTP"] == 200 and rows == []
            except Exception as error:
                statuses["errorType"] = type(error).__name__
                completed = False
            receipts.append({"completed": completed, **statuses,
                             **({"syntheticUserID": created["id"]} if not completed else {})})
        self.report["cleanup"] = {"completed": all(r["completed"] for r in receipts),
                                  "createdUsers": len(self.users), "accounts": receipts}
        print("Synthetic account cleanup: " + ("passed" if self.report["cleanup"]["completed"] else "FAILED"), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mode", choices=("dry-run", "gate", "sync", "live"), default="dry-run")
    parser.add_argument("--scenes", nargs="+", choices=SCENES,
                        help="Live scenes to run once each; default: v1 bodyweight dumbbells gym")
    parser.add_argument("--skip-sync", action="store_true",
                        help="Live diagnostic only: omit repeated sync checks; recorded in the receipt")
    parser.add_argument("--project-ref")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if (args.scenes is not None or args.skip_sync) and args.mode != "live":
        parser.error("--scenes and --skip-sync require --mode live")
    if args.scenes is not None and len(args.scenes) != len(set(args.scenes)):
        parser.error("--scenes cannot contain duplicates")
    if args.mode == "dry-run":
        c = {"deviceID": uid(), "revision": 1, "healthRead": False, "cloudSync": True,
             "aiProcessing": True, "policyVersion": "2026-09-23"}
        for scene in ("v1", "bodyweight"):
            request = make_request(c, scene)
            value = fixture_plan(request)
            validate_plan(request, value)
            value["sessions"][0]["exercises"][1]["prescription"] = "invented dosage"
            try:
                validate_plan(request, value)
            except RuntimeError:
                pass
            else:
                raise AssertionError("offline validator failed to reject altered dosage")
        print("Dry run passed: v1/v2 canonical fixtures accepted, altered dosage rejected; no credentials loaded or network calls made.")
        return 0
    if not args.project_ref or not re.fullmatch(r"[a-z0-9]{20}", args.project_ref) or not args.output:
        parser.error("Non-dry modes require --project-ref (20 lowercase letters/digits) and --output")
    values = private_values()
    if values["url"].rstrip("/") != f"https://{args.project_ref}.supabase.co":
        raise RuntimeError("Explicit project ref does not match credential URL")
    if not values["publishable"].startswith("sb_publishable_"):
        raise RuntimeError("Expected a public sb_publishable_ client key")
    if values["admin"].count(".") == 2:
        encoded = values["admin"].split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if claims.get("role") != "service_role" or claims.get("ref") not in (None, args.project_ref):
            raise RuntimeError("Admin key role/project does not match")
    elif not values["admin"].startswith("sb_secret_"):
        raise RuntimeError("Expected server-only admin key")
    acceptance = Acceptance(args, values)
    code = 1
    try:
        acceptance.create_user()
        if args.mode == "gate":
            acceptance.gate()
        else:
            if not args.skip_sync:
                acceptance.sync()
            if args.mode == "live":
                acceptance.live()
        acceptance.report["status"] = "passed"
        code = 0
    except Exception as error:
        acceptance.report["status"] = "failed"
        # Only deliberately bounded labels or exception type enter the receipt.
        acceptance.report["error"] = str(error) if isinstance(error, (AssertionError, RuntimeError)) else type(error).__name__
        print("Acceptance failed: " + acceptance.report["error"], file=sys.stderr)
    finally:
        acceptance.cleanup()
        if not acceptance.report["cleanup"]["completed"]:
            acceptance.report["status"], code = "failed", 1
        acceptance.report["catalogHashes"] = {str(v): hashlib.sha256((CATALOG_ROOT / f"exercise-catalog.v{v}.json").read_bytes()).hexdigest() for v in (1, 2)}
        acceptance.report["finishedAt"] = dt.datetime.now(dt.timezone.utc).isoformat()
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(acceptance.report, ensure_ascii=False, indent=2) + "\n")
    return code


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        # Configuration errors must never dump credentials or arbitrary response bodies.
        print(str(error) if isinstance(error, RuntimeError) else type(error).__name__, file=sys.stderr)
        sys.exit(1)
