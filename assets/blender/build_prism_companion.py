"""Original Prism robot. Run with Blender --background --python this-file."""
import bpy, math
from pathlib import Path
root=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name, colour, metal=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*colour,1); m.use_nodes=True
 s=m.node_tree.nodes.get('Principled BSDF'); s.inputs['Base Color'].default_value=(*colour,1); s.inputs['Metallic'].default_value=metal; s.inputs['Roughness'].default_value=.28
 return m
shell=mat('Pearl ceramic',(.7,.79,.88),.35); dark=mat('Midnight visor',(.015,.028,.05),.5); glow=mat('Crystal cyan',(.15,.85,.8),.4)
s=glow.node_tree.nodes.get('Principled BSDF'); s.inputs['Emission Color'].default_value=(.15,.85,.8,1); s.inputs['Emission Strength'].default_value=2
bpy.ops.object.empty_add(); rig=bpy.context.object; rig.name='Prism'
def part(name,loc,scale,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc); o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(material); o.parent=rig
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=True
 return o
body=part('Body',(0,0,0),(.48,.32,.6),shell)
head=part('Head',(0,0,.87),(.65,.38,.45),shell)
part('Visor',(0,-.31,.9),(.54,.12,.29),dark)
for x in [-.23,.23]:part('Eye',(x,-.423,.95),(.075,.025,.1),glow)
part('Smile',(0,-.425,.78),(.11,.02,.025),glow)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.23,location=(0,-.31,.05)); core=bpy.context.object; core.name='CrystalCore'; core.scale=(.75,.55,1.4); core.data.materials.append(glow); core.parent=rig
arms=[part('ArmLeft',(-.67,0,.1),(.15,.18,.4),shell),part('ArmRight',(.67,0,.1),(.15,.18,.4),shell)]
part('Antenna',(0,0,1.4),(.045,.045,.15),shell); part('Beacon',(0,0,1.57),(.09,.09,.09),glow)
for name,axis,amount in [('Wave',1,.8),('Point',1,1.2),('Nod',0,.2),('Thinking',2,.18),('Dock',2,.35)]:
 obj=arms[1] if name in ['Wave','Point'] else head if name in ['Nod','Thinking'] else rig
 obj.rotation_euler=(0,0,0)
 for frame,value in [(1,0),(12,amount),(24,-amount/3),(36,amount/2),(48,0)]:
  obj.rotation_euler[axis]=value; obj.keyframe_insert(data_path='rotation_euler',frame=frame)
 action=obj.animation_data.action; action.name=name
 track=obj.animation_data.nla_tracks.new(); track.name=name; track.strips.new(name,1,action); obj.animation_data.action=None
 obj.rotation_euler=(0,0,0)
for obj in list(bpy.data.objects):
 if obj.name.startswith(('Eye','Visor','Smile','Antenna','Beacon')):
  world=obj.matrix_world.copy(); obj.parent=head; obj.matrix_world=world
out=root/'frontend/public/models/prism-companion.glb'; out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS')
# Matching transparent portrait for compact/reduced-motion presentation.
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=384; scene.render.resolution_y=384; scene.render.resolution_percentage=100; scene.render.film_transparent=True
bpy.ops.object.camera_add(location=(2,-6,2.1)); camera=bpy.context.object
from mathutils import Vector
camera.rotation_euler=(Vector((0,0,.5))-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.type='ORTHO'; camera.data.ortho_scale=3.1; scene.camera=camera
for loc,power,size in [((2,-4,5),700,5),((-3,-1,2),450,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.data.energy=power; l.data.shape='DISK'; l.data.size=size; l.rotation_euler=(Vector((0,0,.5))-l.location).to_track_quat('-Z','Y').to_euler()
scene.frame_set(1)
scene.render.filepath=str(root/'frontend/public/renders/prism-companion.png'); bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/blender/scenes/prism-companion.blend'))

scene.render.resolution_x=192; scene.render.resolution_y=192
for obj in bpy.data.objects:
 if obj.animation_data:
  for track in obj.animation_data.nla_tracks:track.mute=track.name!='Wave'
frames=root/'.codex-runtime/prism-frames'; frames.mkdir(parents=True,exist_ok=True)
for frame in [1,8,16,24,32,40,48]:
 scene.frame_set(frame); scene.render.filepath=str(frames/f'{frame}.png'); bpy.ops.render.render(write_still=True)
