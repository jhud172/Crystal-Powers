"""Consolidate original GLB surfaces without recalculating normals or changing the scene.

After Blender authoring changes, re-export the original and run this separate step.
Validate a candidate before replacing the delivered model. No dependency is required.
"""
import argparse
import json
import struct
from collections import defaultdict
from pathlib import Path
from verify_model_geometry import inspect_model

ROOT = Path(__file__).resolve().parents[2]


def optimise(source, output):
    before = inspect_model("laptop", source)
    raw = source.read_bytes()
    length = struct.unpack_from("<I", raw, 12)[0]
    gltf, binary = json.loads(raw[20:20+length]), raw[28+length:]
    assert not gltf.get("images"), "Textured body parts need an explicit UV review"
    payloads = [binary[view.get("byteOffset", 0):view.get("byteOffset", 0)+view["byteLength"]] for view in gltf["bufferViews"]]

    def values(index):
        accessor = gltf["accessors"][index]
        code, size = {5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}[accessor["componentType"]]
        width = {"SCALAR": 1, "VEC3": 3}[accessor["type"]]
        stride = gltf["bufferViews"][accessor["bufferView"]].get("byteStride", size*width)
        return [struct.unpack_from("<"+code*width, payloads[accessor["bufferView"]], accessor.get("byteOffset", 0)+row*stride) for row in range(accessor["count"])]

    def add(rows, component, kind, target):
        code = {5123: "H", 5125: "I", 5126: "f"}[component]
        data = b"".join(struct.pack("<"+code*len(row), *row) for row in rows)
        accessor = {"bufferView": len(payloads), "componentType": component, "count": len(rows), "type": kind}
        if kind == "VEC3":
            encoded = [struct.unpack_from("<fff", data, index*12) for index in range(len(rows))]
            accessor.update({"min": [min(row[axis] for row in encoded) for axis in range(3)], "max": [max(row[axis] for row in encoded) for axis in range(3)]})
        payloads.append(data)
        gltf["bufferViews"].append({"buffer": 0, "byteLength": len(data), "target": target})
        gltf["accessors"].append(accessor)
        return len(gltf["accessors"])-1

    animated = {channel["target"]["node"] for clip in gltf["animations"] for channel in clip["channels"]}
    removed, merged = set(), []
    for parent in gltf["nodes"]:
        groups = defaultdict(list)
        for index in parent.get("children", []):
            node = gltf["nodes"][index]
            if "mesh" not in node or index in animated or node.get("name") == "Screen":
                continue
            assert not node.get("children") and not any(key in node for key in ("matrix", "rotation", "scale")), "New static transforms need explicit review"
            primitives = gltf["meshes"][node["mesh"]]["primitives"]
            assert len(primitives) == 1 and not primitives[0].get("targets")
            assert set(primitives[0]["attributes"]) <= {"POSITION", "NORMAL", "TEXCOORD_0"}
            groups[primitives[0]["material"]].append(index)
        for material, members in groups.items():
            if len(members) < 2:
                continue
            positions, normals, indices, unique = [], [], [], {}
            for index in members:
                node = gltf["nodes"][index]
                primitive = gltf["meshes"][node["mesh"]]["primitives"][0]
                translation, mapping = node.get("translation", (0, 0, 0)), []
                for point, normal in zip(values(primitive["attributes"]["POSITION"]), values(primitive["attributes"]["NORMAL"])):
                    position = tuple(point[axis]+translation[axis] for axis in range(3))
                    packed = struct.pack("<ffffff", *position, *normal)
                    if packed not in unique:
                        unique[packed] = len(positions)
                        positions.append(position)
                        normals.append(normal)
                    mapping.append(unique[packed])
                indices.extend((mapping[row[0]],) for row in values(primitive["indices"]))
            primitive = {"attributes": {"POSITION": add(positions, 5126, "VEC3", 34962), "NORMAL": add(normals, 5126, "VEC3", 34962)}, "indices": add(indices, 5123 if len(positions) <= 65535 else 5125, "SCALAR", 34963), "material": material}
            mesh = len(gltf["meshes"])
            gltf["meshes"].append({"name": f"{parent['name']}_static_{material}", "primitives": [primitive]})
            gltf["nodes"][members[0]] = {"name": f"{parent['name']}_static_{material}", "mesh": mesh}
            removed.update(members[1:])
            merged.append({"parent": parent["name"], "material": material, "parts": len(members)})

    # Remap only live node/mesh/accessor/view references, then repack their original bytes.
    node_map = {old: new for new, old in enumerate(index for index in range(len(gltf["nodes"])) if index not in removed)}
    gltf["nodes"] = [node for index, node in enumerate(gltf["nodes"]) if index not in removed]
    for node in gltf["nodes"]:
        if "children" in node:
            node["children"] = [node_map[index] for index in node["children"] if index not in removed]
    for scene in gltf["scenes"]:
        scene["nodes"] = [node_map[index] for index in scene["nodes"]]
    for clip in gltf["animations"]:
        for channel in clip["channels"]:
            channel["target"]["node"] = node_map[channel["target"]["node"]]
    used_meshes = sorted({node["mesh"] for node in gltf["nodes"] if "mesh" in node})
    mesh_map = {old: new for new, old in enumerate(used_meshes)}
    gltf["meshes"] = [gltf["meshes"][index] for index in used_meshes]
    for node in gltf["nodes"]:
        if "mesh" in node:
            node["mesh"] = mesh_map[node["mesh"]]
    primitives = [primitive for mesh in gltf["meshes"] for primitive in mesh["primitives"]]
    samplers = [sampler for clip in gltf["animations"] for sampler in clip["samplers"]]
    used_accessors = sorted({index for primitive in primitives for index in [*primitive["attributes"].values(), primitive["indices"]]} | {index for sampler in samplers for index in (sampler["input"], sampler["output"])})
    accessor_map = {old: new for new, old in enumerate(used_accessors)}
    gltf["accessors"] = [gltf["accessors"][index] for index in used_accessors]
    for primitive in primitives:
        primitive["attributes"] = {name: accessor_map[index] for name, index in primitive["attributes"].items()}
        primitive["indices"] = accessor_map[primitive["indices"]]
    for sampler in samplers:
        sampler["input"], sampler["output"] = accessor_map[sampler["input"]], accessor_map[sampler["output"]]
    views = sorted({accessor["bufferView"] for accessor in gltf["accessors"]})
    view_map, packed_binary, packed_views = {}, bytearray(), []
    for old in views:
        packed_binary.extend(b"\0"*(-len(packed_binary) % 4))
        view_map[old] = len(packed_views)
        packed_views.append({**gltf["bufferViews"][old], "byteOffset": len(packed_binary)})
        packed_binary.extend(payloads[old])
    for accessor in gltf["accessors"]:
        accessor["bufferView"] = view_map[accessor["bufferView"]]
    gltf["bufferViews"], gltf["buffers"] = packed_views, [{"byteLength": len(packed_binary)}]
    packed_binary.extend(b"\0"*(-len(packed_binary) % 4))
    packed_json = json.dumps(gltf, separators=(",", ":")).encode()
    packed_json += b" "*(-len(packed_json) % 4)
    result = struct.pack("<III", 0x46546C67, 2, 28+len(packed_json)+len(packed_binary)) + struct.pack("<II", len(packed_json), 0x4E4F534A) + packed_json + struct.pack("<II", len(packed_binary), 0x004E4942) + packed_binary
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(result)
    after = inspect_model("laptop", output)
    assert after["meshes"] <= before["meshes"] and after["triangles"] == before["triangles"] and after["bytes"] <= before["bytes"]
    print(json.dumps({"before": before, "after": after, "merged": merged}, indent=2))
    print("LAPTOP_STATIC_EXPORT_PASS; source scenes and input GLB retained")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT / "frontend/public/models/laptop.glb")
    parser.add_argument("--output", type=Path, default=ROOT / ".codex-runtime/qa/laptop-optimised.glb")
    args = parser.parse_args()
    assert args.source.resolve() != args.output.resolve(), "Validate a separate candidate before replacing the delivered export"
    optimise(args.source, args.output)
