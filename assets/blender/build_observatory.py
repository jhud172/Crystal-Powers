"""Original segmented Crystal Observatory. No external geometry or textures.

Blender --background --factory-startup --python assets/blender/build_observatory.py
Optional: -- --render --width 1600 --samples 48
The legacy crystal/device outputs are preserved.
"""
import argparse
import math
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
    return obj


def animate(obj, closed, opened):
    """Matching NLA track names combine per-part actions into two GLB clips."""
    obj.animation_data_create()
    for name, start, end in (("CrystalOpen", closed, opened), ("CrystalClose", opened, closed)):
        action = bpy.data.actions.new(f"{name}_{obj.name}")
        obj.animation_data.action = action
        for frame, fraction in ((1, 0), (8, 0.06), (27, 0.94), (34, 1)):
            obj.location = Vector(start[0]).lerp(Vector(end[0]), fraction)
            obj.rotation_euler = tuple(a + (b - a) * fraction for a, b in zip(start[1], end[1]))
            obj.keyframe_insert(data_path="location", frame=frame)
            obj.keyframe_insert(data_path="rotation_euler", frame=frame)
        track = obj.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        track.mute = True
    obj.animation_data.action = None
    obj.location, obj.rotation_euler = closed
    obj["role"] = "opening-pivot"


def geometry():
    root = empty("CrystalObservatory")
    root["provenance"] = "Original Crystal Powers geometry; build_observatory.py"
    root["units"] = "metres"
    root["openingDuration"] = 33 / 24
    glass = material("Observatory optical glass", (0.79, 0.91, 1), roughness=0.08, transmission=0.82)
    metal = material("Observatory titanium", (0.38, 0.43, 0.51), metallic=0.85, roughness=0.23)
    ceramic = material("Observatory ceramic", (0.035, 0.048, 0.075), metallic=0.3, roughness=0.3)
    core_mat = material("Observatory luminous core", (0.5, 0.8, 1), metallic=0.2, roughness=0.19)
    shader = core_mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Emission Color"].default_value = (0.35, 0.68, 1, 1)
    shader.inputs["Emission Strength"].default_value = 0.55
    centre = (0, 0, 2.15)
    poses = []
    for index in range(8):
        angle = index * math.tau / 8
        pivot = empty(f"FacetPivot_{index:02d}", centre, root)
        vertices = []
        for radius, z in ((0.05, -1.25), (0.82, -0.35), (0.68, 0.65), (0.035, 1.5)):
            vertices.extend([(radius * math.cos(angle - 0.38), radius * math.sin(angle - 0.38), z),
                             (radius * math.cos(angle + 0.38), radius * math.sin(angle + 0.38), z),
                             (0.025 * math.cos(angle), 0.025 * math.sin(angle), z)])
        faces = [(0, 2, 1), (9, 10, 11)]
        for ring in range(3):
            for edge in range(3):
                a, b = ring * 3 + edge, ring * 3 + (edge + 1) % 3
                faces.append((a, b, b + 3, a + 3))
        facet = mesh(f"OpticalFacet_{index:02d}", vertices, faces, glass, pivot)
        facet["role"] = "crystal-facet"
        closed = (centre, (0, 0, 0))
        opened = ((1.12 * math.cos(angle), 1.12 * math.sin(angle), centre[2] + 0.12),
                  (0.12 * math.sin(angle), -0.12 * math.cos(angle), 0.12))
        animate(pivot, closed, opened)
        poses.append((pivot, closed, opened))
    core_pivot = empty("CorePivot", centre, root)
    mesh("LuminousCore", [(0, 0, 0.75), (0, 0, -0.75), (0.3, 0, 0), (0, 0.3, 0), (-0.3, 0, 0), (0, -0.3, 0)],
         [(0, 2, 3), (0, 3, 4), (0, 4, 5), (0, 5, 2), (1, 3, 2), (1, 4, 3), (1, 5, 4), (1, 2, 5)], core_mat, core_pivot)
    for index in range(8):
        angle = index * math.tau / 8 + math.pi / 8
        x, z = 2.1 * math.cos(angle), 2.1 * math.sin(angle)
        pivot = empty(f"FramePivot_{index:02d}", (x, 0.38, centre[2] + z), root)
        rail = box(f"FrameRail_{index:02d}", (1.56, 0.17, 0.11), (0, 0, 0), metal, 0.025, pivot)
        rail.rotation_euler.y = math.pi / 2 - angle
        insert = box(f"FrameInsert_{index:02d}", (1.16, 0.045, 0.027), (0, -0.095, 0), ceramic, 0.008, pivot)
        insert.rotation_euler.y = rail.rotation_euler.y
        closed = (tuple(pivot.location), (0, 0, 0))
        opened = ((x * 1.13, 0.48, centre[2] + z * 1.13), (0, 0, 0))
        animate(pivot, closed, opened)
        poses.append((pivot, closed, opened))
    box("ObservatoryPlinth", (2.7, 1.8, 0.18), (0, 0.2, 0.08), ceramic, 0.06, root)
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
    scene.render.fps, scene.frame_start, scene.frame_end = 24, 1, 34
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
