// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages user site (repo: zackaryB1993.github.io), served from the root.
  site: 'https://zackaryb1993.github.io',
  vite: {
    plugins: [tailwindcss()],
  },
});
