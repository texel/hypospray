/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/astro'],
  ignoreFiles: ['**/dist/**', '**/node_modules/**', 'specs/**'],
  rules: {
    // Astro's scoping escape hatch.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
    // Component styles are short and scoped; ordering rules by specificity fights reading order.
    'no-descending-specificity': null,
  },
  overrides: [
    {
      // Starlight's page-title id.
      files: ['site/src/styles/starlight.css'],
      rules: { 'selector-id-pattern': null },
    },
  ],
};
