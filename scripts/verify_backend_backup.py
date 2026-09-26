#!/usr/bin/env python3
"""Restore an encrypted Steady export into a disposable, networkless PG17 container."""
import argparse
from pathlib import Path
import secrets
import subprocess
import tarfile
import tempfile
import time

from configure_client import read_env

IMAGE = "public.ecr.aws/supabase/postgres:17.6.1.167"


def run(args, *, data=None, timeout=120):
    result = subprocess.run(args, input=data, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=timeout)
    if result.returncode:
        detail = result.stderr.decode(errors="replace").splitlines()
        raise RuntimeError(f"{args[0]} step failed: {(detail[0] if detail else 'no details')[:240]}")
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", choices=("local", "hosted"))
    parser.add_argument("--file", type=Path, help="encrypted export; defaults to newest for source")
    args = parser.parse_args()
    values = read_env()
    phrase = values.get("STEADY_BACKUP_PASSPHRASE")
    if not phrase:
        raise SystemExit("Missing recovery passphrase in ignored .env.local")
    backup_dir = Path(values.get("STEADY_BACKUP_DIR") or Path.home() / "Documents" / "SteadyBackups")
    matches = sorted(backup_dir.glob(f"steady-{args.source}-*.tar.gpg"))
    source = args.file or (matches[-1] if matches else None)
    if not source or not source.is_file():
        raise SystemExit("No matching encrypted backup found")
    container = "steady-restore-check-" + secrets.token_hex(5)
    started = False
    try:
        with tempfile.TemporaryDirectory(prefix="steady-restore-") as directory:
            archive = Path(directory) / "export.tar"
            run(["gpg", "--batch", "--yes", "--pinentry-mode", "loopback",
                 "--passphrase-fd", "0", "--decrypt", "--output", str(archive),
                 str(source)], data=(phrase + "\n").encode())
            with tarfile.open(archive) as tar:
                names = set(tar.getnames())
                expected = {"database.dump"} if args.source == "local" else {"database.dump", "project-ref.txt"}
                if not expected.issubset(names):
                    raise RuntimeError("Backup archive lacks required export files")
                payload = {name: tar.extractfile(name).read() for name in expected}
            run(["docker", "run", "--rm", "-d", "--network", "none", "--name", container,
                 "-e", "POSTGRES_PASSWORD=restore-only", IMAGE])
            started = True
            for _ in range(30):
                ready = subprocess.run(["docker", "exec", container, "pg_isready", "-U", "postgres"],
                                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if ready.returncode == 0:
                    break
                time.sleep(1)
            else:
                raise RuntimeError("Isolated database did not become ready")
            # The Supabase image restarts Postgres once after initial readiness.
            time.sleep(4)
            run(["docker", "exec", container, "createdb", "-U", "supabase_admin",
                 "-T", "template0", "steady_restore"])
            run(["docker", "exec", "-i", container, "pg_restore", "--exit-on-error",
                 "--no-owner", "--no-acl", "-U", "supabase_admin", "-d", "steady_restore"],
                data=payload["database.dump"], timeout=240)
            counts = run(["docker", "exec", "-i", container, "psql", "-X", "-At",
                          "-U", "supabase_admin", "-d", "steady_restore"], data=b"""
select 'auth_users',count(*) from auth.users;
select 'records',count(*) from public.records;
select 'consent_events',count(*) from public.consent_events;
select 'sync_functions',count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('sync_push','sync_pull','set_consents');
""")
            print("Isolated restore passed:")
            print(counts.decode().strip())
    finally:
        if started:
            subprocess.run(["docker", "stop", container], stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=30)


if __name__ == "__main__":
    main()
