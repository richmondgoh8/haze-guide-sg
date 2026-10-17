import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { htmlPartials } from './tooling/html-partials.js';
import { PAGES, pageFile } from './tooling/site-pages.js';

const sourceRoot = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  root: sourceRoot,
  appType: 'mpa',
  base: './',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [htmlPartials(sourceRoot)],
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022',
    rolldownOptions: {
      input: PAGES.map((page) => `${sourceRoot}/${pageFile(page)}`),
    },
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
