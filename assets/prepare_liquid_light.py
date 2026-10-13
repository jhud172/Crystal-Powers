"""Generate or validate bit-exact Liquid Light web delivery; never modify the source PNG."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--generate", action="store_true")
mode.add_argument("--validate-only", action="store_true")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
folder = root / "frontend/public/renders/liquid-light"
source = folder / "hero.png"
output = folder / "hero.webp"
manifest = folder / "delivery.json"
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
with Image.open(source) as image:
    pixels = image.convert("RGBA")
    if args.generate:
        # No resize, retouch or colour adjustment; source artwork stays immutable.
        options = {"lossless": True, "quality": 100, "method": 6, "exact": True}
        if image.info.get("icc_profile"):
            options["icc_profile"] = image.info["icc_profile"]
        pixels.save(output, format="WEBP", **options)
    with Image.open(output) as delivered:
        if delivered.size != pixels.size or delivered.convert("RGBA").tobytes() != pixels.tobytes():
            raise SystemExit("Delivery copy does not preserve original artwork pixels")
    record = {"source": "hero.png", "delivery": "hero.webp", "width": pixels.width, "height": pixels.height,
              "sourceBytes": source.stat().st_size, "deliveryBytes": output.stat().st_size,
              "sourceSha256": digest(source), "deliverySha256": digest(output), "lossless": True}
    if args.generate:
        manifest.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    elif json.loads(manifest.read_text(encoding="utf-8")) != record:
        raise SystemExit("Liquid Light delivery manifest is stale; regenerate explicitly")
print(json.dumps({"mode": "generated" if args.generate else "validated", "sourceBytes": record["sourceBytes"], "deliveryBytes": record["deliveryBytes"], "pixelIdentical": True}))
