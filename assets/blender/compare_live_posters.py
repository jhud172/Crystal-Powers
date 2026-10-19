"""Measure real browser live/poster pairs; foreground overlap, colour error and framing."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / ".codex-runtime/qa/poster-pc"
report = json.loads((QA / "report.json").read_text(encoding="utf-8"))
assert not report.get("failure") and len(report["pairs"]) == 36 and not report["errors"]
results = []
negative_controls = []
for pair in report["pairs"]:
    key = pair["key"]
    with Image.open(QA / f"{key}-live.png") as raw_live, Image.open(QA / f"{key}-poster.png") as raw_poster:
        assert raw_live.mode == raw_poster.mode == "RGBA", f"Scene transparency lost: {key}"
        opaque_background = Image.new("RGBA", raw_live.size, pair["backdrop"])
        live = Image.alpha_composite(opaque_background, raw_live).convert("RGB")
        poster = Image.alpha_composite(opaque_background, raw_poster).convert("RGB")
        assert live.size == poster.size == (pair["width"], pair["height"])
        background = Image.new("RGB", live.size, pair["backdrop"])
        # Object alpha supplies the actual silhouette; dark screen pixels are still object pixels.
        masks = [image.getchannel("A").point(lambda value: 255 if value > 20 else 0).convert("1") for image in (raw_live, raw_poster)]
        intersection = ImageChops.logical_and(*masks)
        union = ImageChops.logical_or(*masks)
        union_count = union.histogram()[255]
        assert union_count > 100, f"Empty comparison: {key}"
        overlap = intersection.histogram()[255] / union_count
        difference = ImageChops.difference(live, poster)
        error = sum(ImageStat.Stat(difference, union.convert("L")).mean) / 3
        # A native one-pixel edge and a downsampled WebP edge need not have identical coverage.
        # Keep raw measurements; also require bidirectional coverage within just one pixel.
        coverage = min(ImageChops.multiply(masks[0].convert("L"), masks[1].convert("L").filter(ImageFilter.MaxFilter(3))).histogram()[255] / masks[0].histogram()[255],
                       ImageChops.multiply(masks[1].convert("L"), masks[0].convert("L").filter(ImageFilter.MaxFilter(3))).histogram()[255] / masks[1].histogram()[255])
        perceptual_difference = ImageChops.difference(live.filter(ImageFilter.GaussianBlur(1)), poster.filter(ImageFilter.GaussianBlur(1)))
        perceptual_error = sum(ImageStat.Stat(perceptual_difference, union.convert("L")).mean) / 3
        bounds = [mask.getbbox() for mask in masks]
        bound_error = max(abs(a - b) for a, b in zip(*bounds))
        result = {"key": key, "foregroundIntersectionOverUnion": overlap, "foregroundMeanChannelErrorOf255": error, "foregroundCoverageWithinOnePixel": coverage, "perceptualMeanChannelErrorOf255": perceptual_error, "maximumBoundDifferencePx": bound_error, "bounds": bounds}
        results.append(result)
        assert coverage >= .985 and perceptual_error <= 8 and bound_error <= 3, f"Poster/live mismatch: {result}"
        if pair["width"] == 800 and (pair["model"] == "observatory" and pair["pose"] == "closed" or pair["model"] == "laptop" and not pair["light"]):
            original_file = ROOT / f"frontend/public/renders/{pair['model']}-{'light' if pair['light'] else 'dark'}.png"
            with Image.open(original_file) as original:
                scale = min(live.width / original.width, live.height / original.height)
                resized = original.convert("RGB").resize((round(original.width * scale), round(original.height * scale)), Image.Resampling.LANCZOS)
                former = background.copy()
                former.paste(resized, ((live.width - resized.width) // 2, (live.height - resized.height) // 2))
                former_mask = ImageChops.difference(former, background).convert("L").point(lambda value: 255 if value > 10 else 0)
                former_union = ImageChops.lighter(masks[0].convert("L"), former_mask)
                former_error = sum(ImageStat.Stat(ImageChops.difference(live.filter(ImageFilter.GaussianBlur(1)), former.filter(ImageFilter.GaussianBlur(1))), former_union).mean) / 3
                assert former_error > 8, f"Comparison failed to reject the known original photographic mismatch: {key}"
                negative_controls.append({"key": key, "retainedPhotographMeanColourError": former_error, "rejected": True})
assert len(negative_controls) == 3
(QA / "negative-controls.json").write_text(json.dumps(negative_controls, indent=2) + "\n", encoding="utf-8")
(QA / "pixel-comparison.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"pairs": len(results), "minimumRawForegroundOverlap": min(item["foregroundIntersectionOverUnion"] for item in results), "minimumCoverageWithinOnePixel": min(item["foregroundCoverageWithinOnePixel"] for item in results), "maximumPerceptualColourError": max(item["perceptualMeanChannelErrorOf255"] for item in results), "maximumBoundDifferencePx": max(item["maximumBoundDifferencePx"] for item in results)}))
print("LIVE_POSTER_MATCH_PASS: independent actual pixels for all five models, appearances, poses and three frame ratios")

if "--native" in sys.argv:
    # The selected hero now uses DOM Liquid Light art. Project stills deliberately
    # show the real screenshot first, rather than posing as a live-device render.
    # Native delivery and source optical comparisons are different evidence.
    native_folder = ROOT / ".codex-runtime/qa/scene-delivery-pc"
    native_report = json.loads((native_folder / "report.json").read_text(encoding="utf-8"))
    assert native_report.get("formatVersion") == 2, "Refresh current scene delivery; old Aurora page evidence is historical."
    assert not native_report.get("failure") and not native_report["errors"] and native_report["apiWrites"] == []
    assert len(native_report["checks"]) == 244
    views = native_report["deviceViews"]
    expected = {(theme, width, model) for theme in ("Dark", "Light", "Warm dark", "Fresh light", "Warm light") for width in (768, 1440) for model in ("laptop", "monitor", "phone")}
    assert len(views) == len(expected) == 30
    assert {(view["theme"], view["width"], view["model"]) for view in views} == expected
    assert all(view["renderTier"] == "standard" and view["frame"]["width"] > 0 and view["frame"]["height"] > 0 for view in views)
    print("NATIVE_SCENE_DELIVERY_PASS: shipped image hashes/current Liquid Light routes and 30 labelled device fixture views; optical pixel proof is the source matrix above")
