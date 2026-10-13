"""Read-only validation of decoded GLB geometry and the original studio contracts."""
import hashlib
import argparse
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "frontend/public/models"
COMPONENTS = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def inspect_model(name, file=None):
    raw = (file or MODELS / f"{name}.glb").read_bytes()
    assert struct.unpack_from("<III", raw) == (0x46546C67, 2, len(raw)), f"{name}: GLB header"
    offset, chunks = 12, []
    while offset < len(raw):
        length, kind = struct.unpack_from("<II", raw, offset)
        assert length % 4 == 0 and offset + 8 + length <= len(raw), f"{name}: chunk bounds/alignment"
        chunks.append((kind, raw[offset + 8:offset + 8 + length]))
        offset += 8 + length
    assert offset == len(raw) and [kind for kind, _ in chunks] == [0x4E4F534A, 0x004E4942], f"{name}: JSON/BIN chunks"
    gltf = json.loads(chunks[0][1])
    binary = chunks[1][1]
    assert len(gltf["buffers"]) == 1 and "uri" not in gltf["buffers"][0], f"{name}: embedded buffer"
    assert 0 <= len(binary) - gltf["buffers"][0]["byteLength"] <= 3, f"{name}: binary payload/padding"
    assert not gltf.get("extensionsRequired"), f"{name}: unexpected mandatory decoder/extension"
    for view in gltf["bufferViews"]:
        assert view["buffer"] == 0 and view.get("byteOffset", 0) >= 0
        assert view.get("byteOffset", 0) + view["byteLength"] <= gltf["buffers"][0]["byteLength"], f"{name}: buffer view outside data"
    for image in gltf.get("images", []):
        assert "uri" not in image and image.get("bufferView") in range(len(gltf["bufferViews"])), f"{name}: embedded image"
        assert image.get("mimeType") in ("image/png", "image/jpeg"), f"{name}: image MIME"

    decoded = {}

    def values(index):
        if index in decoded:
            return decoded[index]
        accessor = gltf["accessors"][index]
        assert "sparse" not in accessor, f"{name}: sparse accessor needs explicit decoding support"
        assert accessor["count"] > 0 and accessor["type"] in WIDTHS
        code, size = COMPONENTS[accessor["componentType"]]
        width = WIDTHS[accessor["type"]]
        view = gltf["bufferViews"][accessor["bufferView"]]
        stride = view.get("byteStride", size * width)
        relative = accessor.get("byteOffset", 0)
        assert stride >= size * width and relative % size == 0
        assert relative + (accessor["count"] - 1) * stride + size * width <= view["byteLength"], f"{name}: accessor outside view"
        start = view.get("byteOffset", 0) + relative
        result = [struct.unpack_from("<" + code * width, binary, start + row * stride) for row in range(accessor["count"])]
        assert all(math.isfinite(value) for row in result for value in row), f"{name}: non-finite accessor"
        if accessor.get("normalized"):
            maximum = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[accessor["componentType"]]
            result = [tuple(max(-1, value / maximum) for value in row) for row in result]
        decoded[index] = result
        return result

    # Decode every accessor, including unused entries: a valid header is not data proof.
    for index in range(len(gltf["accessors"])):
        values(index)
    triangles, vertices = 0, 0
    for mesh in gltf["meshes"]:
        for primitive in mesh["primitives"]:
            assert primitive.get("mode", 4) == 4, f"{name}: non-triangle primitive"
            attributes = primitive["attributes"]
            positions = values(attributes["POSITION"])
            normals = values(attributes["NORMAL"])
            assert len(normals) == len(positions) and all(len(point) == 3 for point in positions)
            assert all(abs(math.sqrt(sum(value * value for value in normal)) - 1) < 0.005 for normal in normals), f"{name}: invalid unit normals"
            if "TEXCOORD_0" in attributes:
                assert len(values(attributes["TEXCOORD_0"])) == len(positions), f"{name}: UV vertex count"
            if "indices" in primitive:
                indices = [row[0] for row in values(primitive["indices"])]
                assert len(indices) % 3 == 0 and all(isinstance(index, int) and 0 <= index < len(positions) for index in indices), f"{name}: triangle indices"
                triangles += len(indices) // 3
            else:
                assert len(positions) % 3 == 0
                triangles += len(positions) // 3
            vertices += len(positions)
            material = gltf["materials"][primitive["material"]]
            if "baseColorTexture" in material.get("pbrMetallicRoughness", {}):
                assert "TEXCOORD_0" in attributes, f"{name}: textured primitive without UVs"

    nodes = gltf["nodes"]
    parents = {}
    for index, node in enumerate(nodes):
        for child in node.get("children", []):
            assert child in range(len(nodes)) and child not in parents, f"{name}: invalid/multiple parents"
            parents[child] = index
        if "mesh" in node:
            assert node["mesh"] in range(len(gltf["meshes"]))
        for property_name, length in (("translation", 3), ("scale", 3), ("rotation", 4), ("matrix", 16)):
            if property_name in node:
                assert len(node[property_name]) == length and all(math.isfinite(value) for value in node[property_name])
        assert not ("matrix" in node and any(key in node for key in ("rotation", "translation", "scale")))
        assert all(abs(value) > 1e-8 for value in node.get("scale", [1, 1, 1])), f"{name}: singular scale"
        if "rotation" in node:
            assert abs(sum(value * value for value in node["rotation"]) - 1) < 0.001, f"{name}: node quaternion"
        seen, current = set(), index
        while current in parents:
            assert current not in seen, f"{name}: hierarchy cycle"
            seen.add(current)
            current = parents[current]

    screen_details = []
    if name in ("laptop", "monitor", "phone"):
        screens = [node for node in nodes if node.get("name") == "Screen"]
        assert len(screens) == 1 and screens[0].get("extras", {}).get("role") == "project-screen"
        screen = screens[0]
        primitive = gltf["meshes"][screen["mesh"]]["primitives"][0]
        positions = values(primitive["attributes"]["POSITION"])
        uvs = values(primitive["attributes"]["TEXCOORD_0"])
        assert all(-1e-6 <= value <= 1 + 1e-6 for uv in uvs for value in uv)
        assert all(min(uv[axis] for uv in uvs) == 0 and max(uv[axis] for uv in uvs) == 1 for axis in (0, 1)), f"{name}: complete screen UV coverage"
        # Mesh-local axes need not be Y-up: the exporter may retain an axis conversion
        # on a parent. Measure the actual UV-corresponding rectangle, independent of pose.
        corners = {uv: point for uv, point in zip(uvs, positions)}
        assert all(corner in corners for corner in ((0, 0), (1, 0), (0, 1), (1, 1)))
        origin = corners[(0, 0)]
        horizontal = tuple(value - base for value, base in zip(corners[(1, 0)], origin))
        vertical = tuple(value - base for value, base in zip(corners[(0, 1)], origin))
        width = math.sqrt(sum(value * value for value in horizontal))
        height = math.sqrt(sum(value * value for value in vertical))
        assert width > 0 and height > 0 and abs(sum(a * b for a, b in zip(horizontal, vertical))) < 1e-6, f"{name}: orthogonal screen geometry"
        for uv, point in zip(uvs, positions):
            assert all(abs(point[axis] - origin[axis] - uv[0] * horizontal[axis] - uv[1] * vertical[axis]) < 1e-6 for axis in range(3)), f"{name}: planar rectangular screen/UV mapping"
        aspect = screen["extras"]["aspect"]
        assert abs(width / height - aspect) < 0.0001, f"{name}: screen aspect differs from geometry"
        screen_details.append({"name": "Screen", "aspect": aspect, "width": width, "height": height})

    clips = {}
    for clip in gltf.get("animations", []):
        assert clip["name"] not in clips and clip["channels"], f"{name}: clip identity/channels"
        duration = 0
        for channel in clip["channels"]:
            assert channel["target"]["node"] in range(len(nodes))
            sampler = clip["samplers"][channel["sampler"]]
            times = [row[0] for row in values(sampler["input"])]
            assert len(times) > 1 and all(b > a for a, b in zip(times, times[1:])), f"{name}: non-increasing animation time"
            outputs = values(sampler["output"])
            cubic = sampler.get("interpolation") == "CUBICSPLINE"
            assert len(outputs) == len(times) * (3 if cubic else 1), f"{name}: animation output count"
            output_values = outputs[1::3] if cubic else outputs
            if channel["target"]["path"] == "rotation":
                assert all(len(row) == 4 and abs(sum(value * value for value in row) - 1) < 0.001 for row in output_values), f"{name}: animation quaternions"
            duration = max(duration, times[-1])
            if name == "observatory":
                assert nodes[channel["target"]["node"]].get("extras", {}).get("role") == "opening-pivot"
            if name == "laptop":
                assert nodes[channel["target"]["node"]].get("name") == "DisplayHinge" and channel["target"]["path"] == "rotation"
        clips[clip["name"]] = duration
    required = {"crystal": {"CrystalTurn"}, "laptop": {"LaptopOpen"}, "observatory": {"CrystalOpen", "CrystalClose"}}
    assert required.get(name, set()).issubset(clips)
    if name == "observatory":
        assert sum(node.get("extras", {}).get("role") == "opening-pivot" for node in nodes) == 22
        assert sum(node.get("extras", {}).get("role") == "crystal-facet" for node in nodes) == 12
        assert all(2.3 < duration < 2.5 for duration in clips.values())
    assert len(raw) <= 5 * 1024 * 1024
    return {"model": name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "meshes": len(gltf["meshes"]), "primitives": sum(len(mesh["primitives"]) for mesh in gltf["meshes"]), "materials": len(gltf["materials"]), "vertices": vertices, "triangles": triangles, "decodedAccessors": len(decoded), "clips": clips, "screens": screen_details, "embeddedImages": len(gltf.get("images", []))}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--laptop-candidate", type=Path)
    args = parser.parse_args()
    results = [inspect_model(name, args.laptop_candidate if name == "laptop" else None) for name in ("crystal", "laptop", "monitor", "phone", "observatory")]
    print(json.dumps(results, indent=2))
    print("MODEL_GEOMETRY_PASS: five original GLBs, decoded geometry/normal/UV/index/transform/screen/animation contracts")
