"""Original Liquid Light emblem, traced from the site's SVG cubic silhouettes.
Blender --background --factory-startup --python assets/blender/build_liquid_brand.py
No downloaded meshes/textures. Web coordinates: X right, Y up, Z towards camera.
"""
import math, json
from pathlib import Path
import bpy, bmesh
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
MODELS=ROOT/'frontend/public/models'; RENDERS=ROOT/'frontend/public/renders'; SOURCE=ROOT/'assets/blender/scenes'
for folder in (MODELS,RENDERS,SOURCE): folder.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
outer=[[(48,4),(54,4),(86,43),(86,59)],[(86,59),(86,75),(55,116),(48,116)],[(48,116),(41,116),(10,75),(10,59)],[(10,59),(10,43),(42,4),(48,4)]]
inner=[[(48,19),(53,19),(72,48),(72,59)],[(72,59),(72,70),(53,101),(48,101)],[(48,101),(43,101),(24,70),(24,59)],[(24,59),(24,48),(43,19),(48,19)]]
core=[[(48,31),(51,31),(62,51),(62,60)],[(62,60),(62,69),(51,91),(48,91)],[(48,91),(45,91),(34,69),(34,60)],[(34,60),(34,51),(45,31),(48,31)]]
def sample(curves):
 points=[]
 for curve in curves:
  for step in range(32):
   t=step/32;u=1-t
   p=[u**3*curve[0][i]+3*u*u*t*curve[1][i]+3*u*t*t*curve[2][i]+t**3*curve[3][i] for i in (0,1)]
   points.append(((p[0]-48)*.042,(60-p[1])*.042))
 return points

def material(name,colour,transmission):
 m=bpy.data.materials.new(name);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*colour,1)
 bs.inputs['Roughness'].default_value=.10;bs.inputs['Metallic'].default_value=.08
 bs.inputs['Transmission Weight'].default_value=transmission;bs.inputs['IOR'].default_value=1.46
 bs.inputs['Coat Weight'].default_value=1;bs.inputs['Coat Roughness'].default_value=.06
 return m
shell=material('Liquid signature / cyan to violet optical shell',(.68,.89,1),.48)
back=material('Liquid signature / violet reverse coating',(.42,.36,.8),.24)
heart=material('Liquid signature / luminous mint heart',(.64,1,.92),.36)
heart.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.22,.8,.76,1)
heart.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.13
objects=[]
def mesh(name,vertices,faces,mat,role,bevel):
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);data.update()
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);data.materials.append(mat);obj['role']=role
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 mod=obj.modifiers.new('Soft optical edge / continuous radius','BEVEL');mod.width=bevel;mod.segments=5
 bpy.ops.object.modifier_apply(modifier=mod.name)
 for face in data.polygons: face.use_smooth=True
 normals=obj.modifiers.new('Weighted optical normals','WEIGHTED_NORMAL');normals.keep_sharp=True
 bpy.ops.object.modifier_apply(modifier=normals.name)
 obj.select_set(False);objects.append(obj);return obj

def ring(name,z,thickness,mat,role):
 a,b=sample(outer),sample(inner);n=len(a)
 vertices=[(x,y,z+d) for d in (-thickness/2,thickness/2) for contour in (a,b) for x,y in contour]
 faces=[]
 for i in range(n):
  j=(i+1)%n
  faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
 return mesh(name,vertices,faces,mat,role,min(.045,thickness*.22))
ring('Signature shell / exact SVG silhouette',.10,.32,shell,'brand-shell')
ring('Optical backing / violet inner reflection',-.13,.08,back,'brand-backing')
c=sample(core);n=len(c)
vertices=[(x,y,-.03) for x,y in c]+[(x*.86,y*.96,.25) for x,y in c]+[(0,0,.43),(0,0,-.15)]
faces=[]
for i in range(n):
 j=(i+1)%n;faces.extend([(i,j,n+j,n+i),(n+i,n+j,2*n),(j,i,2*n+1)])
mesh('Floating heart / softly faceted crystal',vertices,faces,heart,'brand-core',.025)
# Bake the signature gradient as vertex colour; no texture fetch or third-party HDRI.
obj=objects[0];attribute=obj.data.color_attributes.new(name='SignatureGradient',type='FLOAT_COLOR',domain='CORNER')
stops=[(0,(.58,.36,.95)),(.3,(.36,.42,.94)),(.65,(.30,.77,.88)),(1,(.76,1,1))]
for polygon in obj.data.polygons:
 for loop in polygon.loop_indices:
  y=obj.data.vertices[obj.data.loops[loop].vertex_index].co.z;t=max(0,min(1,(y+2.35)/4.7))
  lo,hi=next(((a,b) for a,b in zip(stops,stops[1:]) if a[0]<=t<=b[0]),(stops[-2],stops[-1]))
  f=(t-lo[0])/(hi[0]-lo[0]);attribute.data[loop].color=tuple(lo[1][k]*(1-f)+hi[1][k]*f for k in range(3))+(1,)
node=shell.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name=attribute.name
shell.node_tree.links.new(node.outputs['Color'],shell.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(MODELS/'liquid-brand-crystal.glb'),use_selection=True,export_format='GLB',export_animations=False,export_extras=True)
# Editable studio rig and a transparent, front-facing fallback photograph.
def aim(obj,target=(0,0,0)):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for name,location,energy,size,colour in [('Key',(-3,4,6),650,4,(.8,.95,1)),('Rim',(3,1,4),850,3,(.55,.65,1)),('Fill',(0,-3,5),350,3,(.9,.7,1))]:
 light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.shape='DISK';light.size=size;light.color=colour
 obj=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(obj);obj.location=(location[0],-location[2],location[1]);aim(obj)
camera=bpy.data.cameras.new('Signature portrait');obj=bpy.data.objects.new('Signature portrait',camera);bpy.context.collection.objects.link(obj);obj.location=(0,-12,0);aim(obj);camera.type='ORTHO';camera.ortho_scale=5.8;scene.camera=obj
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.world.color=(.28,.28,.28);scene.render.film_transparent=True
scene.render.resolution_x=720;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.filepath=str(RENDERS/'liquid-brand-crystal.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'liquid-brand-crystal.blend'))
bpy.ops.render.render(write_still=True)
print('LIQUID_BRAND_BUILT',json.dumps({'meshes':len(objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects),'bytes':(MODELS/'liquid-brand-crystal.glb').stat().st_size}))
