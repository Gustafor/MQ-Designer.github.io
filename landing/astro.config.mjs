import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gustafor.github.io',
  compressHTML: true,
  integrations: [sitemap({ 
    filter: (page) => page !== '/404/',
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date(),
  })],
  build: {
    inlineStylesheets: 'auto',
  },
});
