#!/usr/bin/env python3
"""Make an encrypted Steady database export; keep four hosted weekly copies.

Plaintext exists only inside a private temporary directory and is removed when
this process exits. Keep .env.local (especially the backup passphrase) separately.
"""
import argparse
from datetime import datetime, timezone
import os
from pathlib import Path
import secrets
import subprocess
import time
import tarfile
import tempfile

from configure_client import ROOT, read_env
from deploy_backend import save_env


def command(argv, *, env=None, output=None, timeout=360, attempts=1):
    for attempt in range(attempts):
        with (open(output, "wb") if output else open(os.devnull, "wb")) as sink:
            try:
                result = subprocess.run(argv, cwd=ROOT, env=env, stdout=sink,
                                        stderr=subprocess.PIPE, timeout=timeout)
            except subprocess.TimeoutExpired:
                raise SystemExit("Backup command timed out; incomplete export discarded.") from None
        if result.returncode == 0:
            return
        if output:
            Path(output).unlink(missing_ok=True)
        if attempt + 1 < attempts:
            print(f"Database export connection failed; retrying ({attempt + 2}/{attempts}).")
            time.sleep(3)
    raise SystemExit(f"Backup command failed: {argv[0]} {argv[1]}; output suppressed to protect credentials.")


def encrypt(source, destination, passphrase):
    result = subprocess.run(
        ["gpg", "--batch", "--yes", "--pinentry-mode", "loopback",
         "--symmetric", "--cipher-algo", "AES256", "--passphrase-fd", "0",
         "--output", str(destination), str(source)],
        input=(passphrase + "\n").encode(), stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        destination.unlink(missing_ok=True)
        raise SystemExit("GPG encryption failed; output suppressed.")
    result = subprocess.run(
        ["gpg", "--batch", "--yes", "--pinentry-mode", "loopback",
         "--passphrase-fd", "0", "--decrypt", "--output", "-",
         str(destination)],
        input=(passphrase + "\n").encode(), stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        destination.unlink(missing_ok=True)
        raise SystemExit("Encrypted backup could not be decrypted; output removed.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", choices=("local", "hosted"))
    args = parser.parse_args()
    values = read_env()
    passphrase = values.get("STEADY_BACKUP_PASSPHRASE")
    if not passphrase:
        passphrase = secrets.token_urlsafe(48)
        save_env({"STEADY_BACKUP_PASSPHRASE": passphrase})
        print("Created recovery passphrase in ignored .env.local; keep a separate secure copy.")
    backup_dir = Path(values.get("STEADY_BACKUP_DIR") or Path.home() / "Documents" / "SteadyBackups")
    backup_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    backup_dir.chmod(0o700)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destination = backup_dir / f"steady-{args.source}-{stamp}.tar.gpg"
    with tempfile.TemporaryDirectory(prefix="steady-backup-") as directory:
        temp = Path(directory)
        os.chmod(temp, 0o700)
        if args.source == "local":
            command(["docker", "exec", "supabase_db_steady", "pg_dump", "-U", "postgres",
                     "-Fc", "--no-owner", "--no-acl", "postgres"], output=temp / "database.dump")
            entries = ["database.dump"]
        else:
            for name in ("SUPABASE_PROJECT_REF", "SUPABASE_DB_PASSWORD",
                         "SUPABASE_POOLER_HOST", "SUPABASE_POOLER_PORT",
                         "SUPABASE_POOLER_USER"):
                if not values.get(name):
                    raise SystemExit(f"Missing {name} in ignored .env.local.")
            ref = values["SUPABASE_PROJECT_REF"]
            if (values["SUPABASE_POOLER_USER"] != "postgres." + ref
                    or values["SUPABASE_POOLER_HOST"] != "aws-0-ap-southeast-1.pooler.supabase.com"
                    or values["SUPABASE_POOLER_PORT"] != "5432"):
                raise SystemExit("Backup target must match the configured Singapore Supabase session pooler.")
            # Direct connections require IPv6 on this Mac. The session pooler
            # provides a durable IPv4 connection suitable for pg_dump.
            credential_file = temp / "pg.env"
            credential_file.write_text(
                "PGPASSWORD=" + values["SUPABASE_DB_PASSWORD"] + "\nPGSSLMODE=require\n"
                "PGOPTIONS=-c statement_timeout=90000 -c lock_timeout=5000\nPGCONNECT_TIMEOUT=15\n"
            )
            credential_file.chmod(0o600)
            entries = ["database.dump"]
            command([
                "docker", "run", "--rm", "--env-file", str(credential_file),
                "-v", str(temp) + ":/out", "--entrypoint", "pg_dump",
                "public.ecr.aws/supabase/postgres:17.6.1.167",
                "-Fc", "--no-owner", "--no-acl", "-h", values["SUPABASE_POOLER_HOST"],
                "-p", values["SUPABASE_POOLER_PORT"], "-U", values["SUPABASE_POOLER_USER"],
                "-d", "postgres", "-f", "/out/database.dump",
            ], attempts=3)
            if not (temp / "database.dump").is_file() or (temp / "database.dump").stat().st_size < 1024:
                raise SystemExit("Hosted pg_dump was empty or incomplete.")
            (temp / "project-ref.txt").write_text(ref + "\n")
            entries.append("project-ref.txt")
        archive = temp / "export.tar"
        with tarfile.open(archive, "w") as tar:
            for name in entries:
                tar.add(temp / name, arcname=name)
        encrypt(archive, destination, passphrase)
    destination.chmod(0o600)
    if args.source == "hosted":
        copies = sorted(backup_dir.glob("steady-hosted-*.tar.gpg"), reverse=True)
        for old in copies[4:]:
            old.unlink()
    print(f"Encrypted {args.source} backup verified: {destination}")


if __name__ == "__main__":
    main()
