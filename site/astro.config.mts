import starlight from '@astrojs/starlight';
import { defineConfig, fontProviders } from 'astro/config';

const base = process.env.BASE_PATH || undefined;

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://texel.github.io',
  base,
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Antonio',
      cssVariable: '--font-antonio',
      weights: [400, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Barlow Semi Condensed',
      cssVariable: '--font-barlow',
      weights: [400, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      // 600, 700 and italic for the scratch diagrams' names, tags and notes.
      weights: [400, 600, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
  ],
  integrations: [
    starlight({
      title: 'hypospray',
      description: 'A small dependency injection library for TypeScript.',
      favicon: '/favicon.svg',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/texel/hypospray',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/texel/hypospray/edit/main/site/',
      },
      customCss: ['./src/styles/tokens.css', './src/styles/starlight.css'],
      components: {
        Head: './src/components/starlight/Head.astro',
        Header: './src/components/starlight/Header.astro',
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
        MobileMenuFooter: './src/components/starlight/MobileMenuFooter.astro',
      },
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Overview', slug: 'docs' },
            { label: 'Getting started', slug: 'docs/getting-started' },
          ],
        },
        {
          label: 'Core concepts',
          items: [{ autogenerate: { directory: 'docs/concepts' } }],
        },
        {
          label: 'Reference',
          items: [{ autogenerate: { directory: 'docs/reference' } }],
        },
      ],
    }),
  ],
});
