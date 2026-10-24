/* Local operator credentials remain encrypted on disk and are decrypted only in this process. */
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const origin = 'http://127.0.0.1:8084';
function credentials() {
  const filename = path.resolve('.codex-runtime/security/codex-local.dpapi');
  assert.ok(fs.realpathSync(filename).startsWith(fs.realpathSync('.codex-runtime') + path.sep));
  const text = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Add-Type -AssemblyName System.Security; [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($env:CRYSTAL_CODEX_CREDENTIAL_FILE),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))'],
    {env: {...process.env, CRYSTAL_CODEX_CREDENTIAL_FILE: filename}, stdio: ['ignore', 'pipe', 'pipe']});
  const value = JSON.parse(text.toString('utf8').replace(/^\uFEFF/, ''));
  assert.equal(value.workspace.toLowerCase(), fs.realpathSync('.').toLowerCase());
  assert.equal(value.origin, origin);
  assert.equal(value.email, 'codex@local.crystal.invalid');
  return value;
}
function totp(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.toUpperCase().replace(/=+$/, '')) {
    const index = alphabet.indexOf(char); assert.ok(index >= 0);
    bits += index.toString(2).padStart(5, '0');
  }
  const key = Buffer.from((bits.match(/.{8}/g) || []).map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = crypto.createHmac('sha1', key).update(counter).digest();
  return ((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}
async function authenticate() {
  const value = credentials(), cookies = new Map();
  async function request(route, options = {}) {
    assert.ok(route.startsWith('/api/') && !route.includes('://'));
    const headers = {...options.headers, Cookie: [...cookies].map(([key, val]) => `${key}=${val}`).join('; ')};
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(origin + route, {...options, headers, redirect: 'error'});
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';'), offset = pair.indexOf('=');
      cookies.set(pair.slice(0, offset), pair.slice(offset + 1));
    }
    return response;
  }
  async function read(route) {
    const response = await request(route);
    if (!response.ok) throw Error(`GET ${route}: HTTP ${response.status}`);
    return response.json();
  }
  async function mutate(route, method, body) {
    const csrf = await read('/api/admin/auth/csrf');
    const response = await request(route, {method, headers: {[csrf.headerName]: csrf.token}, body: body instanceof FormData ? body : JSON.stringify(body)});
    if (!response.ok) throw Error(`${method} ${route}: HTTP ${response.status}; ${await response.text()}`);
    return response.json();
  }
  const challenge = await mutate('/api/team/auth/login', 'POST', {email: value.email, password: value.password});
  assert.equal(challenge.mfaRequired, true);
  if (challenge.enrolmentRequired) assert.equal((await mutate('/api/team/auth/enrolment', 'POST', {})).secret, value.secret);
  // A previously used authenticator step must never be replayed.
  await new Promise(resolve => setTimeout(resolve, 30500 - Date.now() % 30000));
  const session = await mutate('/api/team/auth/verify', 'POST', {code: totp(value.secret)});
  assert.equal(session.authenticated, true);
  assert.deepEqual([...session.permissions].sort(), ['EDIT_PROJECTS', 'PUBLISH_PROJECTS', 'READ_CHANNELS']);
  assert.equal((await request('/api/admin/projects')).status, 403);
  return {read, mutate, request, session, cookies: () => [...cookies].map(([name, val]) => ({name, value: val, url: origin, httpOnly: true, sameSite: 'Lax'}))};
}
module.exports = {authenticate, origin};
if (require.main === module) authenticate().then(async client => {
  console.log('LOCAL_CODEX_LOGIN_PASS: password, MFA, portfolio-only grants, owner access denied.');
  await client.mutate('/api/team/auth/logout', 'POST', {});
}).catch(() => {console.error('Local Codex sign-in failed. No credentials were printed.'); process.exitCode = 1;});
