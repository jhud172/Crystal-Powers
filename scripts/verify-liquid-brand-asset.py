"""Validate the generated original signature asset without third-party dependencies."""
import json,struct,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'frontend/public/models/liquid-brand-crystal.glb'
data=path.read_bytes();magic,version,total=struct.unpack_from('<III',data)
assert magic==0x46546c67 and version==2 and total==len(data)
length,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
asset=json.loads(data[20:20+length]);assert len(asset['meshes'])==3
roles={node.get('extras',{}).get('role') for node in asset['nodes']}
assert {'brand-shell','brand-backing','brand-core'}<=roles
assert not any('uri' in buffer for buffer in asset['buffers'])
assert not asset.get('images')
assert not any('KHR_draco_mesh_compression' in primitive.get('extensions',{}) for mesh in asset['meshes'] for primitive in mesh['primitives'])
low=[math.inf]*3;high=[-math.inf]*3;triangles=0
for mesh in asset['meshes']:
 for primitive in mesh['primitives']:
  accessor=asset['accessors'][primitive['attributes']['POSITION']]
  assert accessor['componentType']==5126 and all(math.isfinite(x) for x in accessor['min']+accessor['max'])
  for index in range(3):low[index]=min(low[index],accessor['min'][index]);high[index]=max(high[index],accessor['max'][index])
  triangles+=asset['accessors'][primitive['indices']]['count']//3
extent=[b-a for a,b in zip(low,high)]
assert extent[1]>extent[0]>extent[2],('Upright Y-up portrait, not edge-on',extent)
assert 4.5<extent[1]<5.1 and 2.9<extent[0]<3.5 and extent[2]<1
assert triangles<25000 and len(data)<500000
assert any('COLOR_0' in primitive['attributes'] for mesh in asset['meshes'] for primitive in mesh['primitives'])
png=(root/'frontend/public/renders/liquid-brand-crystal.png').read_bytes()
assert png[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack_from('>II',png,16)==(720,800) and png[25]==6
native=(root/'assets/blender/scenes/liquid-brand-crystal.blend').read_bytes()
assert native[:7]==b'BLENDER' or native[:4]==b'\x28\xb5\x2f\xfd'  # Blender 5 compressed saves use Zstandard.
print('LIQUID_BRAND_ASSET_PASS:',json.dumps({'meshes':3,'triangles':triangles,'bytes':len(data),'extent':extent,'poster':'720x800 RGBA'}))
