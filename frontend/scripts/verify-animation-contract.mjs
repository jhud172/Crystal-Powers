import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modelAnimationNames, openingAnimationNames, selectAnimationName } from '../src/features/experience/animationContract.ts';

// Order changes must never cause the close action to run when opening was requested.
assert.equal(selectAnimationName(['CrystalClose', 'CrystalOpen'], openingAnimationNames.open), 'CrystalOpen');
assert.equal(selectAnimationName(['CrystalOpen', 'CrystalClose'], openingAnimationNames.close), 'CrystalClose');
assert.equal(selectAnimationName(['LegacyAction'], modelAnimationNames.laptop, true), 'LegacyAction');
assert.throws(() => selectAnimationName(['CrystalClose'], openingAnimationNames.open), /Missing authored animation/);
assert.throws(() => selectAnimationName(['WrongA', 'WrongB'], 'CrystalOpen'), /ambiguous/);
assert.throws(() => selectAnimationName([], 'CrystalOpen'), /Missing authored animation/);

for (const model of ['crystal', 'laptop', 'observatory']) {
  const raw = readFileSync(new URL(`../public/models/${model}.glb`, import.meta.url));
  assert.equal(raw.readUInt32LE(0), 0x46546c67);
  const gltf = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)).toString());
  const expected = modelAnimationNames[model];
  const names = gltf.animations.map(clip => clip.name);
  assert.ok(names.includes(expected), `${model} must export ${expected}`);
  if (model === 'observatory') assert.ok(names.includes(openingAnimationNames.close));
  assert.equal(selectAnimationName(names, expected), expected);
  const clip = gltf.animations.find(item => item.name === expected);
  assert.ok(clip.channels.length > 0, `${expected} must target model nodes`);
  for (const sampler of clip.samplers) {
    const input = gltf.accessors[sampler.input];
    assert.ok(input.count > 1 && input.max[0] > input.min[0], `${expected} needs a non-zero duration`);
  }
}
console.log('ANIMATION_CONTRACT_PASS: exact names, reversed order, legacy compatibility, malformed contracts and current GLBs');
