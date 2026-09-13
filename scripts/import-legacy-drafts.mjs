// Reproducible one-time migration of the old, unverified sample portfolio.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../frontend/src/features/portfolio/portfolio.ts", import.meta.url), "utf8");
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: module.exports });
const quote = value => `'${value.replaceAll("'", "''")}'`;
const id = text => { const hex = createHash("sha256").update(text).digest("hex").slice(0, 32); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`; };
let sql = "-- Legacy examples are PRIVATE DRAFTS. A cover image and owner review are required before publication.\n";
for (const old of module.exports.portfolioProjects) {
  const project = id(old.slug);
  const content = { title: old.title, category: old.slug.includes("workflow") || old.slug.includes("operational") ? "SYSTEM" : "WEBSITE", summary: old.summary, overview: old.about, approach: old.creation, outcome: old.whyItWorks, liveUrl: "", technologies: [], displayDevice: "laptop", coverMediaId: null, coverAlt: "", gallery: [] };
  sql += `INSERT INTO project (id, slug) VALUES (${quote(project)}, ${quote(old.slug)});\n`;
  sql += `INSERT INTO project_revision (id, project_id, version, payload) VALUES (${quote(id(old.slug + ":1"))}, ${quote(project)}, 1, ${quote(JSON.stringify(content))});\n`;
}
writeFileSync(new URL("../src/main/resources/db/migration/V2__legacy_private_drafts.sql", import.meta.url), sql);
console.log(`Imported ${module.exports.portfolioProjects.length} private drafts; no published versions or public images.`);
