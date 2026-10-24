const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const base = process.env.CRYSTAL_QA_URL || 'http://127.0.0.1:8084';
assert.match(base, /^http:\/\/127\.0\.0\.1:(8084|18084)$/);
const checks = [], assets = [];
function get(address, encoding) {
  return new Promise((resolve, reject) => {
    const request = http.get(base + address, { headers: { 'Accept-Encoding': encoding }, agent: false }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    request.setTimeout(10_000, () => request.destroy(new Error('Local delivery timed out')));
    request.on('error', reject);
  });
}
function check(description, verify) { verify(); checks.push(description); }
(async () => {
  const folder = path.resolve(__dirname, '../frontend/dist/assets');
  for (const name of (await fs.readdir(folder)).filter(name => /\.(css|js)$/.test(name))) {
    const address = '/assets/' + name;
    const [identity, gzip, built] = await Promise.all([get(address, 'identity'), get(address, 'gzip'), fs.readFile(path.join(folder, name))]);
    check(`${name}: identity is the exact compiled asset`, () => { assert.equal(identity.status, 200); assert.equal(identity.headers['content-encoding'], undefined); assert.deepEqual(identity.body, built); });
    const large = built.length >= 1024;
    check(`${name}: negotiated representation and Vary`, () => { assert.equal(gzip.status, 200); assert.equal(gzip.headers['content-encoding'], large ? 'gzip' : undefined); if (large) assert.match(gzip.headers.vary, /accept-encoding/i); });
    check(`${name}: decompressed bytes equal identity/build`, () => assert.deepEqual(large ? gunzipSync(gzip.body) : gzip.body, identity.body));
    check(`${name}: compression reduces transfer`, () => { if (large) assert.ok(gzip.body.length < identity.body.length); });
    check(`${name}: security headers remain identical`, () => { for (const header of ['content-security-policy', 'x-content-type-options', 'x-frame-options']) assert.equal(gzip.headers[header], identity.headers[header]); });
    assets.push({ address, identityBytes: identity.body.length, gzipBytes: gzip.body.length, sha256: createHash('sha256').update(built).digest('hex') });
  }
  for (const [address, status, mime] of [['/', 200, 'text/html'], ['/admin', 200, 'text/html'], ['/accessibility', 200, 'text/html'], ['/privacy', 404, 'text/html'], ['/api/health', 200, 'application/json'], ['/api/projects', 200, 'application/json'], ['/api/admin/projects', 401, 'application/json'], ['/models/observatory.glb', 200, 'application/octet-stream'], ['/renders/observatory-dark-800.webp', 200, 'image/webp']]) {
    const response = await get(address, 'gzip');
    check(`${address}: expected status/type and no compression`, () => { assert.equal(response.status, status); assert.ok(response.headers['content-type'].startsWith(mime), response.headers['content-type']); assert.equal(response.headers['content-encoding'], undefined); });
    if (address === '/admin' || address === '/api/admin/projects') check(`${address}: private no-store retained`, () => assert.match(response.headers['cache-control'], /no-store/));
  }
  const output = path.resolve(__dirname, '../.codex-runtime/qa/static-delivery-pc');
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ base, checks, assets, errors: [] }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, assets: assets.length, errors: 0 }));
})().catch(error => { console.error(error); process.exitCode = 1; });
