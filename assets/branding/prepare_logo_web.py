"""Lossless alpha trimming and responsive delivery from original Blender renders."""
from pathlib import Path
import shutil
from PIL import Image

root = Path(__file__).resolve().parents[2]
source = root / "assets/branding/logo-3d"
output = root / "frontend/public/branding"
output.mkdir(parents=True, exist_ok=True)
for name, filename, width in [("crystal-powers-logo", "crystal-powers-logo-3d.png", 1200),
                              ("crystal-powers-emblem", "crystal-powers-emblem-3d.png", 240)]:
    image = Image.open(source / filename)
    image = image.crop(image.getchannel("A").getbbox())
    image.thumbnail((width, width), Image.Resampling.LANCZOS)
    image.save(output / (name + ".webp"), quality=92, method=6)
    image.save(output / (name + ".png"))

image = Image.open(source / "crystal-powers-logo-3d.png")
alpha = image.getchannel("A")
bounds = alpha.getbbox()
gaps, start = [], None
for x in range(bounds[0], int(image.width * .5)):
    empty = alpha.crop((x, bounds[1], x + 1, bounds[3])).getbbox() is None
    if empty and start is None:
        start = x
    if not empty and start is not None:
        gaps.append((x - start, x))
        start = None
_, cut = max(gaps)
wordmark = image.crop((cut, bounds[1], bounds[2], bounds[3]))
wordmark = wordmark.crop(wordmark.getchannel("A").getbbox())
wordmark.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
wordmark.save(output / "crystal-powers-wordmark.webp", quality=92, method=6)
icon = Image.open(output / "crystal-powers-emblem.png")
icon.thumbnail((64, 64), Image.Resampling.LANCZOS)
canvas = Image.new("RGBA", (64, 64))
canvas.alpha_composite(icon, ((64 - icon.width) // 2, (64 - icon.height) // 2))
canvas.save(output / "favicon.png")
shutil.copyfile(source / "crystal-powers-logo-3d.glb", root / "frontend/public/models/crystal-powers-logo-3d.glb")
print("Original Blender logo delivery prepared with transparent alpha.")
