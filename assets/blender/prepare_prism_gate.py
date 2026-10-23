"""Prepare Prism Gate posters and validate the portable Blender export."""
import json
import struct
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
for pose in ('closed', 'open'):
    path = PUBLIC / 'renders' / f'prism-gate-{pose}.png'
    with Image.open(path) as image:
        assert image.width >= 1600 and image.mode == 'RGBA'
        for width in (800, 1600):
            image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS).save(path.with_name(f'prism-gate-{pose}{"-800" if width == 800 else ""}.webp'), quality=90)
print(f'PRISM_GATE_CONTRACT_PASS: {len(raw)} bytes; four corners, one projector, five animated pivots, packed texture and transparent posters')
