"""Private portfolio backup and verification using PostgreSQL CLI tools and Python's standard library.

Credentials come from PG* / Supabase environment variables, never command arguments or output.
Stop the application while backing up so database rows and immutable media form one recovery point.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from urllib.request import Request, build_opener, HTTPRedirectHandler

TABLES = ("admin_account", "recovery_code", "password_reset", "project", "project_revision", "project_media", "admin_audit", "flyway_schema_history")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def pg(tool, *args):
    executable = Path(os.environ["PG_BIN"]) / (tool + (".exe" if os.name == "nt" else "")) if "PG_BIN" in os.environ else tool
    result = subprocess.run([str(executable), *args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"{tool} failed. Check database access, CLI version and the target database; no credentials have been printed.")
    return result.stdout


def sql(statement):
    return pg("psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", statement).strip()


def valid_key(key):
    if not re.fullmatch(r"[a-f0-9-]{36}\.jpg", key):
        raise ValueError("Unexpected media key; backup stopped.")
    return key


def remote(path):
    url = os.environ["SUPABASE_URL"]
    if not re.fullmatch(r"https://[a-z0-9-]+\.supabase\.co", url):
        raise ValueError("Use the project's HTTPS Supabase URL.")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    request = Request(url + "/storage/v1/" + path, headers={"Authorization": "Bearer " + key, "apikey": key})
    with build_opener(NoRedirect()).open(request, timeout=30) as response:
        data = response.read(5_000_001)
        if len(data) > 5_000_000:
            raise ValueError("Remote object exceeded the application media limit.")
        return data


def verify(directory):
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    for item in manifest["files"]:
        relative = Path(item["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError("Unsafe path in backup manifest.")
        path = directory / relative
        if path.is_symlink() or not path.is_file():
            raise ValueError("A backup file is missing or is a symbolic link.")
        if path.stat().st_size != item["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
            raise ValueError("Backup verification failed: a file has changed.")
    print(f"PORTFOLIO_BACKUP_VERIFIED: {len(manifest['files'])} files")
    return manifest


def backup(args):
    if not args.writes_paused:
        raise ValueError("Stop the application, then pass --writes-paused to confirm a consistent recovery point.")
    destination = args.directory.resolve()
    destination.mkdir(parents=True, exist_ok=False)
    (destination / "media").mkdir()
    manifest = {"format": 1, "database": os.environ.get("PGDATABASE", ""), "files": [], "tables": list(TABLES), "encryptionKeyIncluded": False}
    dump_args = ["--format=custom", "--file", str(destination / "database.dump")]
    for table in TABLES:
        dump_args.extend(["--table", "public." + table])
    pg("pg_dump", *dump_args)
    rows = json.loads(sql("SELECT COALESCE(json_agg(m), '[]'::json) FROM (SELECT storage_key, bytes FROM project_media ORDER BY storage_key) m"))
    if args.media_provider == "supabase":
        bucket = os.environ.get("SUPABASE_MEDIA_BUCKET", "project-media")
        if not re.fullmatch(r"[a-z0-9-]+", bucket):
            raise ValueError("Invalid bucket name.")
        if json.loads(remote("bucket/" + bucket)).get("public") is not False:
            raise ValueError("The media bucket must be private.")
    for row in rows:
        key = valid_key(row["storage_key"])
        data = (args.media_directory / key).read_bytes() if args.media_provider == "local" else remote("object/authenticated/" + bucket + "/" + key)
        if len(data) != row["bytes"]:
            raise ValueError("Media size differs from database metadata; backup is incomplete.")
        (destination / "media" / key).write_bytes(data)
    for path in [destination / "database.dump", *sorted((destination / "media").iterdir())]:
        manifest["files"].append({"path": path.relative_to(destination).as_posix(), "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    if args.media_provider == "local":
        referenced = {row["storage_key"] for row in rows}
        manifest["unreferencedLocalObjects"] = [p.name for p in args.media_directory.glob("*.jpg") if p.name not in referenced]
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    verify(destination)


def restore_local(args):
    verify(args.directory)
    if os.environ.get("PGHOST") != "127.0.0.1" or os.environ.get("PGPORT") != "55432" or not re.fullmatch(r"crystal_restore_[a-z0-9_]+", os.environ.get("PGDATABASE", "")):
        raise ValueError("Automated restore is restricted to an empty crystal_restore_* database on 127.0.0.1:55432.")
    if sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'") != "0":
        raise ValueError("Restore target must be empty. Existing data will not be overwritten.")
    if args.media_directory.exists():
        raise ValueError("Restore media directory must not exist.")
    pg("pg_restore", "--exit-on-error", "--no-owner", "--no-acl", "--dbname", os.environ["PGDATABASE"], str(args.directory / "database.dump"))
    shutil.copytree(args.directory / "media", args.media_directory)
    print("PORTFOLIO_LOCAL_RESTORE_COMPLETE: start the local app with this database, media directory and the separately retained encryption key.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["backup", "verify", "restore-local"])
    parser.add_argument("directory", type=Path)
    parser.add_argument("--writes-paused", action="store_true")
    parser.add_argument("--media-provider", choices=["local", "supabase"], default="local")
    parser.add_argument("--media-directory", type=Path, default=Path(".codex-runtime/media"))
    arguments = parser.parse_args()
    try:
        {"backup": backup, "verify": lambda value: verify(value.directory), "restore-local": restore_local}[arguments.action](arguments)
    except Exception as failure:
        # Remote errors and process diagnostics can contain sensitive request context.
        print(f"BACKUP_OPERATION_FAILED ({type(failure).__name__}). Check configuration and keep any incomplete backup separate; it is not a verified recovery point.")
        raise SystemExit(1)
