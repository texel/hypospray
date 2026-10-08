import { defineEcConfig } from '@astrojs/starlight/expressive-code';

const lcars = {
  name: 'lcars',
  type: 'dark',
  colors: {
    'editor.background': '#120e0a',
    'editor.foreground': '#f2e4cf',
    'editor.selectionBackground': '#3a2f26',
    'editorLineNumber.foreground': '#9a8f84',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#9a8f84' } },
    {
      scope: [
        'keyword',
        'storage',
        'storage.type',
        'storage.modifier',
        'keyword.control',
        'keyword.operator.new',
        'variable.language',
      ],
      settings: { foreground: '#c59bd8' },
    },
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'support.type',
        'support.class',
        'entity.other.inherited-class',
        'meta.type.annotation entity.name.type',
      ],
      settings: { foreground: '#8cc8f5' },
    },
    {
      scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string'],
      settings: { foreground: '#ffc58a' },
    },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#ffc58a' } },
  ],
};

export default defineEcConfig({
  themes: [lcars],
  styleOverrides: {
    borderRadius: '0',
    borderWidth: '0',
    codeBackground: 'var(--panel)',
    codeFontFamily: 'var(--font-code)',
    codeFontSize: '14px',
    codeLineHeight: '1.7',
    codePaddingBlock: '20px',
    codePaddingInline: '22px',
    uiFontFamily: 'var(--font-display)',
    frames: {
      frameBoxShadowCssValue: 'none',
      editorTabBarBackground: 'var(--frame)',
      editorActiveTabBackground: 'var(--frame)',
      editorActiveTabForeground: 'var(--bg)',
      terminalTitlebarBackground: 'var(--frame)',
    },
  },
});
