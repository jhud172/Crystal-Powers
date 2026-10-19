"""Compare a paused disposable source with its restored PostgreSQL database and media."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
from portfolio_backup import verify


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path)
    parser.add_argument("--target", required=True)
    parser.add_argument("--media-directory", type=Path, required=True)
    args = parser.parse_args()
    source = os.environ.get("PGDATABASE", "")
    if (os.environ.get("PGHOST") != "127.0.0.1" or os.environ.get("PGPORT") != "55432"
            or not re.fullmatch(r"crystal_rebuild_test[a-z0-9_]*", source)
            or not re.fullmatch(r"crystal_restore_[a-z0-9_]+", args.target)):
        raise ValueError("Use distinct disposable source and restore databases on 127.0.0.1:55432.")
    manifest = verify(args.backup)
    executable = str(Path(os.environ["PG_BIN"]) / ("psql.exe" if os.name == "nt" else "psql")) if "PG_BIN" in os.environ else "psql"

    def query(database, statement):
        environment = {**os.environ, "PGDATABASE": database}
        result = subprocess.run([executable, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", statement], env=environment, capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError("Disposable restore comparison query failed.")
        return result.stdout.strip()

    rows = 0
    for table in manifest["tables"]:
        assert re.fullmatch(r"[a-z_]+", table), "Unexpected table identifier."
        statement = f"SELECT json_build_object('rows',count(*),'digest',md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY to_jsonb(t)::text),''))) FROM public.{table} t"
        original, restored = [query(database, statement) for database in (source, args.target)]
        assert original == restored, f"Table rows differ: {table}"
        rows += json.loads(original)["rows"]
    schema_checks = [
        "SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.tablename,t.indexname),'[]'::json) FROM (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public') t",
        "SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.relname),'[]'::json) FROM (SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r') t",
        "SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.table_name,t.ordinal_position),'[]'::json) FROM (SELECT table_name,ordinal_position,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public') t",
    ]
    for index, statement in enumerate(schema_checks):
        assert query(source, statement) == query(args.target, statement), f"Schema/constraint/index/RLS comparison failed: {index}"
    constraint_query = "SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.relname,t.conname),'[]'::json) FROM (SELECT c.relname,k.conname,k.contype,k.condeferrable,k.condeferred,k.convalidated,pg_get_constraintdef(k.oid) AS definition,pg_get_expr(k.conbin,k.conrelid) AS expression FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') t"
    def constraints(database):
        result = json.loads(query(database, constraint_query))
        for constraint in result:
            if constraint["contype"] == "c":
                name = constraint["relname"]
                assert re.fullmatch(r"[a-z_]+", name), "Unexpected constraint relation."
                # pg_dump/reparse can distribute varchar[] -> text[] casts over
                # each literal. Compare PostgreSQL's planned expression instead
                # of treating equivalent deparser spelling as data corruption.
                plan = json.loads(query(database, f"EXPLAIN (VERBOSE, FORMAT JSON, COSTS FALSE) SELECT {constraint['expression']} FROM public.{name}"))
                constraint["definition"] = plan[0]["Plan"]["Output"]
                del constraint["expression"]
        return result
    assert constraints(source) == constraints(args.target), "Restored constraint definitions or validation state differ."
    for sequence in manifest["sequences"]:
        assert re.fullmatch(r"public\.[a-z_]+", sequence), "Unexpected sequence identifier."
        statement = f"SELECT last_value,is_called FROM {sequence}"
        assert query(source, statement) == query(args.target, statement), f"Sequence state differs: {sequence}"
    media = 0
    for item in manifest["files"]:
        relative = Path(item["path"])
        if relative.parts[0] == "media":
            assert (args.media_directory / relative.name).read_bytes() == (args.backup / relative).read_bytes(), "Restored media differs."
            media += 1
    print(json.dumps({"result": "POSTGRES_RESTORE_COMPARISON_PASS", "tables": len(manifest["tables"]), "rows": rows, "schemaChecks": len(schema_checks) + 1, "sequences": len(manifest["sequences"]), "media": media}))


if __name__ == "__main__":
    main()
