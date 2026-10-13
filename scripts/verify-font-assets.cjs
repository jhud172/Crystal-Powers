/* Offline provenance contract: existing font bytes/faces, local delivery and licence. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const directory = path.resolve(__dirname, '../frontend/public/fonts/manrope');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'source-manifest.json'), 'utf8'));
const sha = body => crypto.createHash('sha256').update(body).digest('hex');
assert.equal(manifest.family, 'Manrope');
assert.equal(manifest.unmodified, true);
assert.deepEqual(manifest.weights, [400, 500, 600, 700]);
assert.equal(manifest.files.length, 6);
let css = fs.readFileSync(path.resolve(__dirname, '../frontend/src/styles/base/fonts.css'), 'utf8').replace(/\r\n/g, '\n');
css = css.replace(/^\/\* Unmodified Manrope v20 faces; licence\/provenance: \/fonts\/manrope\/ \*\/\n/, '');
for (const file of manifest.files) {
  assert.match(file.file, /^manrope-v20-[a-z-]+-[a-f0-9]{12}\.woff2$/);
  assert.match(file.url, /^https:\/\/fonts\.gstatic\.com\/s\/manrope\/v20\/[^/]+\.woff2$/);
  const body = fs.readFileSync(path.join(directory, file.file));
  assert.equal(body.subarray(0, 4).toString(), 'wOF2');
  assert.equal(body.length, file.bytes);
  assert.equal(sha(body), file.sha256);
  assert.ok(file.file.includes(file.sha256.slice(0, 12)));
  const local = '/fonts/manrope/' + file.file;
  assert.equal(css.split(local).length - 1, 4);
  css = css.replaceAll(local, file.url);
}
assert.equal(sha(css), manifest.sourceCssSha256, 'Local faces must exactly preserve upstream weights, language ranges and swap behaviour');
assert.equal(sha(fs.readFileSync(path.join(directory, 'OFL.txt'))), manifest.licenceSha256);
assert.equal(sha(fs.readFileSync(path.join(directory, 'FONTLOG.txt'))), manifest.fontlogSha256);
const html = fs.readFileSync(path.resolve(__dirname, '../frontend/index.html'), 'utf8');
assert.ok(!html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com'));
const latin = manifest.files.find(file => file.subset === 'latin');
assert.ok(html.includes(`href="/fonts/manrope/${latin.file}" as="font" type="font/woff2" crossorigin`));
console.log('FONT_ASSET_CONTRACT_PASS: six unmodified fonts, exact original faces, local preload and licence');
