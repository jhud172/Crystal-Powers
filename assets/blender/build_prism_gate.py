"""Prism Gate: original optical corner modules and a tilting diamond projector.
Run in Blender: --background --factory-startup --python assets/blender/build_prism_gate.py
"""
import math, sys, random
from pathlib import Path
import bpy
from mathutils import Vector, Euler
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_assets import SOURCE, MODELS, RENDERS, material, empty, box, area, aim
from build_observatory import mesh, strand

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.fps, scene.frame_start, scene.frame_end = 48, 0, 120
root = empty('PrismGate')
root['design'] = 'Prism Gate / Crystal Powers / precision 02'

def rounded_profile(points, radius=.075, steps=6):
    # Shared quadratic fillets keep the optical body and both guides concentric.
    result=[]
    for i, point in enumerate(points):
        vertex=Vector(point)
        start=vertex+(Vector(points[i-1])-vertex).normalized()*radius
        end=vertex+(Vector(points[(i+1)%len(points)])-vertex).normalized()*radius
        for step in range(steps+1):
            t=step/steps
            result.append(tuple((1-t)**2*start+2*(1-t)*t*vertex+t*t*end))
    return result

def animate(obj, closed, opened, delay=0):
    # Linear baked samples of a minimum-jerk trajectory; one quaternion hinge.
    obj.rotation_mode='QUATERNION'
    first=Euler(closed[1]).to_quaternion()
    last=Euler(opened[1]).to_quaternion()
    obj.animation_data_create()
    for name in ('CrystalOpen','CrystalClose'):
        action=bpy.data.actions.new(f'{name}_{obj.name}')
        obj.animation_data.action=action
        for frame in range(121):
            t=frame/120
            if name=='CrystalClose': t=1-t
            t=min(1,max(0,(t-delay)/(1-delay)))
            eased=t*t*t*(t*(6*t-15)+10)
            obj.location=Vector(closed[0]).lerp(Vector(opened[0]),eased)
            obj.rotation_quaternion=first.slerp(last,eased)
            obj.keyframe_insert(data_path='location',frame=frame)
            obj.keyframe_insert(data_path='rotation_quaternion',frame=frame)
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points: key.interpolation='LINEAR'
        track=obj.animation_data.nla_tracks.new();track.name=name
        track.strips.new(name,0,action);track.mute=True
    obj.animation_data.action=None
    obj.location=closed[0];obj.rotation_quaternion=first
    obj['role']='opening-pivot'

# Packed microfinish, deliberately fine enough to preserve clear optical faces.
rng = random.Random(81)
tex = bpy.data.images.new('Prism precision microfinish', width=256, height=256)
pixels=[]
for y in range(256):
    for x in range(256):
        v=.24 + .012*math.sin(y*2.8) + rng.random()*.008
        pixels.extend((v,v,v,1))
tex.pixels=pixels
tex.colorspace_settings.name='Non-Color'
tex.pack()
glass=material('Platinum-coated quartz',(.88,.95,.99),metallic=.72,roughness=.07)
optics=glass.node_tree.nodes.get('Principled BSDF')
optics.inputs['Coat Weight'].default_value=.25
optics.inputs['Coat Roughness'].default_value=.045
neon_glass=material('Glacial neon glass',(.32,.64,.78),roughness=.12,transmission=.65)
optics=neon_glass.node_tree.nodes.get('Principled BSDF')
optics.inputs['Coat Weight'].default_value=.6
optics.inputs['Coat Roughness'].default_value=.045
optics.inputs['Emission Color'].default_value=(.015,.28,.65,1)
optics.inputs['Emission Strength'].default_value=.10
metal=material('Brushed platinum',(.7,.79,.84),metallic=.94,roughness=.19)
light=material('Ice blue light guides',(.18,.7,1),metallic=.25,roughness=.18)
bs=light.node_tree.nodes.get('Principled BSDF')
bs.inputs['Emission Color'].default_value=(.07,.55,1,1)
bs.inputs['Emission Strength'].default_value=1.35
for mat in (metal,):
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    node=nodes.new('ShaderNodeTexImage'); node.image=tex
    links.new(node.outputs['Color'],nodes.get('Principled BSDF').inputs['Roughness'])
poses=[]
# Camera looks along +Y; authored vertical is Z, converted to Y by glTF.
for sx,sz in ((-1,-1),(1,-1),(-1,1),(1,1)):
    pivot=empty('GateCorner_%s_%s'%(sx,sz),parent=root)
    closed=((sx*.76,0,2.15+sz*.76),(0,0,0))
    opened=((sx*1.02,0,2.15+sz*1.02),(0,0,0))
    # Continuous extruded L profile; no overlapping glass blocks.
    outline=rounded_profile([(-.64,-.64),(.64,-.64),(.64,-.34),(-.34,-.34),(-.34,.64),(-.64,.64)])
    count=len(outline)
    verts=[(-sx*x,y,-sz*z) for y in (-.17,.17) for x,z in outline]
    faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]+[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    part=mesh('OpticalCorner',verts,faces,neon_glass,pivot)
    part['role']='gate-corner'
    bevel=part.modifiers.new('Optical chamfers','BEVEL'); bevel.width=.018; bevel.segments=4
    bpy.context.view_layer.objects.active=part
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    for polygon in part.data.polygons: polygon.use_smooth=True
    normals=part.modifiers.new('Precision normals','WEIGHTED_NORMAL'); normals.keep_sharp=True
    # Continuous neon perimeter on both faces, following the entire corner profile.
    for depth in (-.174,.174):
        points=[(-sx*x,depth,-sz*z) for x,z in outline+[outline[0]]]
        rim=strand('Neon perimeter',points,light,pivot,radius=.0075)
        rim['role']='neon-rim'
    animate(pivot,closed,opened)
    poses.append((pivot,closed,opened))
pivot=empty('DiamondProjectorPivot',parent=root)
# Keep the optical table normal aligned with the viewing axis at rest.
closed=((0,-.04,2.15),(math.pi/2,0,0))
opened=((0,-.08,1.87),(.12,0,0))
# Diamond with flat optical table and cut crown, facing viewer before tilting skywards.
verts=[]
for z,r in ((-.36,.025),(-.04,.62),(.12,.43)):
    for i in range(4):
        a=i*math.tau/4
        verts.append((r*math.cos(a),r*math.sin(a),z))
faces=[(0,3,2,1),(8,9,10,11)]
for ring in range(2):
    for i in range(4):
        a=ring*4+i;b=ring*4+(i+1)%4
        faces.append((a,b,b+4,a+4))
diamond=mesh('ProjectorDiamond',verts,faces,glass,pivot)
diamond['role']='projector-diamond'
box('Projector optical table',(.34,.34,.025),(0,0,.125),metal,.025,pivot)
box('Projector emitter',(.26,.26,.018),(0,0,.145),light,.025,pivot)
animate(pivot,closed,opened,.12);poses.append((pivot,closed,opened))
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for obj in root.children_recursive: obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(MODELS/'prism-gate.glb'),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_animations=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,export_yup=True)
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.25,.3,.4,1)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.45
area('Softbox left',(-3,-4,5),1200,(.8,.92,1),4,(0,0,2.15),5)
area('Softbox right',(4,-1,3),1700,(1,1,1),2,(0,0,2.15),5)
area('Rim',(0,3,5),1500,(.3,.7,1),3,(0,0,2.15),4)
data=bpy.data.cameras.new('PrismCamera');camera=bpy.data.objects.new('PrismCamera',data);bpy.context.collection.objects.link(camera)
camera.location=(0,-9,2.15);aim(camera,(0,0,2.15));data.type='ORTHO';data.ortho_scale=4.7;scene.camera=camera
for label,index in (('closed',1),('open',2)):
    for obj,rest,opened in poses:
        pose=(rest,opened)[index-1]
        obj.location=pose[0];obj.rotation_quaternion=Euler(pose[1]).to_quaternion()
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f'prism-gate-{label}.blend'))
    scene.render.filepath=str(RENDERS/f'prism-gate-{label}.png')
    bpy.ops.render.render(write_still=True)
print('PRISM_GATE_READY')
