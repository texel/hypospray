import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const base = process.env.BASE_PATH || undefined;

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://texel.github.io',
  base,
  integrations: [
    starlight({
      title: 'hypospray',
      description: 'A small dependency injection library for TypeScript.',
      favicon: '/favicon.svg',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: true,
      },
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
      customCss: ['./src/styles/custom.css'],
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
