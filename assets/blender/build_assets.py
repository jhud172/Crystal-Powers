"""Create original studio objects, portable GLBs and Cycles photography.

Run with Blender --background --factory-startup --python <this file> -- [options].
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/blender/scenes"
MODELS = ROOT / "frontend/public/models"
RENDERS = ROOT / "frontend/public/renders"
for directory in (SOURCE, MODELS, RENDERS):
    directory.mkdir(parents=True, exist_ok=True)


def material(name, colour, metallic=0, roughness=0.3, transmission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*colour, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Transmission Weight"].default_value = transmission
    bsdf.inputs["IOR"].default_value = 1.46 if transmission else 1.5
    if transmission:
        bsdf.inputs["Coat Weight"].default_value = 0.35
        bsdf.inputs["Coat Roughness"].default_value = 0.025
    return mat


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.parent = parent
    return obj


def box(name, dimensions, location, mat, bevel=0.04, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Machined edge radius", "BEVEL")
        mod.width = bevel
        mod.segments = 4
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(mat)
    obj.parent = parent
    obj.location = location
    return obj


def cylinder(name, radius, depth, location, mat, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Precision rim", "BEVEL")
    bevel.width = 0.018
    bevel.segments = 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.modifiers.new("Surface normals", "WEIGHTED_NORMAL")
    obj.parent = parent
    obj.location = location
    return obj


def screen(width, height, location, mat, parent):
    bpy.ops.mesh.primitive_plane_add(size=1)
    obj = bpy.context.object
    obj.name = "Screen"
    obj.scale = (width, height, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler.x = math.pi / 2
    obj.data.materials.append(mat)
    obj.parent = parent
    obj.location = location
    obj["role"] = "project-screen"
    obj["aspect"] = width / height
    return obj


def gem(name, mat, parent, location, scale, rotation):
    # Alternating, offset crown cuts make a closed optical solid, not a surface shell.
    sides = 8
    rings = [(-1.35, 0.035, 0), (-0.72, 0.70, 0),
             (0.55, 0.88, 0), (1.12, 0.50, math.pi / 8),
             (1.36, 0.22, math.pi / 8)]
    vertices = []
    for z, radius, offset in rings:
        for i in range(sides):
            angle = i * math.tau / sides + offset
            vertices.append((radius * math.cos(angle), radius * math.sin(angle), z))
    faces = [tuple(reversed(range(sides)))]
    for ring in range(len(rings) - 1):
        for i in range(sides):
            a = ring * sides + i
            b = ring * sides + (i + 1) % sides
            c = (ring + 1) * sides + (i + 1) % sides
            d = (ring + 1) * sides + i
            if ring == 2:
                faces.extend(((a, b, d), (b, c, d)))
            else:
                faces.append((a, b, c, d))
    faces.append(tuple(range((len(rings) - 1) * sides, len(rings) * sides)))
    mesh = bpy.data.meshes.new(name + " cut geometry")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    obj.location = location
    obj.scale = scale
    obj.rotation_euler = rotation
    bevel = obj.modifiers.new("Polished facet edges", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def crystal(mats):
    root = empty("Crystal")
    rotor = empty("CrystalOptics", (0, 0, 1.7), root)
    gem("Signature crystal", mats["glass"], rotor, (0, 0, 0), (1, 0.82, 1), (0.15, -0.28, 0.28))
    gem("Companion cut", mats["glass"], rotor, (0.95, 0.14, -0.66), (0.48, 0.43, 0.62), (0.28, 0.42, -0.2))
    gem("Small cut", mats["glass"], rotor, (-0.8, -0.1, -0.95), (0.36, 0.32, 0.4), (-0.2, -0.5, 0.2))
    cylinder("Satin plinth", 1.48, 0.16, (0, 0, 0.11), mats["metal"], root)
    cylinder("Obsidian insert", 1.35, 0.055, (0, 0, 0.21), mats["black"], root)
    for frame, angle in ((1, 0), (121, math.pi / 2), (241, math.pi), (361, math.pi * 1.5), (481, math.tau)):
        rotor.rotation_euler.z = angle
        rotor.keyframe_insert("rotation_euler", frame=frame)
    rotor.animation_data.action.name = "CrystalTurn"
    bpy.context.scene.frame_set(1)
    return root


def laptop(mats):
    root = empty("Laptop")
    box("Unibody chassis", (3.3, 2.12, 0.12), (0, 0, 0.11), mats["metal"], 0.06, root)
    box("Lower seam", (3.23, 2.06, 0.035), (0, 0, 0.052), mats["black"], 0.03, root)
    box("Trackpad rim", (1.19, 0.65, 0.006), (0, -0.53, 0.174), mats["edge"], 0.03, root)
    box("Trackpad", (1.16, 0.62, 0.009), (0, -0.53, 0.177), mats["metal"], 0.025, root)
    for row in range(5):
        for col in range(13):
            box(f"Key {row:02}-{col:02}", (0.185, 0.145, 0.021),
                (-1.26 + col * 0.21, 0.04 + row * 0.18, 0.182), mats["black"], 0.016, root)
    box("Space key", (1.03, 0.13, 0.022), (0, -0.14, 0.183), mats["black"], 0.017, root)
    for x in (-1.48, 1.48):
        for row in range(15):
            box("Speaker perforation", (0.04, 0.019, 0.003), (x, 0.06 + row * 0.046, 0.174), mats["black"], 0.007, root)
    lid = empty("DisplayHinge", (0, 0.95, 0.17), root)
    box("Display aluminium", (3.28, 0.11, 2.08), (0, 0, 1.03), mats["metal"], 0.06, lid)
    box("Display glass", (3.16, 0.018, 1.97), (0, -0.065, 1.03), mats["black"], 0.04, lid)
    screen(3.02, 1.76, (0, -0.077, 1.03), mats["screen"], lid)
    box("Camera housing", (0.05, 0.008, 0.024), (0, -0.08, 1.99), mats["edge"], 0.009, lid)
    for frame, angle in ((1, math.radians(88)), (60, math.radians(-12)), (90, math.radians(-12))):
        lid.rotation_euler.x = angle
        lid.keyframe_insert("rotation_euler", frame=frame)
    lid.animation_data.action.name = "LaptopOpen"
    bpy.context.scene.frame_set(90)
    return root


def monitor(mats):
    root = empty("Monitor")
    box("Monitor foot", (1.38, 0.9, 0.09), (0, 0, 0.06), mats["metal"], 0.045, root)
    box("Monitor support", (0.31, 0.23, 1.2), (0, 0.18, 0.64), mats["metal"], 0.035, root)
    box("Monitor shell", (3.65, 0.15, 2.25), (0, 0.08, 1.85), mats["metal"], 0.07, root)
    box("Monitor bezel", (3.54, 0.025, 2.14), (0, -0.008, 1.85), mats["black"], 0.05, root)
    screen(3.38, 1.90, (0, -0.024, 1.88), mats["screen"], root)
    return root


def phone(mats):
    root = empty("Phone")
    box("Titanium frame", (1.04, 0.13, 2.13), (0, 0, 1.10), mats["edge"], 0.095, root)
    box("Front glass", (0.99, 0.028, 2.07), (0, -0.074, 1.10), mats["black"], 0.08, root)
    screen(0.90, 1.86, (0, -0.092, 1.10), mats["screen"], root)
    box("Camera island", (0.26, 0.011, 0.072), (0, -0.099, 1.97), mats["black"], 0.034, root)
    box("Power button", (0.021, 0.07, 0.26), (0.525, 0, 1.45), mats["metal"], 0.008, root)
    for z in (1.52, 1.24):
        box("Volume button", (0.02, 0.07, 0.18), (-0.525, 0, z), mats["metal"], 0.008, root)
    return root


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, location, energy, colour, size, target, size_y=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = colour
    data.shape = "RECTANGLE"
    data.size = size
    data.size_y = size_y or size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)
    return obj


def studio(root, kind, appearance, mats, args):
    scene = bpy.context.scene
    light = appearance == "light"
    floor = material("Daylight sweep" if light else "Graphite sweep", (0.73, 0.72, 0.69) if light else (0.012, 0.015, 0.022), roughness=0.28)
    box("Studio sweep", (200, 200, 0.1), (0, 0, -0.10), floor, 0)
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = ((0.72, 0.78, 0.88, 1) if light else (0.07, 0.09, 0.16, 1))
    background.inputs["Strength"].default_value = 0.35 if light else 0.22
    hero = kind == "crystal"
    root.location = (1.25, 0.55, 0) if hero else (0, 0, 0)
    target = tuple(root.location + Vector((0, 0, 1.3)))
    area("Key softbox", (0, -4, 7), 1800 if light else 1400, (0.88, 0.94, 1), 5, target, 3)
    area("Tall reflection strip", (4, 1, 5), 2100, (0.72, 0.81, 1), 1.1, target, 5)
    area("Warm edge", (-3, 3, 3), 1600 if light else 1900, (1, 0.81, 0.65) if light else (0.56, 0.49, 1), 3, target, 5)
    area("Front bounce", (-2, -5, 2), 500, (1, 1, 1), 4, target)
    cam_data = bpy.data.cameras.new("Studio camera")
    camera = bpy.data.objects.new("Studio camera", cam_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (6, -10, 5.5) if hero else (4.8, -8.5, 4.6)
    aim(camera, (0, 0, 1.25) if hero else (0, 0, 1.15))
    cam_data.type = "PERSP"
    cam_data.lens = 49 if hero else 58
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 16
    scene.cycles.transmission_bounces = 12
    try:
        preferences = bpy.context.preferences.addons["cycles"].preferences
        preferences.compute_device_type = "OPTIX"
        preferences.get_devices()
        gpu = [device for device in preferences.devices if device.type == "OPTIX"]
        for device in preferences.devices:
            device.use = device.type == "OPTIX"
        if gpu:
            scene.cycles.device = "GPU"
    except Exception as error:
        print("GPU fallback:", error)
    scene.render.resolution_x = args.width
    scene.render.resolution_y = round(args.width * (0.625 if hero else 0.7))
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.view_settings.view_transform = "AgX"
    scene.render.fps = 24
    scene.frame_end = 481 if hero else 90
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / f"{kind}-{appearance}.blend"))
    if args.render:
        scene.render.filepath = str(RENDERS / f"{kind}-{appearance}.png")
        bpy.ops.render.render(write_still=True)


def build(kind, appearance, args):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    mats = {
        "glass": material("Optical crystal", (0.88, 0.95, 1.0), roughness=0.035, transmission=1),
        "metal": material("Satin aluminium", (0.33, 0.36, 0.41), metallic=0.92, roughness=0.25),
        "edge": material("Polished titanium", (0.46, 0.49, 0.54), metallic=1, roughness=0.16),
        "black": material("Obsidian ceramic", (0.009, 0.012, 0.017), metallic=0.2, roughness=0.24),
        "screen": material("Screen replaceable", (0.035, 0.05, 0.085), metallic=0.05, roughness=0.18),
    }
    root = {"crystal": crystal, "laptop": laptop, "monitor": monitor, "phone": phone}[kind](mats)
    bpy.context.scene.frame_set(1 if kind == "crystal" else 90)
    # Export only model geometry and authored object animation, never photography lights/floor.
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    if appearance == "dark":
        bpy.ops.export_scene.gltf(filepath=str(MODELS / f"{kind}.glb"), export_format="GLB",
                                  use_selection=True, export_animations=True, export_apply=True,
                                  export_materials="EXPORT", export_cameras=False, export_lights=False,
                                  export_yup=True, export_extras=True)
    studio(root, kind, appearance, mats, args)
    print(f"CRYSTAL_ASSET_READY {kind} {appearance}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", choices=["all", "crystal", "laptop", "monitor", "phone"], default="all")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--samples", type=int, default=64)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    for kind in (["crystal", "laptop", "monitor", "phone"] if args.asset == "all" else [args.asset]):
        for appearance in ("dark", "light"):
            build(kind, appearance, args)
