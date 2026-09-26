#!/usr/bin/env python3
"""Destructive synthetic acceptance against the dedicated steady-internal project.

Creates two example.test accounts; deletes them in finally. Never uses real users.
"""
import json
import secrets
import urllib.error
import urllib.request
import uuid

from configure_client import read_env
from deploy_backend import api, validate_project

values = read_env()
for name in ("SUPABASE_ACCESS_TOKEN", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"):
    if not values.get(name):
        raise SystemExit(f"Missing {name} in ignored .env.local")
ref = validate_project(values, values["SUPABASE_ACCESS_TOKEN"])
url = values["SUPABASE_URL"].rstrip("/")
publishable = values["SUPABASE_PUBLISHABLE_KEY"]
if url != f"https://{ref}.supabase.co" or not publishable.startswith("sb_publishable_"):
    raise SystemExit("Hosted URL/key do not match the dedicated Steady project.")
keys = api(values["SUPABASE_ACCESS_TOKEN"], f"projects/{ref}/api-keys?reveal=true")
admin = next((item.get("api_key") for item in keys
              if item.get("name") == "service_role" or item.get("type") == "service_role"), None)
if not admin:
    raise SystemExit("No server-only legacy service_role key for synthetic cleanup.")
created = []
passed = 0
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def request(path, body=None, token=None, method="POST"):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url + path, data=data, method=method,
                                 headers={"apikey": admin if token == admin else publishable,
                                          "Authorization": "Bearer " + (token or publishable),
                                          "Content-Type": "application/json"})
    try:
        with opener.open(req, timeout=45) as response:
            payload = response.read()
            return response.status, json.loads(payload) if payload else None
    except urllib.error.HTTPError as error:
        payload = error.read()
        try:
            return error.code, json.loads(payload)
        except ValueError:
            return error.code, {}


def check(condition, label):
    global passed
    if not condition:
        raise AssertionError(label)
    passed += 1
    print("PASS " + label)


def user():
    email = "steady-hosted-" + uuid.uuid4().hex + "@example.test"
    password = secrets.token_urlsafe(36)
    status, result = request("/auth/v1/admin/users", {"email": email,
                              "password": password, "email_confirm": True}, admin)
    if status not in (200, 201):
        raise AssertionError(f"Synthetic Auth create failed: HTTP {status}")
    created.append((result["id"], email))
    status, result = request("/auth/v1/token?grant_type=password",
                             {"email": email, "password": password}, publishable)
    if status != 200:
        raise AssertionError(f"Synthetic Auth login failed: HTTP {status}")
    return result["access_token"]


def consent(revision=1, cloud=True):
    return {"deviceID": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            "revision": revision, "healthRead": False, "cloudSync": cloud,
            "aiProcessing": False, "policyVersion": "2026-09-23"}


def call(route, body, token):
    return request("/functions/v1/" + route, body, token)


try:
    a, b = user(), user()
    c = consent()
    check(call("consents", c, a)[0] == 200, "first consent")
    check(call("consents", c, b)[0] == 200, "second consent")
    note = {"id": str(uuid.uuid4()), "kind": "notes", "logicalID": "2026-09-24",
            "payload": json.dumps({"dayKey": "2026-09-24", "text": "synthetic hosted acceptance"}),
            "version": 0, "deleted": False}
    mutation = {"id": str(uuid.uuid4()), "record": note, "attempt": 0, "retryAt": 0}
    status, result = call("sync-push", {"mutation": mutation, "consent": c}, a)
    check(status == 200 and result["record"]["version"] == 1, "hosted write")
    status, result = call("sync-push", {"mutation": mutation, "consent": c}, a)
    check(status == 200 and result["record"]["version"] == 1, "retry de-duplication")
    status, result = call("sync-pull", {"cursor": 0, "consent": c}, b)
    check(status == 200 and result["records"] == [], "account isolation")
    status, result = call("sync-pull", {"cursor": 0, "consent": c}, a)
    check(status == 200 and len(result["records"]) == 1, "own record pull")
    stale = {"id": str(uuid.uuid4()), "record": {**note, "payload": json.dumps(
        {"dayKey": "2026-09-24", "text": "stale edit"})}, "attempt": 0, "retryAt": 0}
    status, conflict = call("sync-push", {"mutation": stale, "consent": c}, a)
    check(status == 200 and conflict.get("conflict") is True and
          conflict["record"]["version"] == 1, "stale edit conflict")
    tombstone = {"id": str(uuid.uuid4()), "record": {**note, "version": 1,
                 "payload": "{}", "deleted": True}, "attempt": 0, "retryAt": 0}
    status, result = call("sync-push", {"mutation": tombstone, "consent": c}, a)
    check(status == 200 and result["record"]["deleted"] is True and
          result["record"]["version"] == 2, "hosted delete marker")
    status, result = call("sync-pull", {"cursor": 0, "consent": c}, a)
    check(status == 200 and any(r["id"] == note["id"] and r["deleted"]
                                for r in result["records"]), "delete propagation")
    off = consent(2, False)
    check(call("consents", off, a)[0] == 200, "cloud consent withdrawn")
    check(call("sync-pull", {"cursor": 0, "consent": c}, a)[0] == 409,
          "withdrawal blocks stale sync")
    check(call("consents", c, a)[0] == 409, "old revision cannot regrant")
    check(call("sync-pull", {"cursor": 0, "consent": c}, publishable)[0] in (401, 403),
          "anonymous request denied")
    check(call("account-delete", {"emailCode": "000000"}, a)[0] == 401,
          "wrong delete code denied")
    status, link = request("/auth/v1/admin/generate_link",
                           {"type": "magiclink", "email": created[0][1]}, admin)
    if status != 200 or not link.get("email_otp"):
        raise AssertionError("Synthetic deletion OTP generation failed")
    check(call("account-delete", {"emailCode": link["email_otp"]}, a)[0] == 200,
          "verified account deletion")
    uid, _ = created.pop(0)
    status, records = request("/rest/v1/records?user_id=eq." + uid, token=admin,
                              method="GET")
    check(status == 200 and records == [], "deletion cascades records")
    print(f"{passed} hosted synthetic checks passed; no real account was used.")
finally:
    for uid, _ in created:
        status, _ = request("/auth/v1/admin/users/" + uid, token=admin,
                            method="DELETE")
        if status not in (200, 204):
            print("Synthetic account cleanup failed; inspect hosted Auth users.")
