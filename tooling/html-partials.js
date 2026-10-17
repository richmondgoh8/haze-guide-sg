import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { renderStaticFragments } from './static-fragments.js';
import { PAGES, pageFile, renderPageFragments, renderSitemap } from './site-pages.js';

export function expandHtmlIncludes(html, sourceRoot, parents = []) {
  return html.replace(/<!--\s*include:\s*([^>]+?)\s*-->/g, (_, includePath) => {
    const filename = resolve(sourceRoot, includePath.trim());
    const relativePath = relative(sourceRoot, filename);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error(`HTML include must stay inside src/: ${includePath}`);
    }
    if (parents.includes(filename)) {
      throw new Error(`Circular HTML include: ${[...parents, filename].join(' -> ')}`);
    }

    let content;
    try {
      content = readFileSync(filename, 'utf8');
    } catch (cause) {
      throw new Error(`Cannot read HTML include: ${includePath}`, { cause });
    }
    return expandHtmlIncludes(content, sourceRoot, [...parents, filename]);
  });
}

export function htmlPartials(sourceRoot) {
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const filename = relative(sourceRoot, context.filename).replaceAll('\\', '/');
        const page = PAGES.find((entry) => pageFile(entry) === filename);
        if (!page) throw new Error(`Missing page metadata: ${filename}`);
        return renderPageFragments(
          renderStaticFragments(expandHtmlIncludes(html, sourceRoot)),
          page,
        );
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap() });
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.html')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}
