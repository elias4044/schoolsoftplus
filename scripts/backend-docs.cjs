/* eslint-disable @typescript-eslint/no-require-imports -- Standalone documentation tooling. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const docsRoot = path.join(root, 'docs');
const checkOnly = process.argv.includes('--check');
const notes = JSON.parse(fs.readFileSync(path.join(docsRoot, 'backend/route-notes.json'), 'utf8'));
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const generated = new Map();
const toPosix = (value) => value.split(path.sep).join('/');
const ascii = (value) =>
  value.replace(
    /[^\x00-\x7F]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
const fence = (value, language = 'ts') => `\n\`\`\`${language}\n${ascii(value.trim())}\n\`\`\`\n`;
const digest = (source) => crypto.createHash('sha256').update(source).digest('hex');
const sourceLink = (file, line = 1) =>
  `https://github.com/elias4044/schoolsoftplus/blob/main/${file.split('/').map(encodeURIComponent).join('/')}#L${line}`;

function walk(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : [file];
    })
    .sort();
}

function parse(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  return { source, tree: ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true) };
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function isExported(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function exportedMethods(tree) {
  return tree.statements.flatMap((statement) => {
    if (!isExported(statement)) return [];
    if (ts.isFunctionDeclaration(statement) && methods.has(statement.name?.text))
      return [{ method: statement.name.text, node: statement }];
    if (!ts.isVariableStatement(statement)) return [];
    return statement.declarationList.declarations
      .filter((declaration) => methods.has(declaration.name.getText(tree)))
      .map((declaration) => ({ method: declaration.name.getText(tree), node: declaration }));
  });
}

function collectContract(node, tree) {
  const requests = new Set();
  const responses = new Set();
  const cookies = new Set();
  const upstream = new Set();
  visit(node, (child) => {
    if (
      ts.isNewExpression(child) &&
      /^(?:NextResponse|Response)$/.test(child.expression.getText(tree))
    )
      responses.add(child.getText(tree));
    if (!ts.isCallExpression(child)) return;
    const name = child.expression.getText(tree);
    const expression = child.getText(tree);
    if (
      /^(?:(?:req|request)\.(?:nextUrl\.)?(?:searchParams|headers|cookies)|searchParams)\.get$/.test(
        name
      ) ||
      /^(?:readRouteBody|readJsonObject|readRequestBytes)$/.test(name)
    )
      requests.add(expression);
    if (/^(?:NextResponse|Response)\.(?:json|redirect)$/.test(name)) responses.add(expression);
    if (name.endsWith('.cookies.set')) cookies.add(expression);
    if (
      name === 'fetch' ||
      /^(?:api|schoolApi|axios)\.(?:get|post|request)$/.test(name) ||
      /^createSchoolsoftClient\([\s\S]*\)\.(?:get|post|request)$/.test(name) ||
      /^(?:ai|genAI)\.models\.generateContent$/.test(name)
    )
      upstream.add(expression);
  });
  const bodies = [];
  visit(node, (child) => {
    if (
      ts.isVariableStatement(child) &&
      /await (?:readRouteBody|readJsonObject|readRequestBytes)\(/.test(child.getText(tree))
    )
      bodies.push(child.getText(tree));
  });
  return {
    requests: [...requests],
    bodies,
    responses: [...responses],
    cookies: [...cookies],
    upstream: [...upstream],
  };
}

function example(route, method, options) {
  const substitutions = {
    token: '0123456789abcdef0123456789abcdef01234567',
    code: 'ABCD2345',
    username: '12346',
    id: route.includes('/passkey/') ? 'example-credential-id' : '12345',
    subjectId: '120',
    deckId: 'example-deck-id',
    cardId: 'example-card-id',
    conversationId: 'example-conversation-id',
    messageId: 'example-message-id',
  };
  const url = route.replace(/\[([^\]]+)\]/g, (_, key) => substitutions[key] ?? `example-${key}`);
  const lines = [`curl -i -b cookies.txt -c cookies.txt -X ${method}`];
  for (const [key, value] of Object.entries(options.headers ?? {}))
    lines.push(`  -H '${key}: ${value}'`);
  if (options.form) lines.push(`  -F 'image=@example.png'`);
  if (options.body !== undefined) {
    lines.push(`  -H 'Content-Type: application/json'`);
    lines.push(`  --data '${JSON.stringify(options.body).replace(/'/g, "'\\''")}'`);
  }
  lines.push(`  'http://localhost:3000${url}${options.query ? `?${options.query}` : ''}'`);
  return fence(lines.join(' \\\n'), 'sh');
}

function section(title, values, empty) {
  return `\n#### ${title}\n\n${values.length ? values.map((value) => fence(value)).join('\n') : empty}\n`;
}

const routeFiles = walk(path.join(root, 'app')).filter((file) =>
  /[\\/]route\.(?:ts|js)$/.test(file)
);
const routeEntries = [];
let operationCount = 0;
for (const absoluteFile of routeFiles) {
  const file = toPosix(path.relative(root, absoluteFile));
  const route = '/' + file.replace(/^app\//, '').replace(/\/route\.(?:ts|js)$/, '');
  const note = notes[route];
  if (!note) throw new Error(`Missing reviewed route explanation: ${route}`);
  const { source, tree } = parse(file);
  const handlers = exportedMethods(tree);
  const slug = route
    .replace(/^\/api\//, '')
    .replace(/\[|\]/g, '')
    .replaceAll('/', '-');
  const output = `backend/routes/${slug}.md`;
  routeEntries.push({
    route,
    output,
    methods: handlers.map((handler) => handler.method),
    guide: note.guide,
  });
  operationCount += handlers.length;
  let document =
    `# ${route}\n\n${note.summary}\n\n` +
    `[Domain guide](../${note.guide}.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)\n\n` +
    `Implementation: [${file}](${sourceLink(file)}). Source SHA-256: \`${digest(source)}\`.\n\n` +
    `The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.\n`;
  const dependencies = tree.statements.filter(ts.isImportDeclaration).flatMap((statement) => {
    const name = statement.moduleSpecifier.text;
    if (!name.startsWith('@/app/api/') && !name.startsWith('@/lib/')) return [];
    const target = name.replace(/^@\//, '') + '.ts';
    return [
      `- [${name}](${sourceLink(target)}): \`${(statement.importClause?.getText(tree) ?? 'side effect import').replace(/\s+/g, ' ')}\``,
    ];
  });
  document += `\n## Dependencies\n\n${dependencies.join('\n') || 'Only framework/external imports.'}\n`;
  for (const { method, node } of handlers) {
    if (!Object.hasOwn(note.examples, method))
      throw new Error(`Missing ${method} example for ${route}`);
    const contract = collectContract(node, tree);
    const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
    document +=
      `\n## ${method} ${route}\n\n[Handler source](${sourceLink(file, line)}).\n\n### Example request\n\n` +
      `Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.\n` +
      example(route, method, note.examples[method]) +
      `\n### Source contract\n`;
    document += section(
      'Request reads',
      contract.requests,
      'No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.'
    );
    document += section(
      'Parsed body and local type',
      contract.bodies,
      'No direct body declaration. See shared helpers for delegated parsing.'
    );
    document += section(
      'Response branches',
      contract.responses,
      'Response construction is delegated to a local helper; see the local-helper section below.'
    );
    document += section(
      'Cookie writes',
      contract.cookies,
      'No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.'
    );
    document += section(
      'Direct upstream calls',
      contract.upstream,
      'No direct upstream call in this handler. Imported/local helpers may perform network or database work.'
    );
  }
  const localFunctions = tree.statements.filter(
    (node) => ts.isFunctionDeclaration(node) && !isExported(node)
  );
  if (localFunctions.length) {
    document +=
      '\n## Local helper behavior\n\nThe route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.\n';
    for (const node of localFunctions) {
      const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
      const contract = collectContract(node, tree);
      document += `\n### ${node.name.text}\n\n[Implementation](${sourceLink(file, line)}).\n`;
      document += section(
        'Response branches',
        contract.responses,
        'No direct HTTP response; this helper transforms or fetches data.'
      );
      document += section('Upstream calls', contract.upstream, 'No direct upstream call.');
    }
  }
  generated.set(output, ascii(document));
}
for (const route of Object.keys(notes)) {
  if (!routeEntries.some((entry) => entry.route === route))
    throw new Error(`Stale route explanation: ${route}`);
}
routeEntries.sort((a, b) => a.route.localeCompare(b.route));
generated.set(
  'backend/routes/README.md',
  `# Every backend route\n\n${routeEntries.length} route files export ${operationCount} HTTP operations. This inventory counts explicit exports; framework-provided HEAD/OPTIONS behavior is not an additional authored handler.\n\n` +
    'Each page includes a reviewed explanation, method-specific example, source fingerprint, inputs, response branches, cookie writes, and direct upstream calls. Read the linked domain guide for helper effects, ownership, data models, and failure behavior.\n\n' +
    '| Route | Explicit methods | Guide |\n| --- | --- | --- |\n' +
    routeEntries
      .map(
        (entry) =>
          `| [\`${entry.route}\`](${path.posix.basename(entry.output)}) | ${entry.methods.join(', ')} | [${entry.guide}](../${entry.guide}.md) |`
      )
      .join('\n') +
    '\n'
);

const helperFiles = [
  ...walk(path.join(root, 'app/api/lib')),
  path.join(root, 'app/api/auth/v2/lib.ts'),
  ...walk(path.join(root, 'lib/grades')),
  path.join(root, 'lib/final-grades/types.ts'),
  path.join(root, 'lib/accountReferences.ts'),
].filter((file) => file.endsWith('.ts'));
const helperEntries = [];
for (const absoluteFile of helperFiles) {
  const file = toPosix(path.relative(root, absoluteFile));
  const { source, tree } = parse(file);
  const name = file.startsWith('app/api/lib/')
    ? path.posix.basename(file, '.ts')
    : file.replaceAll('/', '-').replace(/\.ts$/, '');
  const output = `backend/contracts/${name}.md`;
  helperEntries.push({ file, output });
  let document =
    `# ${file}\n\n[Implementation](${sourceLink(file)}) | [Contract index](README.md) | [Architecture](../architecture.md)\n\n` +
    `Source SHA-256: \`${digest(source)}\`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.\n`;
  const declarations = tree.statements.filter(isExported);
  for (const node of declarations) {
    if (ts.isFunctionDeclaration(node)) {
      const signature = source
        .slice(node.getStart(tree), node.body?.getStart(tree) ?? node.end)
        .trim();
      document += `\n## ${node.name.text}\n` + fence(signature + ';');
    } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      document += `\n## ${node.name.text}\n` + fence(node.getText(tree));
    } else if (ts.isVariableStatement(node)) {
      const names = node.declarationList.declarations
        .map((declaration) => declaration.name.getText(tree))
        .join(', ');
      document += `\n## ${names}\n`;
      document +=
        node.getText(tree).length < 6000
          ? fence(node.getText(tree))
          : `\nLarge static data; inspect the [source](${sourceLink(file, tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1)}).\n`;
    } else if (ts.isClassDeclaration(node)) {
      document += `\n## ${node.name.text}\n` + fence(node.getText(tree));
    }
  }
  if (/\/(?:requestBody|studyValidation|gradeValidation|validation|identity)\.ts$/.test(file))
    document +=
      '\n## Runtime validation implementation\n\nThis complete module supplies checks beyond TypeScript declarations.\n' +
      fence(source);
  generated.set(output, ascii(document));
}
generated.set(
  'backend/contracts/README.md',
  '# Shared backend contracts\n\n' +
    'Types, exported constants, and function signatures extracted from every API helper, AuthV2 helper, and shared grade/identity modules used by the backend. Validation modules also include their executable checks. Function bodies remain in the linked implementation; signatures alone do not describe authorization or transaction behavior.\n\n' +
    helperEntries
      .map((entry) => `- [${entry.file}](${path.posix.basename(entry.output)})`)
      .join('\n') +
    '\n'
);

let failures = 0;
for (const [relativeFile, content] of generated) {
  const destination = path.join(docsRoot, relativeFile);
  if (checkOnly) {
    if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== content) {
      console.error(`Stale or missing: docs/${relativeFile}`);
      failures++;
    }
  } else {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }
}
for (const directory of ['backend/routes', 'backend/contracts']) {
  if (!fs.existsSync(path.join(docsRoot, directory))) continue;
  for (const file of walk(path.join(docsRoot, directory))) {
    const relativeFile = toPosix(path.relative(docsRoot, file));
    if (!generated.has(relativeFile)) {
      console.error(`Unexpected generated file (review manually): docs/${relativeFile}`);
      failures++;
    }
  }
}
for (const file of walk(docsRoot).filter((file) => file.endsWith('.md'))) {
  const content = fs.readFileSync(file, 'utf8').replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(?:[a-z]+:|\/)/i.test(target)) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(target)))) {
      console.error(`Broken relative link: ${toPosix(path.relative(root, file))} -> ${target}`);
      failures++;
    }
  }
}
console.log(
  `${checkOnly ? 'Checked' : 'Generated'} ${routeEntries.length} routes, ${operationCount} operations, ${helperEntries.length} helper contracts, ${generated.size} pages; ${failures} failures.`
);
if (failures) process.exitCode = 1;
