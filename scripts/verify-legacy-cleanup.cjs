/* Independent compiled-code/CSS/asset comparison against the reviewed pre-cleanup control. */
const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const postcss = require('../frontend/node_modules/postcss');
const root = path.resolve(__dirname, '..'), qa = path.join(root, '.codex-runtime/qa/reachability-pc');
const baseline = JSON.parse(fs.readFileSync(path.join(qa, 'baseline-artifacts.json'), 'utf8'));
const before = path.join(qa, 'before-dist'), after = path.join(root, 'frontend/dist');
const stems = ['vendor-react', 'vendor-three', 'BirthdayMission', 'ModelCanvas', 'Admin', 'index'];
function normalise(text) { for (const stem of stems) text = text.replace(new RegExp(stem + '-[A-Za-z0-9_-]+\\.(js|css)', 'g'), (_, extension) => stem + '.' + extension); return text; }
function artifact(directory, stem, extension) { const matches = fs.readdirSync(path.join(directory, 'assets')).filter(name => name.startsWith(stem + '-') && name.endsWith(extension)); assert.equal(matches.length, 1); return path.join(directory, 'assets', matches[0]); }
const report = { equivalentChunks: [], preservedAssets: 0, removedCssRules: [], changedCssRules: [], addedCssRules: [] };
for (const [name, sha] of Object.entries(baseline)) if (name.startsWith('frontend/dist/')) {
  const file = path.join(before, name.slice('frontend/dist/'.length));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), sha, 'Reviewed control changed: ' + name);
}
for (const [name, sha] of Object.entries(baseline)) if (!name.startsWith('frontend/dist/')) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex'), sha, name); report.preservedAssets++;
}
for (const stem of stems) {
  assert.equal(normalise(fs.readFileSync(artifact(before, stem, '.js'), 'utf8')), normalise(fs.readFileSync(artifact(after, stem, '.js'), 'utf8')), stem); report.equivalentChunks.push(stem);
}
assert.equal(normalise(fs.readFileSync(path.join(before, 'index.html'), 'utf8')), normalise(fs.readFileSync(path.join(after, 'index.html'), 'utf8')));
function rules(file) {
  const result = new Map();
  postcss.parse(fs.readFileSync(file, 'utf8')).walkRules(rule => {
    const parents = []; for (let parent = rule.parent; parent?.type === 'atrule'; parent = parent.parent) parents.unshift('@' + parent.name + ' ' + parent.params);
    const declarations = rule.nodes.map(node => node.toString()).join(';');
    for (const selector of postcss.list.comma(rule.selector)) { const key = [...parents, selector].join(' > '); result.set(key, (result.get(key) || '') + declarations); }
  }); return result;
}
const oldRules = rules(artifact(before, 'index', '.css')), newRules = rules(artifact(after, 'index', '.css'));
for (const [selector, declarations] of oldRules) {
  if (!newRules.has(selector)) report.removedCssRules.push({ selector, declarations });
  else if (newRules.get(selector) !== declarations) report.changedCssRules.push(selector);
}
assert.equal(report.changedCssRules.length, 0, 'Retained CSS declarations changed');
for (const selector of newRules.keys()) if (!oldRules.has(selector)) report.addedCssRules.push(selector);
assert.equal(report.addedCssRules.length, 0, 'Unexpected CSS selectors added');
fs.writeFileSync(path.join(qa, 'compiled-comparison.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log('LEGACY_COMPILED_COMPARISON_PASS: JavaScript/HTML equivalent after filename normalisation; retained styles and preserved assets unchanged');
