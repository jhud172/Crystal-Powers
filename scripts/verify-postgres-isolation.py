"""Read-only hosted-role boundary checks against an explicitly disposable local database."""
import json
import os
from pathlib import Path
import re
import subprocess


def main():
    if (os.environ.get("PGHOST") != "127.0.0.1" or os.environ.get("PGPORT") != "55432"
            or not re.fullmatch(r"crystal_(?:rebuild_test|restore_)[a-z0-9_]*", os.environ.get("PGDATABASE", ""))):
        raise ValueError("Use the explicitly disposable loopback PostgreSQL target on port 55432.")
    executable = str(Path(os.environ["PG_BIN"]) / ("psql.exe" if os.name == "nt" else "psql")) if "PG_BIN" in os.environ else "psql"

    def query(statement):
        result = subprocess.run([executable, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", statement], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError("PostgreSQL isolation query failed; inspect the disposable database configuration.")
        return result.stdout.strip()

    roles = json.loads(query("SELECT coalesce(json_agg(rolname ORDER BY rolname),'[]'::json) FROM pg_roles WHERE rolname IN ('anon','authenticated')"))
    assert roles == ["anon", "authenticated"], "Both representative hosted roles must exist before claiming their isolation."
    tables = json.loads(query("SELECT json_agg(json_build_object('name',c.relname,'rls',c.relrowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'"))
    assert tables and any(t["name"] == "team_message_attachment" for t in tables), "Current application schema is missing."
    for table in tables:
        name = table["name"]
        assert re.fullmatch(r"[a-z_]+", name), "Unexpected table identifier."
        if name != "flyway_schema_history":
            assert table["rls"], f"Row-level security is disabled: {name}"
        for role in roles:
            granted = query(f"SELECT has_table_privilege('{role}','public.{name}','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')")
            assert granted == "f", f"Browser role has table privileges: {role}/{name}"
    sequences = json.loads(query("SELECT coalesce(json_agg(sequencename ORDER BY sequencename),'[]'::json) FROM pg_sequences WHERE schemaname='public'"))
    for name in sequences:
        assert re.fullmatch(r"[a-z_]+", name), "Unexpected sequence identifier."
        for role in roles:
            assert query(f"SELECT has_sequence_privilege('{role}','public.{name}','USAGE,SELECT,UPDATE')") == "f", f"Browser role has sequence privileges: {role}/{name}"
    denied = []
    for role in roles:
        for name in ["project_revision", "team_message", "client_account", "billing_payment_request"]:
            result = subprocess.run([executable, "-X", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-c", f"SET ROLE {role}; SELECT * FROM public.{name} LIMIT 1"], capture_output=True, text=True)
            assert result.returncode != 0 and "42501" in result.stderr, f"Expected permission denial: {role}/{name}"
            denied.append(f"{role}/{name}")
    print(json.dumps({"result": "POSTGRES_BROWSER_ROLE_ISOLATION_PASS", "tables": len(tables), "sequences": len(sequences), "roles": roles, "deniedReads": denied}))


if __name__ == "__main__":
    main()
