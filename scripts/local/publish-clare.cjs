/* Explicit operator action: publish James's approved Clare package to the saved LOCAL site. */
const {authenticate, origin} = require('./codex-session.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
(async () => {
  assert.equal(process.argv[2], '--publish-local', 'Requires --publish-local');
  const source = path.resolve('assets/portfolio/clares-life-celebrations');
  const manifest = JSON.parse(await fs.readFile(path.join(source, 'source-manifest.json'), 'utf8'));
  const approved = JSON.parse(await fs.readFile(path.join(source, 'project-content.json'), 'utf8'));
  for (const file of manifest.files) {
    const data = await fs.readFile(path.join(source, file.file));
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), file.sha256);
    assert.equal(data.length, file.bytes);
  }
  const client = await authenticate();
  try {
    const projects = await client.read('/api/team/projects');
    let project = projects.find(item => item.slug === manifest.suggestedSlug);
    if (!project) project = await client.mutate('/api/team/projects', 'POST', {submissionKey: crypto.randomUUID(), slug: manifest.suggestedSlug, content: approved});
    assert.equal(project.content.title, approved.title);
    if (project.publishedVersion == null) {
      const media = await client.read(`/api/team/projects/${project.id}/media`);
      const content = structuredClone(approved);
      for (const slot of manifest.assignAfterUpload) {
        const file = manifest.files.find(item => item.file === slot.file);
        let uploaded = media.find(item => item.width === file.width && item.height === file.height);
        if (!uploaded) {
          const form = new FormData();
          form.append('file', new Blob([await fs.readFile(path.join(source, slot.file))], {type: 'image/jpeg'}), slot.file);
          uploaded = await client.mutate(`/api/team/projects/${project.id}/media`, 'POST', form);
        }
        assert.equal(uploaded.width, file.width); assert.equal(uploaded.height, file.height);
        for (const destination of slot.slots) {
          if (destination === 'cover') {content.coverMediaId = uploaded.id; content.coverAlt = slot.alt;}
          else content.screens[destination.split('.')[1]] = {mediaId: uploaded.id, alt: slot.alt};
        }
      }
      project = await client.mutate(`/api/team/projects/${project.id}`, 'PUT', {expectedVersion: project.version, content});
      const saved = await client.read(`/api/team/projects/${project.id}`);
      assert.deepEqual(saved.content, content, 'Review the actual saved revision before publication');
      assert.equal(saved.version, project.version);
      for (const slot of Object.values(content.screens)) {
        const image = await client.request(`/api/team/media/${slot.mediaId}`);
        assert.equal(image.status, 200); assert.match(image.headers.get('content-type'), /image\/jpeg/);
        assert.ok((await image.arrayBuffer()).byteLength > 10000);
      }
      project = await client.mutate(`/api/team/projects/${project.id}/publish`, 'POST', {expectedVersion: saved.version});
    }
    if (!project.featured || project.archived) project = await client.mutate(`/api/team/projects/${project.id}/presentation`, 'PATCH', {featured: true, sortOrder: 0, archived: false, expectedUpdatedAt: project.updatedAt});
    const published = await (await fetch(`${origin}/api/projects/${project.slug}`)).json();
    assert.deepEqual(published.content, project.content);
    assert.equal(published.featured, true);
    const report = {scope: 'Saved local H2 database only; normal Codex password/MFA team session; no production publication.', projectId: project.id, slug: project.slug, version: project.version, publishedVersion: project.publishedVersion, featured: project.featured, url: `${origin}/portfolio/${project.slug}`, verifiedAt: new Date().toISOString()};
    await fs.mkdir('.codex-runtime/qa/clare-local', {recursive: true});
    await fs.writeFile('.codex-runtime/qa/clare-local/publication.json', JSON.stringify(report, null, 2));
    console.log('CLARE_LOCAL_PUBLISHED:', report.url, 'revision', report.publishedVersion);
  } finally { await client.mutate('/api/team/auth/logout', 'POST', {}); }
})().catch(error => {console.error(error.message); process.exitCode = 1;});
