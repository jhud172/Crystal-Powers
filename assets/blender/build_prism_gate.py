"""Prism Gate: original optical corner modules and a tilting diamond projector.
Run in Blender: --background --factory-startup --python assets/blender/build_prism_gate.py
"""
import math, sys, random
from pathlib import Path
import bpy
from mathutils import Vector, Euler
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_assets import SOURCE, MODELS, RENDERS, material, empty, box, area, aim
from build_observatory import mesh

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.fps, scene.frame_start, scene.frame_end = 48, 0, 120
root = empty('PrismGate')
root['design'] = 'Prism Gate / Crystal Powers / optical liquid glass 06'

def rounded_profile(points, radii, steps=12):
    # Broad inner bends and capsule ends are shared by every depth ring.
    result=[]
    for i, point in enumerate(points):
        vertex=Vector(point)
        radius=radii[i]
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
neon_glass=material('Glacial neon glass',(.88,.97,1),roughness=.035,transmission=.96)
optics=neon_glass.node_tree.nodes.get('Principled BSDF')
optics.inputs['Coat Weight'].default_value=1
optics.inputs['Alpha'].default_value=.86
optics.inputs['IOR'].default_value=1.5
# Dense grazing edges and clear faces match the browser's optical shell.
fresnel=neon_glass.node_tree.nodes.new('ShaderNodeFresnel')
fresnel.inputs['IOR'].default_value=1.5
edge_alpha=neon_glass.node_tree.nodes.new('ShaderNodeMath');edge_alpha.operation='MULTIPLY_ADD'
edge_alpha.inputs[1].default_value=.66;edge_alpha.inputs[2].default_value=.20
neon_glass.node_tree.links.new(fresnel.outputs[0],edge_alpha.inputs[0])
alpha_link=neon_glass.node_tree.links.new(edge_alpha.outputs[0],optics.inputs['Alpha'])
neon_glass.surface_render_method='DITHERED'
optics.inputs['Coat Roughness'].default_value=.025
optics.inputs['Emission Color'].default_value=(.025,.22,.38,1)
optics.inputs['Emission Strength'].default_value=.08
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
    # A continuous rounded volume, not a bevelled rectangular extrusion.
    # Elliptical depth rings roll the sides into the front/back optical faces.
    verts=[]
    depths=(-.17,-.168,-.16,-.14,-.105,-.055,0,.055,.105,.14,.16,.168,.17)
    for depth in depths:
        inset=.075*(1-math.sqrt(max(0,1-(depth/.17)**2)))
        lo=-.64+inset; hi=.64-inset; inner=-.34-inset
        end_radius=(.30-2*inset)*.49
        outline=rounded_profile([(lo,lo),(hi,lo),(hi,inner),(inner,inner),(inner,hi),(lo,hi)],
                                [.28-inset,end_radius,end_radius,.24+inset,end_radius,end_radius])
        verts.extend((-sx*x,depth,-sz*z) for x,z in outline)
    count=len(outline)
    faces=[tuple(reversed(range(count))),tuple(range((len(depths)-1)*count,len(depths)*count))]
    for ring in range(len(depths)-1):
        for i in range(count):
            j=(i+1)%count
            faces.append((ring*count+i,ring*count+j,(ring+1)*count+j,(ring+1)*count+i))
    part=mesh('LiquidGlassCorner',verts,faces,neon_glass,pivot)
    part['role']='gate-corner'
    part['finish']='Continuous pillow-rounded glass; no rim or outline geometry'
    for polygon in part.data.polygons: polygon.use_smooth=polygon.index>=2
    animate(pivot,closed,opened)
    poses.append((pivot,closed,opened))
pivot=empty('DiamondProjectorPivot',parent=root)
# Keep the optical table normal aligned with the viewing axis at rest.
closed=((0,-.04,2.15),(math.pi/2,0,0))
opened=((0,-.08,1.05),(.12,0,0))
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
# glTF cannot export a view-dependent alpha node graph; runtime owns that shell.
neon_glass.node_tree.links.remove(alpha_link)
bpy.ops.export_scene.gltf(filepath=str(MODELS/'prism-gate.glb'),export_format='GLB',use_selection=True,export_animation_mode='NLA_TRACKS',export_animations=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,export_yup=True)
neon_glass.node_tree.links.new(edge_alpha.outputs[0],optics.inputs['Alpha'])
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
