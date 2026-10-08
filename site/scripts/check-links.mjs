import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const base = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/');

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* htmlFiles(path);
    else if (name.endsWith('.html')) yield path;
  }
}

function resolves(url) {
  let path = url.split('#')[0].split('?')[0];
  if (path === '') return true;
  if (!path.startsWith(base)) return false;
  path = decodeURI(path.slice(base.length));
  const target = join(dist, path);
  return (
    (existsSync(target) && statSync(target).isFile()) ||
    existsSync(join(target, 'index.html')) ||
    existsSync(`${target}.html`)
  );
}

const broken = [];
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    if (!resolves(url)) broken.push(`${relative(dist, file)} → ${url}`);
  }
}

if (broken.length > 0) {
  console.error(`Broken internal links (base ${base}):\n${broken.join('\n')}`);
  process.exit(1);
}
console.log(`All internal links resolve (base ${base}).`);
