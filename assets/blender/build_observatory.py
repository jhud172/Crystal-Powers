"""Original Aurora geode: twelve prismatic petals and an orbital heart.

Blender --background --factory-startup --python assets/blender/build_observatory.py
Optional: -- --render --width 1600 --samples 48
The legacy crystal/device outputs are preserved.
"""
import argparse
import math
import random
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_assets import ROOT, SOURCE, MODELS, RENDERS, material, empty, box, area, aim


def mesh(name, vertices, faces, mat, parent):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    uv = data.uv_layers.new(name="Mineral grain")
    for polygon in data.polygons:
        for loop_index in polygon.loop_indices:
            point = data.vertices[data.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv = ((math.atan2(point.y, point.x) / math.tau) % 1, (point.z + 1.6) / 3.4)
    return obj


def animate(obj, closed, opened, delay=0):
    """Bake identical reversible, staggered minimum-jerk paths at 24 fps."""
    obj.animation_data_create()
    for name in ("CrystalOpen", "CrystalClose"):
        action = bpy.data.actions.new(f"{name}_{obj.name}")
        obj.animation_data.action = action
        for frame in range(1, 59):
            time = (frame - 1) / 57
            if name == "CrystalClose":
                time = 1 - time
            t = min(1, max(0, (time - delay) / (1 - delay)))
            fraction = t * t * t * (t * (t * 6 - 15) + 10)
            obj.location = Vector(closed[0]).lerp(Vector(opened[0]), fraction)
            obj.rotation_euler = tuple(a + (b - a) * fraction for a, b in zip(closed[1], opened[1]))
            obj.keyframe_insert(data_path="location", frame=frame)
            obj.keyframe_insert(data_path="rotation_euler", frame=frame)
        track = obj.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        track.mute = True
    obj.animation_data.action = None
    obj.location, obj.rotation_euler = closed
    obj["role"] = "opening-pivot"


def strand(name, points, mat, parent, radius=0.009):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth, curve.bevel_resolution = radius, 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    curve.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


def mineral_texture():
    """Packed image grain survives glTF export; no unsupported procedural nodes."""
    size = 256
    image = bpy.data.images.new("Original mineral striations", width=size, height=size)
    rng = random.Random(42)
    pixels = []
    for y in range(size):
        for x in range(size):
            band = math.sin(y * .34 + math.sin(x * .045) * 3.2)
            vein = max(0, math.sin(y * .09 + x * .018)) ** 24
            value = .76 + band * .055 + vein * .15 + rng.random() * .035
            pixels.extend((value, value, value, 1))
    image.pixels = pixels
    image.pack()
    return image


def jewel(name, colour, texture):
    mat = material(name, colour, metallic=.3, roughness=.25, transmission=.12)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get("Principled BSDF")
    shader.inputs["Coat Weight"].default_value = .65
    shader.inputs["Coat Roughness"].default_value = .18
    image = nodes.new("ShaderNodeTexImage")
    image.image = texture
    tint = nodes.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1
    tint.inputs[7].default_value = (*colour, 1)
    links.new(image.outputs["Color"], tint.inputs[6])
    links.new(tint.outputs[2], shader.inputs["Base Color"])
    return mat


def geometry():
    root = empty("CrystalObservatory")
    root["provenance"] = "Original Crystal Powers geometry; build_observatory.py"
    root["units"] = "metres"
    root["openingDuration"] = 57 / 24
    root["edition"] = "Aurora geode / 02"
    texture = mineral_texture()
    colours = ((.035, .58, .65), (.12, .34, .78), (.44, .16, .68), (.8, .21, .42), (.87, .48, .16), (.09, .65, .49))
    jewels = [jewel(f"Prism_{i}", colour, texture) for i, colour in enumerate(colours)]
    metal = material("Champagne inlay", (.7, .48, .23), metallic=.82, roughness=.27)
    core_mat = material("Aurora heart", (.28, .85, .88), metallic=.25, roughness=.2)
    shader = core_mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Emission Color"].default_value = (0.35, 0.68, 1, 1)
    shader.inputs["Emission Strength"].default_value = 0.45
    centre = (0, 0, 2.15)
    poses = []
    for index in range(12):
        inner = index >= 6
        angle = (index % 6) * math.tau / 6 + (math.pi / 6 if inner else 0)
        pivot = empty(f"FacetPivot_{index:02d}", centre, root)
        vertices = []
        # Twisted, unequal crown cuts form a closed seed and a flower-like open geode.
        profile = ((.16, -1.32, .015), (.66, -.85, .24), (.94, -.12, .38), (.83, .62, .32), (.46, 1.2, .19), (.09, 1.65, .008))
        for radius, z, width in profile:
            twist = angle + z * .16
            for side, depth in ((-1, 0), (-.52, .12), (.38, .16), (1, 0), (.4, -.11), (-.5, -.11)):
                r = (radius + depth) * (.67 if inner else 1)
                w = width * side * (.75 if inner else 1)
                vertices.append((r * math.cos(twist) - w * math.sin(twist), r * math.sin(twist) + w * math.cos(twist), z * (.77 if inner else 1)))
        faces = [tuple(reversed(range(6))), tuple(range(30, 36))]
        for ring in range(5):
            for edge in range(6):
                a, b = ring * 6 + edge, ring * 6 + (edge + 1) % 6
                faces.append((a, b, b + 6, a + 6))
        facet = mesh(f"PrismaticPetal_{index:02d}", vertices, faces, jewels[index % 6], pivot)
        facet["role"] = "crystal-facet"
        for edge in (0, 2):
            strand(f"PetalInlay_{index:02d}_{edge}", [vertices[ring * 6 + edge] for ring in range(6)], metal, pivot, .006)
        closed = (centre, (0, 0, 0))
        spread = .35 if inner else .7
        tilt = .26 if inner else .42
        opened = ((spread * math.cos(angle), spread * math.sin(angle), centre[2] - (.05 if inner else .22)),
                  (-tilt * math.sin(angle), tilt * math.cos(angle), .15))
        animate(pivot, closed, opened, (index % 6) * .018 + (.12 if inner else 0))
        poses.append((pivot, closed, opened))
    core_pivot = empty("CorePivot", centre, root)
    vertices = [(0, 0, .86), (0, 0, -.75)]
    vertices += [(.34 * math.cos(i * math.tau / 10), .34 * math.sin(i * math.tau / 10), .1 if i % 2 else -.04) for i in range(10)]
    faces = [(0, 2 + i, 2 + (i + 1) % 10) for i in range(10)] + [(1, 2 + (i + 1) % 10, 2 + i) for i in range(10)]
    core = mesh("LuminousCore", vertices, faces, core_mat, core_pivot)
    core["role"] = "luminous-core"
    closed, opened = (centre, (0, 0, 0)), (centre, (0, 0, math.pi / 2))
    animate(core_pivot, closed, opened)
    poses.append((core_pivot, closed, opened))
    for index in range(3):
        pivot = empty(f"OrbitPivot_{index:02d}", centre, root)
        radius = 1.72 + index * .17
        for segment in range(3):
            points = [(radius * math.cos(t), radius * math.sin(t), 0) for t in [segment * math.tau / 3 + step * 1.7 / 48 for step in range(49)]]
            strand(f"ChampagneOrbit_{index}_{segment}", points, metal, pivot, .012 if index == 0 else .008)
        closed = (centre, (.65 + index * .43, .2 + index * .3, index * .7))
        opened = (centre, (closed[1][0] + .3, closed[1][1] - .25, closed[1][2] + .65))
        animate(pivot, closed, opened, .06)
        poses.append((pivot, closed, opened))
    for index in range(6):
        angle = index * math.tau / 6
        location = (1.7 * math.cos(angle), 1.7 * math.sin(angle), centre[2] + .4 * math.sin(angle * 2))
        pivot = empty(f"SatellitePivot_{index:02d}", location, root)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.095)
        satellite = bpy.context.object
        satellite.name = f"Satellite_{index:02d}"
        satellite.parent = pivot
        satellite.scale = (.8, .8, 1.8)
        satellite.data.materials.append(jewels[index])
        closed = (location, (0, 0, 0))
        opened = ((location[0] * 1.13, location[1] * 1.13, location[2]), (0, .7, 1.2))
        animate(pivot, closed, opened, .1)
        poses.append((pivot, closed, opened))
    return root, poses


def photography(appearance, args):
    scene = bpy.context.scene
    light = appearance == "light"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.62, 0.71, 0.84, 1) if light else (0.06, 0.09, 0.17, 1)
    background.inputs["Strength"].default_value = 0.4
    floor = material("Observatory sweep", (0.84, 0.86, 0.9) if light else (0.01, 0.016, 0.027), roughness=0.45)
    box("PhotographySweep", (200, 200, 0.1), (0, 0, -0.065), floor, 0)
    target = (0, 0, 2.15)
    area("Observatory key", (1, -4, 7), 1400, (0.85, 0.93, 1), 5, target, 3)
    area("Observatory strip", (4, 1, 4), 1600, (0.75, 0.85, 1), 1, target, 5)
    area("Observatory rim", (-4, 1, 4), 1600, (0.64, 0.55, 1), 2, target, 5)
    camera_data = bpy.data.cameras.new("ObservatoryCamera")
    camera = bpy.data.objects.new("ObservatoryCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (3.6, -9, 4.7)
    aim(camera, target)
    camera_data.lens = 42
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = args.width, round(args.width * 0.625)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.view_settings.view_transform = "AgX"
    try:
        preferences = bpy.context.preferences.addons["cycles"].preferences
        preferences.compute_device_type = "OPTIX"
        preferences.get_devices()
        for device in preferences.devices:
            device.use = device.type == "OPTIX"
        if any(device.use for device in preferences.devices):
            scene.cycles.device = "GPU"
    except Exception as error:
        print("Cycles CPU fallback:", error)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--width", type=int, default=1600)
    parser.add_argument("--samples", type=int, default=48)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.fps, scene.frame_start, scene.frame_end = 24, 1, 58
    root, poses = geometry()
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(MODELS / "observatory.glb"), export_format="GLB", use_selection=True,
                              export_animation_mode="NLA_TRACKS", export_animations=True, export_apply=True,
                              export_extras=True, export_cameras=False, export_lights=False, export_yup=True)
    for appearance in ("dark", "light"):
        lights_before = set(bpy.data.objects)
        photography(appearance, args)
        for pose_name, index in (("closed", 1), ("open", 2)):
            for obj, closed, opened in poses:
                obj.location, obj.rotation_euler = (closed, opened)[index - 1]
            scene.render.filepath = str(RENDERS / f"observatory-{appearance}{'-open' if pose_name == 'open' else ''}.png")
            bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / f"observatory-{appearance}-{pose_name}.blend"))
            if args.render:
                bpy.ops.render.render(write_still=True)
        for obj in set(bpy.data.objects) - lights_before:
            bpy.data.objects.remove(obj, do_unlink=True)
    print("OBSERVATORY_SOURCE_READY", flush=True)


if __name__ == "__main__":
    main()
