"""Create a fresh disposable PostgreSQL fixture and pipe its credentials to Edge in memory only."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("recovery_lab", Path(__file__).with_name("verify-populated-recovery.py"))
lab_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab_module)
lab_module.BASE = "http://127.0.0.1:18084"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--roles", action="store_true")
options = parser.parse_args()
stamp = time.strftime("%Y%m%d%H%M%S")
args = SimpleNamespace(candidate=Path("build/libs/crystal-power-website-2.0.0.jar").resolve(),
    source="crystal_rebuild_test_recovery_browser_" + stamp, target="crystal_restore_browser_" + stamp,
    run="populated-recovery-browser-" + stamp, pg_bin=Path("C:/Program Files/PostgreSQL/17/bin"),
    pg_port=55447, app_port=18084)
lab = lab_module.Lab(args)
try:
    assert lab.sql("postgres", "SELECT current_user||'|'||host(inet_server_addr())||'|'||inet_server_port();") == "crystal_qa|127.0.0.1|55447"
    lab.sql("postgres", "CREATE DATABASE " + args.source + " OWNER crystal_qa;")
    lab.start(args.candidate, args.source, lab.output / "media", "browser")
    lab.seed()
    payload = dict(ownerEmail=lab.owner_email, teamEmail=lab.team_email, clientEmail=lab.client_email,
        password=lab.password, ownerSecret=lab.owner_secret, teamSecret=lab.team_secret,
        lastStep=lab.last_step, project=lab.project, businessProject=lab.business_project,
        request=lab.request, channel=lab.channel, output=str(lab.output))
    result = subprocess.run(["node", "scripts/verify-real-roles-browser.cjs" if options.roles else "scripts/verify-real-session-browser.cjs"],
        input=json.dumps(payload), text=True, cwd=lab_module.ROOT)
    if result.returncode:
        raise RuntimeError("Real-session browser batch failed; inspect its sanitised report.")
    print("REAL_SESSION_LAB_PASS: " + str(lab.output), flush=True)
finally:
    lab.stop()
