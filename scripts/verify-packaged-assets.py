"""Check the JAR's complete static inventory against the current frontend/backend sources."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--candidate", type=Path, default=ROOT / "build/libs/crystal-power-website-2.0.0.jar")
args = parser.parse_args()
candidate = args.candidate.resolve()
if not candidate.is_relative_to(ROOT) or candidate.suffix.lower() != ".jar" or not candidate.is_file():
    raise ValueError("Use an existing candidate JAR inside this checkout.")

expected = {}
counts = {}
for label, directory in [("frontend", ROOT / "frontend/dist"), ("backend", ROOT / "src/main/resources/static")]:
    files = [path for path in directory.rglob("*") if path.is_file()]
    assert files, "Missing " + label + " static resources."
    counts[label] = len(files)
    for path in files:
        name = path.relative_to(directory).as_posix()
        if name in expected:
            assert path.read_bytes() == expected[name].read_bytes(), "Conflicting static owners: " + name
        expected[name] = path

with zipfile.ZipFile(candidate) as archive:
    prefix = "BOOT-INF/classes/static/"
    actual = [name[len(prefix):] for name in archive.namelist() if name.startswith(prefix) and not name.endswith("/")]
    assert len(actual) == len(set(actual)), "Duplicate packaged static entries."
    assert set(actual) == set(expected), json.dumps({"stale": sorted(set(actual) - set(expected)), "missing": sorted(set(expected) - set(actual))})
    for name, path in expected.items():
        assert archive.read(prefix + name) == path.read_bytes(), "Packaged bytes differ: " + name

print(json.dumps({"result": "PACKAGED_STATIC_INVENTORY_PASS", "candidateSha256": hashlib.sha256(candidate.read_bytes()).hexdigest(),
                  "frontendFiles": counts["frontend"], "backendFiles": counts["backend"], "matchedFiles": len(expected), "staleFiles": 0}))
