import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { type NoteLink, parseNoteLink } from './note-links';
import { extractRegion } from './region';

describe('parseNoteLink', () => {
  it('reads a file name', () => {
    expect(parseNoteLink('#stardate.ts')).toEqual({ file: 'stardate.ts' });
  });

  it('reads the text to flash after the first colon', () => {
    expect(parseNoteLink('#stardate.ts:StarDate.now()')).toEqual({
      file: 'stardate.ts',
      text: 'StarDate.now()',
    });
    expect(parseNoteLink('#a.ts:x ? y : z')).toEqual({ file: 'a.ts', text: 'x ? y : z' });
  });

  it('decodes percent-encoding', () => {
    expect(parseNoteLink('#a.ts:new%20Date()')).toEqual({ file: 'a.ts', text: 'new Date()' });
  });

  it('ignores an empty text', () => {
    expect(parseNoteLink('#stardate.ts:')).toEqual({ file: 'stardate.ts' });
  });

  it('reads a side prefix', () => {
    expect(parseNoteLink('#with/')).toEqual({ side: 'with' });
    expect(parseNoteLink('#with/stardate.ts')).toEqual({ side: 'with', file: 'stardate.ts' });
    expect(parseNoteLink('#with/stardate.ts:a / b')).toEqual({
      side: 'with',
      file: 'stardate.ts',
      text: 'a / b',
    });
  });

  it('rejects anything else', () => {
    expect(parseNoteLink('https://example.com/#a.ts')).toBeUndefined();
    expect(parseNoteLink('#')).toBeUndefined();
    expect(parseNoteLink('#:text')).toBeUndefined();
    expect(parseNoteLink('#a.ts:%E0%A4%A')).toBeUndefined();
    expect(parseNoteLink('#/a.ts')).toBeUndefined();
    expect(parseNoteLink('#with/a/b.ts')).toBeUndefined();
    expect(parseNoteLink('#with/:text')).toBeUndefined();
  });
});

// Every notes link should open a file beside it and, when it quotes code, find that code in what
// the file's tab shows.
const examples = join(import.meta.dirname, '../examples');
const notes = readdirSync(examples, { recursive: true, encoding: 'utf8' })
  .filter((path) => path.endsWith('notes.md'))
  .map((path) => join(examples, path));

// Markdown link destinations: `<...>` (where `<`, `>` and `\` are backslash-escaped, so an arrow
// is written `=\>`), or a bare run allowing one level of balanced parentheses.
const DESTINATION = /\]\((?:<((?:[^<>\\\n]|\\.)*)>|((?:[^()\s]|\([^()\s]*\))+))\)/g;
const unescape = (href: string) => href.replace(/\\(.)/g, '$1');

const linksByNotes = notes
  .map((path) => {
    const source = readFileSync(path, 'utf8');
    const hrefs = [...source.matchAll(DESTINATION)]
      .map((match) => (match[1] === undefined ? match[2] : unescape(match[1])))
      .filter((href) => href.startsWith('#'));
    return {
      name: relative(examples, path),
      dir: dirname(path),
      attempted: source.match(/\]\(<?#/g)?.length ?? 0,
      hrefs,
      quotes: hrefs.flatMap((href) => {
        const target = parseNoteLink(href);
        return target?.file === undefined || target.text === undefined
          ? []
          : [{ file: target.file, text: target.text, path: resolve(dirname(path), target) }];
      }),
    };
  })
  .filter(({ attempted }) => attempted > 0);

// Where a link points: its side's example folder (a sibling of this one), or this folder, plus
// the file when it names one.
function resolve(dir: string, target: NoteLink): string {
  const sideDir = target.side === undefined ? dir : join(dir, '..', target.side);
  return target.file === undefined ? sideDir : join(sideDir, target.file);
}

// What a file's tab shows: its `code` region when it has one, otherwise the whole file.
function shown(path: string): string {
  const source = readFileSync(path, 'utf8');
  return extractRegion(source, /#region code\b/.test(source) ? 'code' : undefined);
}

describe.each(linksByNotes)('$name', ({ dir, attempted, hrefs, quotes }) => {
  it('has no malformed links (a bare `>` inside `<...>` must be written `\\>`)', () => {
    expect(hrefs).toHaveLength(attempted);
  });

  it.each(hrefs)('%s points at an existing side and file', (href) => {
    const target = parseNoteLink(href);
    expect(target).toBeDefined();
    expect(existsSync(resolve(dir, target ?? {}))).toBe(true);
  });

  it.skipIf(quotes.length === 0).each(quotes)('$file shows $text', ({ path, text }) => {
    expect(shown(path)).toContain(text);
  });
});
