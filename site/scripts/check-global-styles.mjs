// Fails on any `<style is:global>` in an .astro file that isn't directly under a
// `<!-- global: <reason> -->` comment. Component styles are scoped unless there's a stated reason.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const src = new URL('../src/', import.meta.url).pathname;

function* astroFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* astroFiles(path);
    else if (name.endsWith('.astro')) yield path;
  }
}

const failures = [];
for (const file of astroFiles(src)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!/<style\b[^>]*\bis:global\b/.test(line)) return;
    if (/^\s*<!--\s*global:\s*\S.*-->\s*$/.test(lines[i - 1] ?? '')) return;
    failures.push(`${relative(process.cwd(), file)}:${i + 1}`);
  });
}

if (failures.length > 0) {
  console.error(
    'Global <style> blocks need a `<!-- global: <reason> -->` comment on the line above:',
  );
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
