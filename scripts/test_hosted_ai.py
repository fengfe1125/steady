#!/usr/bin/env python3
"""One real DeepSeek streaming check with a disposable hosted Steady account."""
import json
import secrets
import sys
import time
import urllib.error
import urllib.request
import uuid

from configure_client import read_env
from deploy_backend import api, validate_project

values = read_env()
ref = validate_project(values, values["SUPABASE_ACCESS_TOKEN"])
keys = api(values["SUPABASE_ACCESS_TOKEN"], f"projects/{ref}/api-keys?reveal=true")
admin = next(x["api_key"] for x in keys
             if x.get("name") == "service_role" or x.get("type") == "service_role")
url = values["SUPABASE_URL"].rstrip("/")
publishable = values["SUPABASE_PUBLISHABLE_KEY"]
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def request(path, body=None, token=None, method="POST", timeout=45):
    key = admin if token == admin else publishable
    req = urllib.request.Request(
        url + path, data=None if body is None else json.dumps(body).encode(), method=method,
        headers={"apikey": key, "Authorization": "Bearer " + (token or publishable),
                 "Content-Type": "application/json"},
    )
    try:
        with opener.open(req, timeout=timeout) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def main():
    uid = None
    try:
        email = "steady-ai-" + uuid.uuid4().hex + "@example.test"
        password = secrets.token_urlsafe(36)
        status, data = request("/auth/v1/admin/users", {"email": email,
                               "password": password, "email_confirm": True}, admin)
        if status not in (200, 201):
            raise RuntimeError(f"Synthetic Auth create failed: HTTP {status}")
        uid = json.loads(data)["id"]
        status, data = request("/auth/v1/token?grant_type=password",
                               {"email": email, "password": password})
        if status != 200:
            raise RuntimeError(f"Synthetic Auth sign-in failed: HTTP {status}")
        token = json.loads(data)["access_token"]
        consent = {"deviceID": str(uuid.uuid4()), "revision": 1,
                   "healthRead": False, "cloudSync": False, "aiProcessing": True,
                   "policyVersion": "2026-09-23"}
        payload = {"requestID": str(uuid.uuid4()), "schemaVersion": 1,
                   "consent": consent, "question": "请用一句简短的中文说明坚持写健康日记有什么用。",
                   "history": [], "messages": [], "today": int(time.time() * 1000),
                   "timeZoneID": "Asia/Shanghai"}
        status, _ = request("/functions/v1/chat", payload, token)
        if status != 409:
            raise RuntimeError(f"AI without consent was not blocked: HTTP {status}")
        status, _ = request("/functions/v1/consents", consent, token)
        if status != 200:
            raise RuntimeError(f"AI consent failed: HTTP {status}")
        payload["requestID"] = str(uuid.uuid4())
        status, data = request("/functions/v1/chat", payload, token, timeout=110)
        lines = data.decode(errors="replace").splitlines()
        complete = any(line == "event: complete" for line in lines)
        stream_error = any(line == "event: error" for line in lines)
        deltas = []
        for line in lines:
            if line.startswith("data: "):
                try:
                    item = json.loads(line[6:])
                except json.JSONDecodeError:
                    continue
                if isinstance(item, dict) and isinstance(item.get("text"), str):
                    deltas.append(item["text"])
        answer = "".join(deltas)
        print(f"AI consent gate passed; DeepSeek HTTP {status}, complete={complete}, "
              f"stream_error={stream_error}, answer_chars={len(answer)}")
        if status != 200 or stream_error or not complete or not answer:
            raise RuntimeError("Real DeepSeek response failed")
        print("Real answer sample: " + answer[:100])
    finally:
        if uid:
            try:
                status, _ = request("/auth/v1/admin/users/" + uid, token=admin,
                                    method="DELETE")
                print(f"Synthetic AI account cleanup: HTTP {status}")
            except Exception as error:
                print(f"Synthetic AI account cleanup failed: {type(error).__name__}",
                      file=sys.stderr)


if __name__ == "__main__":
    main()
