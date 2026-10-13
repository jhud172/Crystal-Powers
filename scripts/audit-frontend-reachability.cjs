/* Conservative source/CSS import graph for both retained HTML entry points. No deletion. */
const fs = require('node:fs'); const path = require('node:path');
const ts = require('../frontend/node_modules/typescript');
const root = path.resolve(__dirname, '..'); const frontend = path.join(root, 'frontend');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
function files(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]); }
const sources = files(path.join(frontend, 'src')).filter(file => /\.(tsx?|css|json)$/.test(file));
const entries = ['index.html', 'design/observatory.html'].map(name => {
  const html = path.join(frontend, name); const text = fs.readFileSync(html, 'utf8');
  const source = text.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/)?.[1];
  if (!source) throw new Error('No module entry: ' + name);
  return source.startsWith('/') ? path.join(frontend, source) : path.resolve(path.dirname(html), source);
});
// Reproducible private-draft migration consumes this catalogue outside the frontend.
const toolEntry = path.join(frontend, 'src/features/portfolio/portfolio.ts');
const migrationTool = fs.readFileSync(path.join(root, 'scripts/import-legacy-drafts.mjs'), 'utf8');
if (!migrationTool.includes('../frontend/src/features/portfolio/portfolio.ts')) throw new Error('Review changed private migration source before altering its retained root');
const edges = new Map(); const unresolved = []; const computed = []; const external = new Set();
function resolve(file, specifier) {
  if (!specifier.startsWith('.')) { external.add(specifier); return null; }
  const base = path.resolve(path.dirname(file), specifier);
  const candidates = [base, ...['.ts', '.tsx', '.css', '.json', '/index.ts', '/index.tsx'].map(suffix => base + suffix)];
  const target = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!target) unresolved.push({ file: relative(file), specifier });
  return target;
}
for (const file of [...sources, ...entries]) {
  const text = fs.readFileSync(file, 'utf8'); const imports = [];
  if (file.endsWith('.css')) for (const match of text.matchAll(/@import\s+["']([^"']+)["']/g)) imports.push(match[1]);
  else if (/\.tsx?$/.test(file)) {
    const syntax = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
        if (node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) imports.push(node.arguments[0].text);
        else computed.push({ file: relative(file), expression: node.getText(syntax) });
      }
      if (ts.isCallExpression(node) && node.expression.getText(syntax).startsWith('import.meta.glob')) computed.push({ file: relative(file), expression: node.getText(syntax) });
      ts.forEachChild(node, visit);
    }
    visit(syntax);
  }
  edges.set(file, imports.map(specifier => resolve(file, specifier)).filter(Boolean));
}
function reachable(entry) { const seen = new Set(); function visit(file) { if (seen.has(file)) return; seen.add(file); (edges.get(file) || []).forEach(visit); } visit(entry); return seen; }
const production = reachable(entries[0]), development = reachable(entries[1]), tools = reachable(toolEntry);
const unreachable = sources.filter(file => !production.has(file) && !development.has(file) && !tools.has(file) && !file.endsWith('.d.ts'));
const report = { entries: entries.map(relative), retainedToolEntry: relative(toolEntry), globalDeclarations: sources.filter(file => file.endsWith('.d.ts')).map(relative), sourceFiles: sources.length, productionReachable: production.size, developmentReachable: development.size, toolReachable: tools.size, developmentOnly: [...development].filter(file => !production.has(file)).map(relative), unreachable: unreachable.map(relative), unreachableBytes: unreachable.reduce((sum, file) => sum + fs.statSync(file).size, 0), unresolved, computed, external: [...external].sort(), scope: 'Static literal imports/re-exports (including type-only), dynamic imports and CSS @imports. Private migration catalogue and global declarations retained. Public assets, recipes, server references, docs and standalone QA references require separate review. Not an automatic deletion licence.' };
const destination = path.join(root, '.codex-runtime/qa/reachability-pc'); fs.mkdirSync(destination, { recursive: true });
fs.writeFileSync(path.join(destination, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (unresolved.length || computed.length) process.exitCode = 1;
