"""Compare decoded old/new rendered surfaces and hinge keys, independently of mesh grouping."""
import itertools
import json
import math
import struct
import sys
from collections import defaultdict
from pathlib import Path

from verify_model_geometry import inspect_model


def read_surfaces(file):
    raw = file.read_bytes()
    length = struct.unpack_from("<I", raw, 12)[0]
    gltf = json.loads(raw[20:20 + length])
    binary = raw[28 + length:]
    cache = {}

    def values(index):
        if index not in cache:
            accessor = gltf["accessors"][index]
            view = gltf["bufferViews"][accessor["bufferView"]]
            code, size = {5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}[accessor["componentType"]]
            width = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[accessor["type"]]
            start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
            stride = view.get("byteStride", width * size)
            cache[index] = [struct.unpack_from("<" + code * width, binary, start + row * stride) for row in range(accessor["count"])]
        return cache[index]

    def multiply(a, b):
        return [[sum(a[row][part] * b[part][column] for part in range(4)) for column in range(4)] for row in range(4)]

    def local(node):
        if "matrix" in node:
            return [[node["matrix"][column * 4 + row] for column in range(4)] for row in range(4)]
        x, y, z, w = node.get("rotation", (0, 0, 0, 1))
        scale = node.get("scale", (1, 1, 1))
        rotation = [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]
        return [[rotation[row][column] * scale[column] for column in range(3)] + [node.get("translation", (0, 0, 0))[row]] for row in range(3)] + [[0, 0, 0, 1]]

    surfaces = defaultdict(list)

    def visit(index, parent):
        node = gltf["nodes"][index]
        world = multiply(parent, local(node))
        # This collection has rigid transforms; reject a future nonuniform scale rather
        # than silently applying the wrong normal transform in the comparison.
        basis = [[world[row][column] for row in range(3)] for column in range(3)]
        assert all(abs(sum(value*value for value in axis)-1) < 0.0001 for axis in basis)
        if "mesh" in node:
            for primitive in gltf["meshes"][node["mesh"]]["primitives"]:
                positions = values(primitive["attributes"]["POSITION"])
                normals = values(primitive["attributes"]["NORMAL"])
                vertices = []
                for point, normal in zip(positions, normals):
                    position = tuple(sum(world[row][column] * point[column] for column in range(3)) + world[row][3] for row in range(3))
                    direction = tuple(sum(world[row][column] * normal[column] for column in range(3)) for row in range(3))
                    vertices.append((position, direction))
                indices = [value[0] for value in values(primitive["indices"])]
                material = gltf["materials"][primitive["material"]]["name"]
                for offset in range(0, len(indices), 3):
                    triangle = [vertices[index] for index in indices[offset:offset+3]]
                    centre = tuple(math.floor(sum(vertex[0][axis] for vertex in triangle)/3 * 1000) for axis in range(3))
                    surfaces[(material, centre)].append(triangle)
        for child in node.get("children", []):
            visit(child, world)

    identity = [[int(row == column) for column in range(4)] for row in range(4)]
    for index in gltf["scenes"][gltf.get("scene", 0)]["nodes"]:
        visit(index, identity)
    hinge = next(node for node in gltf["nodes"] if node["name"] == "DisplayHinge")
    animation = gltf["animations"][0]
    tracks = [{"times": values(sampler["input"]), "outputs": values(sampler["output"]), "interpolation": sampler.get("interpolation", "LINEAR")} for sampler in animation["samplers"]]
    return surfaces, gltf["materials"], hinge, tracks


if __name__ == "__main__":
    before, after = (Path(value) for value in sys.argv[1:3])
    baseline = inspect_model("laptop", before)
    candidate = inspect_model("laptop", after)
    old, old_materials, old_hinge, old_tracks = read_surfaces(before)
    new, new_materials, new_hinge, new_tracks = read_surfaces(after)
    assert old_materials == new_materials, "Authored material factors changed"
    assert old_tracks == new_tracks, "Hinge animation keys/interpolation changed"
    assert {key: value for key, value in old_hinge.items() if key != "children"} == {key: value for key, value in new_hinge.items() if key != "children"}, "Hinge transform changed"
    maximum_position_error, minimum_normal_dot, matched = 0, 1, 0
    neighbours = [(0, 0, 0)] + [item for item in itertools.product((-1, 0, 1), repeat=3) if item != (0, 0, 0)]
    for key, triangles in old.items():
        for triangle in triangles:
            found = None
            # Float32 rounding can put equivalent centroids on opposite bucket edges.
            # Adjacent buckets locate candidates; actual positions still need <10 µm agreement.
            for neighbour in neighbours:
                candidate_key = key[0], tuple(key[1][axis] + neighbour[axis] for axis in range(3))
                candidates = new.get(candidate_key, [])
                for candidate_index, other in enumerate(candidates):
                    for order in ((0, 1, 2), (1, 2, 0), (2, 0, 1)):
                        error = max(abs(triangle[index][0][axis] - other[order[index]][0][axis]) for index in range(3) for axis in range(3))
                        normal_dot = min(sum(a*b for a,b in zip(triangle[index][1], other[order[index]][1])) for index in range(3))
                        if error < 0.00001 and normal_dot > 0.9999:
                            found = candidates, candidate_index, other, order, error
                            break
                    if found:
                        break
                if found:
                    break
            assert found is not None, f"Rendered triangle geometry/winding/shading changed near {key}"
            candidates, candidate_index, other, order, error = found
            maximum_position_error = max(maximum_position_error, error)
            dot = min(sum(a*b for a,b in zip(triangle[index][1], other[order[index]][1])) for index in range(3))
            minimum_normal_dot = min(minimum_normal_dot, dot)
            assert dot > 0.9999, f"Surface shading normal changed near {key}: {dot}"
            candidates.pop(candidate_index)
            matched += 1
    assert baseline["triangles"] == candidate["triangles"] == matched
    assert not any(new.values()), "Unmatched new surface triangles"
    print(json.dumps({"before": baseline, "after": candidate, "matchedTriangles": matched, "maximumWorldPositionError": maximum_position_error, "minimumNormalDot": minimum_normal_dot, "materialAndHingeKeysIdentical": True}, indent=2))
    print("LAPTOP_SURFACE_EQUIVALENCE_PASS")
