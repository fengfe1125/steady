#!/usr/bin/env python3
"""Deploy the dedicated hosted Steady backend in explicit, repeatable phases.

Read credentials from the ignored .env.local; never print secret values.
Project creation and cost confirmation use the Supabase connector or dashboard.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import secrets
import subprocess
import urllib.error
import urllib.request
from urllib.parse import quote

from configure_client import ROOT, read_env

PROJECT_NAME = "steady-internal"
REGION = "ap-southeast-1"
CLI = ["npx", "--yes", "supabase@2.117.0"]
FUNCTIONS = (
    "consents", "sync-push", "sync-pull", "report", "chat",
    "plan-draft", "account-delete", "cloud-clear",
)


def require(values, *names):
    missing = [name for name in names if not values.get(name)]
    if missing:
        raise SystemExit("Fill these fields in .env.local: " + ", ".join(missing))


def save_env(values):
    """Update only the provided keys and keep the private file owner-readable."""
    target = ROOT / ".env.local"
    lines = target.read_text().splitlines() if target.exists() else []
    done = set()
    updated = []
    for line in lines:
        key = line.partition("=")[0].strip()
        if not line.lstrip().startswith("#") and key in values:
            line = f"{key}={values[key]}"
            done.add(key)
        updated.append(line)
    updated.extend(f"{key}={value}" for key, value in values.items() if key not in done)
    target.write_text("\n".join(updated) + "\n")
    target.chmod(0o600)


def api(token, path, body=None, method=None):
    request = urllib.request.Request(
        "https://api.supabase.com/v1/" + path,
        data=None if body is None else json.dumps(body).encode(),
        method=method or ("GET" if body is None else "POST"),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = response.read()
            return json.loads(payload) if payload else None
    except urllib.error.HTTPError as error:
        raise SystemExit(
            f"Supabase management request failed (HTTP {error.code}) at {method or 'request'} {path}; "
            "response body suppressed to protect secrets."
        ) from None


def validate_project(values, token):
    require(values, "SUPABASE_PROJECT_REF", "SUPABASE_ORG_ID")
    ref = values["SUPABASE_PROJECT_REF"]
    if not ref.isalnum():
        raise SystemExit("Invalid SUPABASE_PROJECT_REF.")
    project = api(token, "projects/" + ref)
    if (project.get("name") != PROJECT_NAME
            or project.get("organization_id") != values["SUPABASE_ORG_ID"]
            or project.get("region") != REGION):
        raise SystemExit("Project name, organization, or region differs from Steady staging target.")
    if project.get("status") != "ACTIVE_HEALTHY":
        raise SystemExit("Steady project is not ACTIVE_HEALTHY.")
    return ref


def run_cli(values, arguments):
    env = os.environ.copy()
    env["SUPABASE_ACCESS_TOKEN"] = values["SUPABASE_ACCESS_TOKEN"]
    if values.get("SUPABASE_DB_PASSWORD"):
        env["SUPABASE_DB_PASSWORD"] = values["SUPABASE_DB_PASSWORD"]
        env["PGPASSWORD"] = values["SUPABASE_DB_PASSWORD"]
    result = subprocess.run(
        CLI + arguments, cwd=ROOT, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if result.returncode:
        raise SystemExit(
            "CLI step failed: " + " ".join(arguments[:2]) +
            ". Output suppressed to protect credentials; inspect this step separately."
        )


def db_password_phase(token, ref):
    # The connector creates projects without disclosing the generated password.
    password = secrets.token_urlsafe(36)
    api(token, "projects/" + ref + "/database/password", {"password": password}, method="PATCH")
    save_env({"SUPABASE_DB_PASSWORD": password})
    print("Hosted database password rotated and saved in ignored local configuration.")


def database(values, ref):
    require(values, "SUPABASE_DB_PASSWORD", "SUPABASE_POOLER_HOST",
            "SUPABASE_POOLER_PORT", "SUPABASE_POOLER_USER")
    # Direct IPv6 database connections are unavailable on this Mac. A session
    # pooler URL with PGPASSWORD avoids placing the password in process argv.
    if (values["SUPABASE_POOLER_USER"] != "postgres." + ref
            or values["SUPABASE_POOLER_HOST"] != "aws-0-ap-southeast-1.pooler.supabase.com"
            or values["SUPABASE_POOLER_PORT"] != "5432"):
        raise SystemExit("Pooler target does not match the dedicated Singapore Steady project.")
    url = ("postgresql://" + quote(values["SUPABASE_POOLER_USER"], safe="")
           + "@" + values["SUPABASE_POOLER_HOST"] + ":5432/postgres?sslmode=require")
    run_cli(values, ["db", "push", "--db-url", url, "--yes"])
    print("Hosted database migrations are applied.")


def secrets_phase(values, token, ref):
    require(values, "DEEPSEEK_API_KEY")
    encryption_key = values.get("DELETION_ENCRYPTION_KEY")
    if not encryption_key:
        encryption_key = base64.b64encode(secrets.token_bytes(32)).decode()
        save_env({"DELETION_ENCRYPTION_KEY": encryption_key})
    names = ("DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "DELETION_ENCRYPTION_KEY")
    payload = [{"name": name, "value": values[name] if name != "DELETION_ENCRYPTION_KEY" else encryption_key}
               for name in names if values.get(name) or name == "DELETION_ENCRYPTION_KEY"]
    # Apple sign-in is not enabled for this internal build.
    api(token, "projects/" + ref + "/secrets", payload)
    print("Server-only function secrets configured.")


def auth_phase(values, token, ref):
    require(values, "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_ADMIN_EMAIL")
    try:
        port = int(values["SMTP_PORT"])
    except ValueError:
        raise SystemExit("SMTP_PORT must be a number.") from None
    if not 1 <= port <= 65535 or "@" not in values["SMTP_ADMIN_EMAIL"]:
        raise SystemExit("Invalid SMTP port or sender email.")
    path = "projects/" + ref + "/config/auth"
    # Close public signups first, even if later SMTP configuration fails.
    api(token, path, {
        "disable_signup": True,
        "external_apple_enabled": False,
        "mailer_otp_exp": 600,
    }, method="PATCH")
    current = api(token, path)
    if not current.get("smtp_host"):
        api(token, path, {
            "smtp_host": values["SMTP_HOST"],
            "smtp_port": port,
            "smtp_user": values["SMTP_USER"],
            "smtp_pass": values["SMTP_PASS"],
            "smtp_admin_email": values["SMTP_ADMIN_EMAIL"],
            "smtp_sender_name": values.get("SMTP_SENDER_NAME") or "Steady",
        }, method="PATCH")
    elif any(str(current.get(field)) != str(expected) for field, expected in (
        ("smtp_host", values["SMTP_HOST"]), ("smtp_port", port),
        ("smtp_user", values["SMTP_USER"]),
        ("smtp_admin_email", values["SMTP_ADMIN_EMAIL"]),
        ("smtp_sender_name", values.get("SMTP_SENDER_NAME") or "Steady"),
    )):
        raise SystemExit("Existing SMTP settings differ from the Steady configuration.")
    # New free projects may edit templates only after custom SMTP is configured.
    if "{{ .Token }}" not in current.get("mailer_templates_magic_link_content", ""):
        api(token, path, {
            "mailer_templates_magic_link_content": "<p>Steady 验证码：{{ .Token }}。10 分钟内有效。</p>",
        }, method="PATCH")
    current = api(token, path)
    if not current.get("disable_signup") or "{{ .Token }}" not in current.get("mailer_templates_magic_link_content", ""):
        raise SystemExit("Hosted Auth settings did not retain the internal-only OTP configuration.")
    print("Internal-only email OTP configured; verify real SMTP delivery before client cutover.")


def functions_phase(values, ref):
    for name in FUNCTIONS:
        run_cli(values, ["functions", "deploy", name, "--project-ref", ref])
    print("All eight Edge Functions deployed.")


def members_phase(values, token, ref):
    """Provision only current Supabase organization members for internal OTP."""
    members = api(token, "organizations/" + values["SUPABASE_ORG_ID"] + "/members")
    emails = sorted({item["email"].strip().lower() for item in members if item.get("email")})
    if not emails:
        raise SystemExit("No organization member emails found; no account was created.")
    keys = api(token, "projects/" + ref + "/api-keys?reveal=true")
    service_key = next((item.get("api_key") for item in keys
                        if item.get("name") == "service_role"
                        or item.get("type") == "service_role"), None)
    if not service_key:
        raise SystemExit("No legacy service_role key available for Auth admin provisioning.")
    endpoint = values["SUPABASE_URL"].rstrip("/") + "/auth/v1/admin/users"
    headers = {"Authorization": "Bearer " + service_key,
               "apikey": service_key, "Content-Type": "application/json"}
    request = urllib.request.Request(endpoint + "?per_page=1000", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            existing = {item.get("email", "").lower() for item in json.load(response).get("users", [])}
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Auth user listing failed (HTTP {error.code}); body suppressed.") from None
    created = 0
    for email in emails:
        if email in existing:
            continue
        body = json.dumps({"email": email, "password": secrets.token_urlsafe(36),
                           "email_confirm": True}).encode()
        request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=30):
                created += 1
        except urllib.error.HTTPError as error:
            raise SystemExit(f"Auth provisioning stopped (HTTP {error.code}); body suppressed.") from None
    print(f"Internal Auth accounts ready: {len(emails)} organization members, {created} created.")


def status_phase(token, ref):
    project = api(token, "projects/" + ref)
    auth = api(token, "projects/" + ref + "/config/auth")
    # A project-scoped deployment token may omit Edge Functions read access.
    try:
        functions = api(token, "projects/" + ref + "/functions")
        items = functions.get("functions", []) if isinstance(functions, dict) else functions
        active = sorted(item["slug"] for item in items if item.get("status") == "ACTIVE")
    except SystemExit:
        active = "not permitted by this token; use Supabase connector"
    print(json.dumps({
        "project": project.get("name"),
        "region": project.get("region"),
        "status": project.get("status"),
        "active_functions": active,
        "signup_disabled": auth.get("disable_signup"),
        "smtp_configured": bool(auth.get("smtp_host")),
        "otp_template_configured": "{{ .Token }}" in auth.get("mailer_templates_magic_link_content", ""),
    }, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("status", "db-password", "database", "secrets", "auth", "members", "functions"))
    args = parser.parse_args()
    values = read_env()
    require(values, "SUPABASE_ACCESS_TOKEN")
    token = values["SUPABASE_ACCESS_TOKEN"]
    ref = validate_project(values, token)
    if args.phase == "status":
        status_phase(token, ref)
    elif args.phase == "db-password":
        db_password_phase(token, ref)
    elif args.phase == "database":
        database(values, ref)
    elif args.phase == "secrets":
        secrets_phase(values, token, ref)
    elif args.phase == "auth":
        auth_phase(values, token, ref)
    elif args.phase == "members":
        members_phase(values, token, ref)
    elif args.phase == "functions":
        functions_phase(values, ref)


if __name__ == "__main__":
    main()
