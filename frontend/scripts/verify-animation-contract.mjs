import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modelAnimationNames, openingAnimationNames, selectAnimationName } from '../src/features/experience/animationContract.ts';
import { advanceCrystalMotion } from '../src/features/experience/crystalMotion.ts';
import { PRISM_PULSE_DURATION, prismPulseEnergy } from '../src/features/experience/prismPulse.ts';

// Brightness remains bounded, reaches its peak, and settles at the same wall-clock time.
for (const fps of [15, 30, 60, 120]) {
  const values = Array.from({ length: Math.ceil(PRISM_PULSE_DURATION * fps) + 1 }, (_, i) => prismPulseEnergy(i / fps));
  assert.equal(values[0], 0);
  assert.ok(values.every(value => value >= 0 && value <= 1));
  assert.ok(Math.max(...values) > .999);
  assert.equal(values.at(-1), 0);
}
assert.equal(prismPulseEnergy(.9), 1);
assert.equal(prismPulseEnergy(10), 0, 'A suspended pulse must settle instead of flashing on return');
for (const elapsed of [.2, .8, 1.5, 2.2]) {
  const brightness = prismPulseEnergy(elapsed);
  assert.equal(prismPulseEnergy(0, brightness), brightness, 'Retriggering must preserve current brightness');
  assert.ok(prismPulseEnergy(.001, brightness) - brightness < .000001, 'The attack should start gently');
}

// Mid-gesture reversal must preserve pose, stay bounded and finish at either refresh rate.
for (const fps of [10, 30, 60, 120]) {
  let state = { time: 0, speed: 0, finished: false };
  const step = direction => { state = advanceCrystalMotion(state.time, state.speed, direction, 2.375, 1 / fps); };
  for (let i = 0; i < fps; i++) step(1);
  const previous = state.time;
  step(-1);
  assert.ok(Math.abs(state.time - previous) <= 1 / fps, 'Reversal must not jump to a clip endpoint');
  for (let i = 0; i < fps * 3; i++) step(-1);
  assert.equal(state.time, 0);
  assert.equal(state.finished, true);
  for (let i = 0; i < fps * 3; i++) step(1);
  assert.equal(state.time, 2.375);
  assert.equal(state.finished, true);
}
assert.ok(advanceCrystalMotion(1, 1, 1, 2.375, 30).time <= 1.1, 'Resume after suspension must cap the frame delta');

// Order changes must never cause the close action to run when opening was requested.
assert.equal(selectAnimationName(['CrystalClose', 'CrystalOpen'], openingAnimationNames.open), 'CrystalOpen');
assert.equal(selectAnimationName(['CrystalOpen', 'CrystalClose'], openingAnimationNames.close), 'CrystalClose');
assert.equal(selectAnimationName(['LegacyAction'], modelAnimationNames.laptop, true), 'LegacyAction');
assert.throws(() => selectAnimationName(['CrystalClose'], openingAnimationNames.open), /Missing authored animation/);
assert.throws(() => selectAnimationName(['WrongA', 'WrongB'], 'CrystalOpen'), /ambiguous/);
assert.throws(() => selectAnimationName([], 'CrystalOpen'), /Missing authored animation/);

for (const model of ['crystal', 'laptop', 'observatory', 'prism-gate']) {
  const raw = readFileSync(new URL(`../public/models/${model}.glb`, import.meta.url));
  assert.equal(raw.readUInt32LE(0), 0x46546c67);
  const gltf = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)).toString());
  const expected = modelAnimationNames[model];
  const names = gltf.animations.map(clip => clip.name);
  assert.ok(names.includes(expected), `${model} must export ${expected}`);
  if (model === 'observatory' || model === 'prism-gate') assert.ok(names.includes(openingAnimationNames.close));
  assert.equal(selectAnimationName(names, expected), expected);
  const clip = gltf.animations.find(item => item.name === expected);
  assert.ok(clip.channels.length > 0, `${expected} must target model nodes`);
  for (const sampler of clip.samplers) {
    const input = gltf.accessors[sampler.input];
    assert.ok(input.count > 1 && input.max[0] > input.min[0], `${expected} needs a non-zero duration`);
  }
}
console.log('ANIMATION_CONTRACT_PASS: exact names, reversed order, legacy compatibility, malformed contracts and current GLBs');
