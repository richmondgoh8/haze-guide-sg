import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { renderStaticFragments } from './static-fragments.js';

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
      handler: (html) => renderStaticFragments(expandHtmlIncludes(html, sourceRoot)),
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.html')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}
