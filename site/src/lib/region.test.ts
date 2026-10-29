import { describe, expect, it } from 'vitest';

import { extractRegion } from './region';

const source = [
  "import { inject } from '@hypospray/core';",
  '',
  '// #region outer',
  'export function a() {',
  '  // #region inner',
  '  return 1;',
  '  // #endregion',
  '}',
  '// #endregion',
  '',
  '// #region other',
  'const b = 2;',
  '// #endregion',
].join('\n');

describe('extractRegion', () => {
  it('returns the whole source minus marker lines when no name is given', () => {
    expect(extractRegion(source)).toBe(
      [
        "import { inject } from '@hypospray/core';",
        '',
        'export function a() {',
        '  return 1;',
        '}',
        '',
        'const b = 2;',
      ].join('\n'),
    );
  });

  it('extracts a named region and strips nested markers', () => {
    expect(extractRegion(source, 'outer')).toBe(
      ['export function a() {', '  return 1;', '}'].join('\n'),
    );
  });

  it('dedents an indented region', () => {
    expect(extractRegion(source, 'inner')).toBe('return 1;');
  });

  it('extracts a later sibling region', () => {
    expect(extractRegion(source, 'other')).toBe('const b = 2;');
  });

  it('trims leading and trailing blank lines', () => {
    const s = '// #region x\n\nconst x = 1;\n\n// #endregion';
    expect(extractRegion(s, 'x')).toBe('const x = 1;');
  });

  it('throws when the region does not exist', () => {
    expect(() => extractRegion(source, 'missing')).toThrow('Region "missing" not found');
  });

  it('throws when the region is never closed', () => {
    expect(() => extractRegion('// #region open\nconst x = 1;', 'open')).toThrow(
      'Region "open" is not closed',
    );
  });
});
