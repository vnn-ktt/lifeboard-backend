import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const source = walk(join(root, 'src')).filter(file => file.endsWith('.ts'));
const forbidden = /\b(?:TODO|FIXME|debugger)\b|\bconsole\.(?:log|debug)\s*\(/g;
const violations = [];
for (const file of source) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(forbidden)) {
    const line = content.slice(0, match.index).split('\n').length;
    violations.push(`${relative(root, file)}:${line} — ${match[0]}`);
  }
}
if (violations.length) {
  process.stderr.write(`Release hygiene violations:\n${violations.join('\n')}\n`);
  process.exitCode = 1;
}
const modules = source.filter(file => file.endsWith('.module.ts') && relative(root, file) !== 'src/app.module.ts');
const fileToSlug = file => relative(join(root, 'src'), file).split('/').slice(0, -1).join('-');
for (const moduleFile of modules) {
  const doc = join(root, 'docs', 'modules', `${fileToSlug(moduleFile)}.md`);
  if (!existsSync(doc)) { process.stderr.write(`Missing module documentation: ${relative(root, doc)}\n`); process.exitCode = 1; }
}
const readme = readFileSync(join(root, 'README.md'), 'utf8');
let routeCount = 0;
for (const file of source.filter(file => file.endsWith('.controller.ts'))) {
  const content = readFileSync(file, 'utf8');
  const groups = [...content.matchAll(/@Controller\(\s*(?:'([^']*)')?\s*\)/g)];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const section = content.slice(g.index, groups[i + 1]?.index ?? content.length);
    const prefix = g[1] ?? '';
    for (const m of section.matchAll(/@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/g)) {
      const path = '/api/v1/' + [prefix, m[2] ?? ''].filter(Boolean).join('/');
      const method = m[1].toUpperCase();
      const normalized = path.replace(/\/$/, '') || '/api/v1';
      if (!readme.includes(`| ${method} | \`${normalized}\` |`)) {
        process.stderr.write(`Missing API Reference route: ${method} ${normalized}\n`);
        process.exitCode = 1;
      }
      routeCount++;
    }
  }
}
process.stdout.write(`Checked ${modules.length} module docs and ${routeCount} controller routes.\n`);
