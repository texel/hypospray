import { describe, expect, it } from 'vitest';

import { withBase } from './url';

describe('withBase', () => {
  it('leaves paths unchanged at the root base', () => {
    expect(withBase('/docs/', '/')).toBe('/docs/');
    expect(withBase('/', '/')).toBe('/');
  });

  it('prefixes a base without a trailing slash', () => {
    expect(withBase('/docs/getting-started/', '/hypospray')).toBe(
      '/hypospray/docs/getting-started/',
    );
  });

  it('prefixes a base with a trailing slash', () => {
    expect(withBase('/docs/', '/hypospray/')).toBe('/hypospray/docs/');
  });

  it('maps the root path to the base itself', () => {
    expect(withBase('/', '/hypospray')).toBe('/hypospray/');
  });

  it('keeps anchors on prefixed paths', () => {
    expect(withBase('/#why', '/hypospray')).toBe('/hypospray/#why');
  });

  it('accepts paths without a leading slash', () => {
    expect(withBase('docs/', '/hypospray')).toBe('/hypospray/docs/');
  });

  it('leaves bare anchors and external URLs untouched', () => {
    expect(withBase('#uses', '/hypospray')).toBe('#uses');
    expect(withBase('https://github.com/texel/hypospray', '/hypospray')).toBe(
      'https://github.com/texel/hypospray',
    );
    expect(withBase('mailto:a@b.c', '/x')).toBe('mailto:a@b.c');
    expect(withBase('//cdn.example.com/x.js', '/x')).toBe('//cdn.example.com/x.js');
  });
});
