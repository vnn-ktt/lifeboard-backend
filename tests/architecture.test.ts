import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(process.cwd(), 'src');
const modules = ['areas', 'goals', 'life', 'auth', 'users'];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const filepath = join(directory, name);
    return statSync(filepath).isDirectory() ? walk(filepath) : [filepath];
  });
}

test('root of each feature module contains controller, service, module only', () => {
  for (const name of modules) {
    const files = readdirSync(join(root, name), { withFileTypes: true })
      .filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    assert.deepEqual(files, [`${name}.controller.ts`, `${name}.module.ts`, `${name}.service.ts`].sort());
  }
});

test('every @/ aliased import refers to a real project file', () => {
  for (const file of walk(root).filter((file) => file.endsWith('.ts'))) {
    const content = readFileSync(file, 'utf8');
    const aliases = [...content.matchAll(/from\s+['"]@\/(.*?)['"]/g)];
    for (const match of aliases) {
      const destination = join(root, `${match[1]}.ts`);
      assert.equal(statSync(destination).isFile(), true, `${file}: ${match[0]}`);
    }
  }
});
