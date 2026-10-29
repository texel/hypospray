import { defineEcConfig } from '@astrojs/starlight/expressive-code';

import { lcars } from './src/lib/lcars-theme.mjs';

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
