"""Create responsive delivery copies and verify exported Blender asset contracts."""
import json
import struct
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "frontend/public"
manifest = {"source": "Original Crystal Powers Blender assets", "models": {}, "renders": {}}
for name in ("crystal", "laptop", "monitor", "phone", "observatory"):
    file = PUBLIC / "models" / f"{name}.glb"
    raw = file.read_bytes()
    magic, version, length = struct.unpack_from("<III", raw)
    assert magic == 0x46546C67 and version == 2 and length == len(raw), f"Invalid GLB: {name}"
    json_length, chunk_type = struct.unpack_from("<II", raw, 12)
    assert chunk_type == 0x4E4F534A
    gltf = json.loads(raw[20:20 + json_length])
    nodes = [node.get("name", "") for node in gltf.get("nodes", [])]
    animations = [clip.get("name", "") for clip in gltf.get("animations", [])]
    assert gltf.get("meshes"), f"No meshes in {name}"
    assert all("NORMAL" in primitive["attributes"] for mesh in gltf["meshes"] for primitive in mesh["primitives"]), f"Missing normals: {name}"
    if name in ("laptop", "monitor", "phone"):
        assert "Screen" in nodes, f"Missing screen mesh: {name}"
        screen = next(node for node in gltf["nodes"] if node.get("name") == "Screen")
        assert screen.get("extras", {}).get("role") == "project-screen", f"Missing screen metadata: {name}"
        assert 0.2 < screen["extras"].get("aspect", 0) < 3, f"Invalid screen aspect ratio: {name}"
    assert name not in ("crystal", "laptop") or animations, f"Missing authored animation: {name}"
    required_clips = {"crystal": {"CrystalTurn"}, "laptop": {"LaptopOpen"}, "observatory": {"CrystalOpen", "CrystalClose"}}
    assert required_clips.get(name, set()).issubset(set(animations)), f"Missing named clips: {name}"
    durations = {}
    for clip in gltf.get("animations", []):
        assert clip["channels"], f"Empty clip: {clip['name']}"
        inputs = [gltf["accessors"][sampler["input"]] for sampler in clip["samplers"]]
        assert all(accessor["count"] > 1 and accessor["max"][0] > accessor["min"][0] for accessor in inputs), f"Static clip: {clip['name']}"
        durations[clip["name"]] = max(accessor["max"][0] for accessor in inputs)
    if name == "observatory":
        assert sum(node.get("extras", {}).get("role") == "crystal-facet" for node in gltf["nodes"]) == 8
        assert sum(node.get("extras", {}).get("role") == "opening-pivot" for node in gltf["nodes"]) == 16
        assert all(1.2 <= duration <= 1.6 for duration in durations.values()), "Opening timing outside storyboard range"
        assert all(all(gltf["nodes"][channel["target"]["node"]].get("extras", {}).get("role") == "opening-pivot" for channel in clip["channels"]) for clip in gltf["animations"]), "Opening animation targets must be named pivots"
    assert len(raw) <= 5 * 1024 * 1024, f"Mobile model budget exceeded: {name}"
    assert not any("uri" in buffer for buffer in gltf.get("buffers", [])), "GLB must be self-contained"
    manifest["models"][name] = {"bytes": len(raw), "meshes": len(gltf["meshes"]), "nodes": len(nodes), "animations": animations, "clipDurations": durations}
    for appearance in ("dark", "light"):
        for pose in ("", "-open") if name == "observatory" else ("",):
            source = PUBLIC / "renders" / f"{name}-{appearance}{pose}.png"
            with Image.open(source) as rendered:
                assert rendered.width > 0 and rendered.height > 0, f"Invalid poster resolution: {source.name}"
                assert name != "observatory" or rendered.width >= 1600, f"Insufficient opening poster resolution: {source.name}"
                for width in (1600, 800):
                    output = source.with_name(f"{name}-{appearance}{pose}{'-800' if width == 800 else ''}.webp")
                    size = (width, round(rendered.height * width / rendered.width))
                    rendered.resize(size, Image.Resampling.LANCZOS).save(output, format="WEBP", quality=88, method=6)
                    manifest["renders"][output.name] = {"width": size[0], "height": size[1], "bytes": output.stat().st_size}

(PUBLIC / "models/manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2))
print("BLENDER_WEB_ASSET_CONTRACT_PASS")
