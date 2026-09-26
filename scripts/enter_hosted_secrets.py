#!/usr/bin/env python3
"""Prompt locally for Steady hosted credentials without echoing secret values."""
import getpass
import sys

from configure_client import read_env
from deploy_backend import save_env

FIELDS = (
    ("SUPABASE_ACCESS_TOKEN", "Supabase management access token", True),
    ("DEEPSEEK_API_KEY", "DeepSeek official API key", True),
    ("SMTP_HOST", "SMTP host", False),
    ("SMTP_PORT", "SMTP port (usually 587)", False),
    ("SMTP_USER", "SMTP username", False),
    ("SMTP_PASS", "SMTP password", True),
    ("SMTP_ADMIN_EMAIL", "Verified sender email", False),
    ("SMTP_SENDER_NAME", "Sender name (Steady)", False),
)


def main():
    if not sys.stdin.isatty():
        raise SystemExit("Run this script in an interactive terminal; never pass secrets as arguments.")
    values = read_env()
    updates = {}
    for name, label, secret in FIELDS:
        if values.get(name):
            continue
        reader = getpass.getpass if secret else input
        value = reader(label + ": ")
        if not value and name == "SMTP_PORT":
            value = "587"
        if not value and name == "SMTP_SENDER_NAME":
            value = "Steady"
        if not value:
            continue
        if value != value.strip() or "\n" in value or "\r" in value:
            raise SystemExit(f"{name} contains leading/trailing whitespace or a newline.")
        updates[name] = value
    if updates:
        save_env(updates)
    missing = [name for name, _, _ in FIELDS[:-1] if not (values.get(name) or updates.get(name))]
    print("Saved fields:", ", ".join(sorted(updates)) if updates else "none")
    if missing:
        print("Still missing:", ", ".join(missing))
    else:
        print("Hosted credentials are present. Values were not displayed.")


if __name__ == "__main__":
    main()
