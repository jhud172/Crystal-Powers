/* Behavioural policy checks against the actual TypeScript source, without a GPU claim. */
const assert = require('node:assert/strict'); const fs = require('node:fs'); const vm = require('node:vm');
const ts = require('../frontend/node_modules/typescript');
const source = fs.readFileSync('frontend/src/features/experience/adaptiveRenderQuality.ts', 'utf8');
const moduleScope = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: moduleScope.exports });
const { AdaptiveRenderQuality } = moduleScope.exports;
let checks = 0;
function check(name, value) { assert.ok(value, name); checks++; }
function simulate(tier, intervals) {
  const policy = new AdaptiveRenderQuality(tier, 0); let now = 0; const changes = [];
  for (const interval of intervals) { now += interval; const next = policy.sample(interval, now); if (next) changes.push({ next, now }); }
  return { policy, changes };
}
const warm = simulate('standard', Array(40).fill(33));
check('Warmup does not classify shader/startup work', warm.changes.length === 0);
const slow = simulate('standard', Array(250).fill(33));
check('Sustained slow animation downshifts', slow.policy.tier === 'low' && slow.changes.length === 1);
const severe = simulate('high', Array(700).fill(100));
check('Severely slow continuous frames reach lighter detail', severe.policy.tier === 'low');
check('Downshift cooldown separates expensive material transitions', severe.changes[1].now - severe.changes[0].now >= 8000);
const fast = simulate('low', Array(2000).fill(16.7));
check('Sustained fast animation can recover to richest tier', fast.policy.tier === 'high');
check('Recovery cooldown prevents immediate escalation', fast.changes[1].now - fast.changes[0].now >= 12000);
check('Fast recovery needs multiple complete windows', fast.changes[0].now >= 9000);
check('Moderate cadence keeps existing detail', simulate('standard', Array(800).fill(23)).changes.length === 0);
const idle = simulate('high', Array(100).fill(1000));
check('Idle demand gaps never cause downshift', idle.changes.length === 0 && idle.policy.tier === 'high');
const bursts = []; for (let i = 0; i < 30; i++) bursts.push(...Array(40).fill(16.7), 1000);
check('Separate short interactions are not sustained headroom', simulate('low', bursts).changes.length === 0);
const jitter = []; for (let i = 0; i < 600; i++) jitter.push(i % 80 === 0 ? 100 : 16.7);
check('Occasional isolated stall does not lower high quality', simulate('high', jitter).changes.length === 0);
const invalid = new AdaptiveRenderQuality('standard', 0);
check('Non-finite samples are harmless', [NaN, Infinity, -Infinity].every(value => invalid.sample(value, 10000) === null) && invalid.tier === 'standard');
console.log('ADAPTIVE_QUALITY_PASS:', checks, 'checks');
