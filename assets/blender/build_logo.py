"""Original selected Crystal Powers identity, authored as editable Blender geometry.

blender --background --factory-startup --python assets/blender/build_logo.py
Outputs are separate from existing website models and artwork.
"""
import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DELIVERY = ROOT / "assets/branding/logo-3d"
SCENE = ROOT / "assets/blender/scenes/crystal-powers-logo-3d.blend"
DELIVERY.mkdir(parents=True, exist_ok=True)
SCENE.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def pigment(name, colour, metallic=0.15, roughness=0.2, luminous=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*colour, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = 0.6
    shader.inputs["Coat Roughness"].default_value = 0.1
    if luminous:
        shader.inputs["Emission Color"].default_value = (*colour, 1)
        shader.inputs["Emission Strength"].default_value = 0.08
    return mat


navy = pigment("01 · Deep sapphire side facets", (0.008, 0.035, 0.19), 0.55)
blue = pigment("02 · Cobalt polished facets", (0.025, 0.18, 0.57), 0.4)
ice = pigment("03 · Ice blue reflective facets", (0.20, 0.61, 0.94), 0.25)
pale = pigment("04 · Pale blue transitions", (0.53, 0.81, 0.98), 0.15)
white = pigment("05 · Luminous white core", (0.90, 0.97, 1), 0.06, 0.18, True)
silver = pigment("06 · White-blue bevel highlights", (0.72, 0.89, 1), 0.65, 0.16)
ink = pigment("07 · Navy enamel lettering", (0.015, 0.075, 0.27), 0.4, 0.24)

root = bpy.data.objects.new("Crystal Powers · complete identity", None)
bpy.context.collection.objects.link(root)
root["design"] = "Selected concept 04: blue faceted crystal with bright white core"
root["brand"] = "Crystal Powers"

# Every front facet is a real plane of the solid; the emblem has a faceted back.
vertices = [(0, -.08, 1.5), (.95, -.1, 0), (0, -.08, -1.5), (-.95, -.1, 0),
            (0, -.35, .80), (.45, -.43, 0), (0, -.35, -.80), (-.45, -.43, 0),
            (0, -.55, 0), (0, .32, 1.44), (.82, .32, 0), (0, .32, -1.44),
            (-.82, .32, 0), (0, .61, 0)]
faces, indices = [], []
for i in range(4):
    j = (i + 1) % 4
    faces.extend([(i, j, 4 + j), (i, 4 + j, 4 + i), (4 + i, 4 + j, 8),
                  (9 + j, 9 + i, 13), (i, 9 + i, 9 + j, j)])
    indices.extend(([2, 1, 4, 0, 1] if i in (0, 3) else [0, 2, 3, 0, 1]))
mesh = bpy.data.meshes.new("Solid diamond · twenty optical facets")
mesh.from_pydata(vertices, [], faces)
mesh.update()
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh)
bm.free()
crystal = bpy.data.objects.new("Signature crystal · solid faceted prism", mesh)
bpy.context.collection.objects.link(crystal)
crystal.parent = root
crystal.location.x = -4.75
for mat in (navy, blue, ice, pale, white, silver):
    mesh.materials.append(mat)
for face, index in zip(mesh.polygons, indices):
    face.material_index = index
bevel = crystal.modifiers.new("Physical edge catches · 8 mm", "BEVEL")
bevel.width, bevel.segments, bevel.limit_method = .008, 3, "NONE"
bevel.material = 5
crystal["role"] = "brand-emblem"

# Segoe UI Semibold is the installed Windows font already used by the card recipe.
font_path = Path("C:/Windows/Fonts/seguisb.ttf")
font = bpy.data.fonts.load(str(font_path)) if font_path.exists() else bpy.data.fonts[0]
if font_path.exists():
    font.pack()
curve = bpy.data.curves.new("Editable exact brand wordmark", "FONT")
curve.body = "Crystal Powers"
curve.font = font
curve.size = 1.45
curve.space_character = 1.05
curve.extrude = .13
curve.bevel_depth = .014
curve.bevel_resolution = 4
curve.resolution_u = 16
text = bpy.data.objects.new("Crystal Powers · editable extruded lettering", curve)
bpy.context.collection.objects.link(text)
text.parent = root
text.rotation_euler.x = math.pi / 2
text.location = (-3.15, -.22, -.5)
curve.materials.append(ink)
bpy.context.view_layer.update()
scale = 8.5 / text.dimensions.x
text.scale = (scale, scale, scale)
text["role"] = "brand-wordmark"
text["lettering"] = "Solid extrusion, rounded light-catching bevels, sapphire enamel"

# A slightly wider silver backing reveals an actual bright chamfer around the text.
back_curve = curve.copy()
back_curve.name = "Editable white-blue lettering backing"
back_curve.offset = .012
back_curve.extrude = .17
back_curve.materials.clear()
back_curve.materials.append(silver)
back = bpy.data.objects.new("Wordmark · reflective bevel backing", back_curve)
bpy.context.collection.objects.link(back)
back.parent = root
back.rotation_euler = text.rotation_euler
back.scale = text.scale
back.location = (text.location.x, .015, text.location.z)


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def light(name, position, power, colour, size, target=(0, 0, 0)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.shape, data.size = power, colour, "DISK", size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    aim(obj, target)


light("Key · broad white softbox", (-3, -8, 6), 1100, (1, .97, .94), 7)
light("Fill · ice blue strip", (5, -5, 2), 800, (.52, .77, 1), 5)
light("Rim · cold edge separation", (-6, 2, 4), 1400, (.65, .84, 1), 4, (-4.75, 0, 0))
light("Lettering · white bevel reflection", (1, -2, -4), 550, (1, 1, 1), 6)
world = bpy.data.worlds.new("Invisible studio environment")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.34, .43, .60, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .32
scene = bpy.context.scene
scene.world = world
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
camera_data = bpy.data.cameras.new("Logo photography · mild three-quarter depth")
camera = bpy.data.objects.new("Camera · complete identity", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (2.0, -24, 5.0)
aim(camera, (-.15, 0, 0))
camera_data.type = "ORTHO"
camera_data.ortho_scale = 13.2
scene.camera = camera
scene.render.resolution_x, scene.render.resolution_y = 2400, 1000
scene.render.resolution_percentage = 100
bpy.ops.wm.save_as_mainfile(filepath=str(SCENE))
scene.render.filepath = str(DELIVERY / "crystal-powers-logo-3d.png")
bpy.ops.render.render(write_still=True)

# Export evaluated mesh copies; native editable text survives in the source scene.
copies = []
for obj in (crystal, text, back):
    copy = obj.copy()
    copy.data = obj.data.copy()
    bpy.context.collection.objects.link(copy)
    copy.name = obj.name + " · web mesh"
    copies.append(copy)
bpy.ops.object.select_all(action="DESELECT")
for obj in copies:
    obj.select_set(True)
bpy.context.view_layer.objects.active = copies[0]
bpy.ops.object.convert(target="MESH")
bpy.ops.export_scene.gltf(filepath=str(DELIVERY / "crystal-powers-logo-3d.glb"),
                          use_selection=True, export_format="GLB", export_animations=False)
for obj in copies:
    bpy.data.objects.remove(obj, do_unlink=True)

text.hide_render = back.hide_render = True
camera.location = (-3.6, -10, 2)
aim(camera, (-4.75, 0, 0))
camera_data.ortho_scale = 3.75
scene.render.resolution_x = scene.render.resolution_y = 1400
scene.render.filepath = str(DELIVERY / "crystal-powers-emblem-3d.png")
bpy.ops.render.render(write_still=True)

text.hide_render = back.hide_render = False
camera.location = (2.0, -24, 5.0)
aim(camera, (-.15, 0, 0))
camera_data.ortho_scale = 13.2
scene.render.resolution_x, scene.render.resolution_y = 2400, 1000
scene.render.filepath = str(DELIVERY / "crystal-powers-logo-3d.png")
bpy.ops.wm.save_as_mainfile(filepath=str(SCENE))
manifest = {"brand": "Crystal Powers", "concept": "04 · bright crystal core",
            "source": str(SCENE.relative_to(ROOT)), "geometry": "Original solid faceted prism and extruded editable lettering",
            "font": "Installed Windows Segoe UI Semibold; packed in native scene, mesh in GLB; no standalone font distribution",
            "render": "Cycles, 48 samples, AgX, RGBA transparent film, four studio softboxes",
            "files": ["crystal-powers-logo-3d.png", "crystal-powers-emblem-3d.png", "crystal-powers-logo-3d.glb"]}
(DELIVERY / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print("Crystal Powers Blender logo completed:", SCENE)
