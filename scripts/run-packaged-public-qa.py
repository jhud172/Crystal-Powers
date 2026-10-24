"""Run grouped public motion/performance checks on owned, provider-disabled packaged servers."""
import argparse
import importlib.util
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import time
from types import SimpleNamespace

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("stage", choices=("motion", "performance", "identity", "navigation"))
parser.add_argument("--only-identity-management", action="store_true", help="Rerun only the two management suites after a helper URL correction")
parser.add_argument("--only-scene-lifecycle", action="store_true", help="Rerun corrected motion, Prism and native visibility probes")
parser.add_argument("--only-native", action="store_true", help="Retry native background activation independently of passed emulated lifecycle checks")
parser.add_argument("--only-motion", action="store_true", help="Rerun only affected existing-feature lifecycle checks")
parser.add_argument("--only-quality", action="store_true", help="Rerun only the affected quality suite after a motion batch correction")
parser.add_argument("--only-cold", action="store_true", help="Rerun route stability profiles after a shared async-frame correction")
parser.add_argument("--only-render-cost", action="store_true", help="Rerun affected GPU profiles without repeating passed cold/static checks")
args = parser.parse_args()
spec = importlib.util.spec_from_file_location("recovery_lab", Path(__file__).with_name("verify-populated-recovery.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
stamp = time.strftime("%Y%m%d%H%M%S")
module.BASE = "http://127.0.0.1:18084"

def fixture(suffix, port, candidate):
    return module.Lab(SimpleNamespace(candidate=Path(candidate).resolve(),
        source="crystal_rebuild_test_recovery_" + suffix + "_" + stamp,
        target="crystal_restore_" + suffix + "_" + stamp,
        run="populated-recovery-" + suffix + "-" + stamp,
        pg_bin=Path("C:/Program Files/PostgreSQL/17/bin"), pg_port=55447, app_port=port))

current = fixture("public", 18084, "build/libs/crystal-power-website-2.0.0.jar")
previous = None
environment = dict(os.environ, CRYSTAL_QA_URL=module.BASE,
                   CRYSTAL_QA_CANDIDATE_SHA256=hashlib.sha256(current.args.candidate.read_bytes()).hexdigest(), CRYSTAL_RENDER_AFTER=module.BASE,
                   CRYSTAL_RENDER_BEFORE="http://127.0.0.1:8085")
try:
    current.sql("postgres", "CREATE DATABASE " + current.args.source + " OWNER crystal_qa;")
    current.start(current.args.candidate, current.args.source, current.output / "media", "public")
    if args.stage == "identity":
        scripts = ["verify-client-auth-browser.cjs", "verify-team-auth-browser.cjs", "verify-team-lifecycle-browser.cjs", "verify-team-security-browser.cjs", "verify-role-profiles-browser.cjs", "verify-team-members-browser.cjs"]
    elif args.stage == "navigation":
        scripts = ["verify-packaged-assets.py", "verify-section-anchors-browser.cjs", "verify-static-delivery.cjs", "verify-native-visibility-browser.cjs"]
    elif args.stage == "motion":
        scripts = ["verify-motion-browser.cjs", "verify-prism-gate-browser.cjs", "verify-batched-intersection-browser.cjs", "verify-quality-browser.cjs",
                   "verify-brand-resources-browser.cjs", "verify-native-visibility-browser.cjs", "verify-adaptive-quality.cjs"]
    elif not args.only_cold:
        previous = fixture("baseline", 8085, ".codex-runtime/qa/candidates/f7541b58604b2d6f194ba8000bddc18dc4ffa7c836ebf47d74b261d0561c0bd1.jar")
        previous.sql("postgres", "CREATE DATABASE " + previous.args.source + " OWNER crystal_qa;")
        module.BASE = "http://127.0.0.1:8085"
        previous.start(previous.args.candidate, previous.args.source, previous.output / "media", "baseline")
        module.BASE = environment["CRYSTAL_QA_URL"]
        scripts = ["verify-packaged-assets.py", "verify-static-delivery.cjs", "measure-performance-browser.cjs", "measure-render-cost-browser.cjs"]
    if args.only_cold:
        if args.stage != "performance":
            raise ValueError("Cold profiles belong to the performance batch.")
        scripts = ["verify-packaged-assets.py", "verify-static-delivery.cjs", "measure-performance-browser.cjs"]
    if args.only_identity_management:
        if args.stage != "identity":
            raise ValueError("Management correction belongs to the identity batch.")
        scripts = ["verify-role-profiles-browser.cjs", "verify-team-members-browser.cjs"]
    if args.only_scene_lifecycle:
        if args.stage != "motion":
            raise ValueError("Scene correction belongs to the motion batch.")
        scripts = ["verify-motion-browser.cjs", "verify-prism-gate-browser.cjs", "verify-batched-intersection-browser.cjs", "verify-native-visibility-browser.cjs"]
    if args.only_native:
        if args.stage != "motion":
            raise ValueError("Native visibility belongs to the motion batch.")
        scripts = ["verify-native-visibility-browser.cjs"]
    if args.only_motion:
        if args.stage != "motion":
            raise ValueError("Lifecycle correction belongs to the motion batch.")
        scripts = ["verify-motion-browser.cjs"]
    if args.only_quality:
        if args.stage != "motion":
            raise ValueError("Quality correction belongs to the motion batch.")
        scripts = ["verify-quality-browser.cjs"]
    if args.only_render_cost:
        if args.stage != "performance":
            raise ValueError("GPU correction belongs to the performance batch.")
        scripts = ["measure-render-cost-browser.cjs"]
    failed = []
    for name in scripts:
        print("BULK_QA_START " + name, flush=True)
        result = subprocess.run([sys.executable if name.endswith(".py") else "node", "scripts/" + name], cwd=module.ROOT, env=environment)
        if result.returncode:
            failed.append(name)
    if failed:
        raise RuntimeError("Grouped " + args.stage + " failures: " + ", ".join(failed))
    print("PACKAGED_" + args.stage.upper() + "_BATCH_PASS", flush=True)
finally:
    if previous:
        previous.stop()
    current.stop()
