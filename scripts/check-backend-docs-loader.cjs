/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the sibling site's actual renderer without modifying it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const siteRoot = path.resolve(process.argv[2] ?? path.join(root, '../ssp-developer'));
const siteRequire = createRequire(path.join(siteRoot, 'package.json'));
const { createElement } = siteRequire('react');
const { renderToStaticMarkup } = siteRequire('react-dom/server');
const loadedModules = new Map();

function loadTypeScript(file) {
  if (loadedModules.has(file)) return loadedModules.get(file).exports;
  const moduleObject = { exports: {} };
  loadedModules.set(file, moduleObject);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith('@/') && !name.startsWith('.')) return siteRequire(name);
    const base = name.startsWith('@/')
      ? path.resolve(siteRoot, name.slice(2))
      : path.resolve(path.dirname(file), name);
    const resolved = ['.ts', '.tsx'].map((extension) => base + extension).find(fs.existsSync);
    assert.ok(resolved, `Missing site source module ${name}`);
    return loadTypeScript(resolved);
  };
  new Function('require', 'module', 'exports', code)(
    localRequire,
    moduleObject,
    moduleObject.exports
  );
  return moduleObject.exports;
}

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(file) : /\.mdx?$/.test(file) ? [file] : [];
  });
}

const docs = loadTypeScript(path.join(siteRoot, 'lib/docs.ts'));
const { MarkdownContent } = loadTypeScript(path.join(siteRoot, 'components/MarkdownContent.tsx'));
const files = markdownFiles(path.join(root, 'docs'));
const tree = files.map((file) => ({
  path: path.relative(root, file).split(path.sep).join('/'),
  type: 'blob',
}));
const index = docs.createDocsIndex(tree, 'local-documentation-check');
assert.equal(index.status, 'ready');
assert.equal(index.entries.length, files.length);
let headingCount = 0;
let linkCount = 0;
for (const entry of index.entries) {
  const content = docs.stripFrontmatter(fs.readFileSync(path.join(root, entry.path), 'utf8'));
  const html = renderToStaticMarkup(
    createElement(MarkdownContent, {
      content,
      filePath: entry.path,
      entries: index.entries,
      revision: index.revision,
    })
  );
  assert.match(html, /<h1\b/, `Missing rendered title: ${entry.path}`);
  for (const heading of docs.getHeadings(content)) {
    const encoded = heading.id.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    assert.ok(
      html.includes(`id="${encoded}"`),
      `Missing heading anchor ${entry.path}#${heading.id}`
    );
    headingCount++;
  }
  const prose = content.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
  for (const match of prose.matchAll(/\]\(([^)]+\.md(?:#[^)]*)?)\)/g)) {
    const resolved = docs.resolveDocLink(match[1], entry.path, index.entries, index.revision);
    assert.ok(
      resolved.startsWith('/docs/'),
      `Document escaped local navigation: ${entry.path} -> ${match[1]}`
    );
    linkCount++;
  }
}
console.log(
  `Actual ssp-developer loader/renderer: ${files.length} pages, ${headingCount} heading anchors, ${linkCount} internal document links passed.`
);
