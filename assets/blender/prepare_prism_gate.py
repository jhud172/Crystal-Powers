"""Prepare Prism Gate posters and validate the portable Blender export."""
import json
import struct
import math
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'frontend/public'
raw = (PUBLIC / 'models/prism-gate.glb').read_bytes()
assert struct.unpack_from('<III', raw) == (0x46546C67, 2, len(raw))
gltf = json.loads(raw[20:20 + struct.unpack_from('<I', raw, 12)[0]])
roles = [node.get('extras', {}).get('role') for node in gltf['nodes']]
assert roles.count('gate-corner') == 4
assert roles.count('projector-diamond') == 1
assert roles.count('opening-pivot') == 5
assert roles.count('neon-rim') == 8
assert len(raw) < 5 * 1024 * 1024
assert all('bufferView' in image for image in gltf['images'])
materials = {material['name']: material for material in gltf['materials']}
neon = materials['Glacial neon glass']
assert neon['extensions']['KHR_materials_transmission']['transmissionFactor'] > .5
assert neon['emissiveFactor'][2] > neon['emissiveFactor'][0]
coating = materials['Platinum-coated quartz']
assert coating['pbrMetallicRoughness']['metallicFactor'] >= .7
assert 'KHR_materials_transmission' not in coating.get('extensions', {})
finish = materials['Brushed platinum']['pbrMetallicRoughness']
assert 'metallicRoughnessTexture' in finish and 'baseColorTexture' not in finish
assert {'CrystalOpen', 'CrystalClose'} == {clip['name'] for clip in gltf['animations']}
for clip in gltf['animations']:
    assert len({channel['target']['node'] for channel in clip['channels']}) == 5
    for channel in clip['channels']:
        assert gltf['nodes'][channel['target']['node']]['extras']['role'] == 'opening-pivot'
# Read actual exported samples: reject non-finite transforms, flips and mismatched reversal.
binary_start=20+struct.unpack_from('<I',raw,12)[0]+8
binary=raw[binary_start:]
def values(index):
    accessor=gltf['accessors'][index]
    view=gltf['bufferViews'][accessor['bufferView']]
    assert accessor['componentType']==5126
    size={'SCALAR':1,'VEC3':3,'VEC4':4}[accessor['type']]
    stride=view.get('byteStride',size*4)
    offset=view.get('byteOffset',0)+accessor.get('byteOffset',0)
    return [struct.unpack_from('<'+'f'*size,binary,offset+i*stride) for i in range(accessor['count'])]
clips={clip['name']:clip for clip in gltf['animations']}
paths={}
for name,clip in clips.items():
    paths[name]={}
    for channel in clip['channels']:
        sampler=clip['samplers'][channel['sampler']]
        times=values(sampler['input']); samples=values(sampler['output'])
        assert len(samples)==len(times) and len(times)>=100
        assert abs(times[0][0])<1e-5 and abs(times[-1][0]-2.5)<1e-5
        assert all(a[0]<b[0] for a,b in zip(times,times[1:]))
        assert all(math.isfinite(v) for row in samples for v in row)
        kind=channel['target']['path']
        if kind=='rotation':
            assert all(abs(sum(v*v for v in row)-1)<1e-4 for row in samples)
            assert all(abs(sum(x*y for x,y in zip(a,b)))>.999 for a,b in zip(samples,samples[1:])), 'Sudden quaternion rotation'
        if kind=='translation':
            assert all(math.dist(a,b)<.03 for a,b in zip(samples,samples[1:])), 'Sudden translation'
        paths[name][(channel['target']['node'],kind)]=samples
assert paths['CrystalOpen'].keys()==paths['CrystalClose'].keys()
for key,opening in paths['CrystalOpen'].items():
    closing=paths['CrystalClose'][key]
    assert all(math.dist(a,b)<1e-5 or key[1]=='rotation' and math.dist(a,tuple(-v for v in b))<1e-5 for a,b in zip(opening,reversed(closing))), 'Open/close path mismatch'
for pose in ('closed', 'open'):
    path = PUBLIC / 'renders' / f'prism-gate-{pose}.png'
    with Image.open(path) as image:
        assert image.width >= 1600 and image.mode == 'RGBA'
        for width in (800, 1600):
            image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS).save(path.with_name(f'prism-gate-{pose}{"-800" if width == 800 else ""}.webp'), quality=90)
print(f'PRISM_GATE_CONTRACT_PASS: {len(raw)} bytes; four corners, one projector, five animated pivots, packed texture and transparent posters')
