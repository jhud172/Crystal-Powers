"""Validate actual-renderer photographs; encode/promote only the reviewed original collection."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CAPTURES = ROOT / ".codex-runtime/qa/live-posters"
DELIVERY = ROOT / "frontend/public/renders/live"
parser = argparse.ArgumentParser()
mode = parser.add_mutually_exclusive_group()
mode.add_argument("--promote", action="store_true", help="Encode reviewed captures and copy their delivery files into the public collection")
mode.add_argument("--refresh-provenance", action="store_true", help="Refresh renderer hashes only after all new captures exactly match the existing PNG bytes and delivery manifest")
args = parser.parse_args()


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


report = json.loads((CAPTURES if args.promote or args.refresh_provenance else DELIVERY).joinpath("capture-manifest.json").read_text(encoding="utf-8"))
assert not report["errors"] and len(report["captures"]) == 12
for file, digest in report["sourceHashes"].items():
    assert (ROOT / file).resolve().is_relative_to(ROOT)
    source = ROOT / file
    # Git checkouts may use CRLF on Windows; line endings cannot change rendering.
    source_digest = hashlib.sha256(source.read_bytes().replace(b"\r\n", b"\n")).hexdigest() if source.suffix in {".ts", ".tsx"} else sha(source)
    # Older manifests recorded the checkout bytes; accept those exact originals too.
    assert digest in {source_digest, sha(source)}, f"Renderer/screen changed; regenerate photography first: {file}"
for model, digest in report["modelHashes"].items():
    assert model in {"crystal", "laptop", "monitor", "phone", "observatory"}
    assert sha(ROOT / f"frontend/public/models/{model}.glb") == digest, f"Model changed; regenerate photography first: {model}"
expected = {f"{model}-{appearance}{pose}.png" for model in report["modelHashes"] for appearance in ("dark", "light") for pose in ("", "-open") if model == "observatory" or not pose}
assert {item["filename"] for item in report["captures"]} == expected and len(expected) == 12
if args.promote:
    DELIVERY.mkdir(parents=True, exist_ok=True)
manifest = {"source": report["source"], "quality": "standard", "renders": {}}
for item in report["captures"]:
    filename = item["filename"]
    source = (CAPTURES if args.promote or args.refresh_provenance else DELIVERY) / filename
    assert sha(source) == item["sha256"], f"Captured pixels changed: {filename}"
    if args.refresh_provenance:
        assert sha(DELIVERY / filename) == item["sha256"], f"Capture differs from existing artwork; review and promote instead: {filename}"
    height = 1000 if item["model"] in {"crystal", "observatory"} else 1120
    with Image.open(source) as image:
        assert image.format == "PNG" and image.size == (1600, height)
        assert image.mode == "RGBA" and image.getpixel((0, 0))[3] == 0
        bounds = image.getchannel("A").point(lambda value: 255 if value > 20 else 0).getbbox()
        assert bounds and bounds[0] > 16 and bounds[1] > 16 and bounds[2] < 1584 and bounds[3] < height - 16, f"Clipped/empty sculpture: {filename} {bounds}"
        for width in (800, 1600):
            target = DELIVERY / f"{source.stem}{'-800' if width == 800 else ''}.webp"
            size = (width, round(height * width / 1600))
            if args.promote:
                image.resize(size, Image.Resampling.LANCZOS).save(target, format="WEBP", quality=88, method=6, exact=True)
            with Image.open(target) as encoded:
                assert encoded.format == "WEBP" and encoded.size == size
                assert encoded.mode == "RGBA" and encoded.getpixel((0, 0))[3] == 0
                encoded.verify()
            assert target.stat().st_size < (150_000 if width == 800 else 350_000), f"Poster delivery budget exceeded: {target.name}"
            manifest["renders"][target.name] = {"width": size[0], "height": size[1], "bytes": target.stat().st_size, "sha256": sha(target)}
    if args.promote:
        shutil.copyfile(source, DELIVERY / filename)
if args.promote:
    (DELIVERY / "capture-manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (DELIVERY / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
else:
    assert manifest == json.loads((DELIVERY / "manifest.json").read_text(encoding="utf-8")), "Delivery bytes/metadata changed"
    if args.refresh_provenance:
        (DELIVERY / "capture-manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"poses": 12, "webpFiles": len(manifest["renders"]), "webpBytes": sum(item["bytes"] for item in manifest["renders"].values()), "promoted": args.promote, "provenanceRefreshed": args.refresh_provenance}))
print("LIVE_POSTER_DELIVERY_PASS: current renderer/model/screen hashes, unclipped views, alpha and responsive delivery")
