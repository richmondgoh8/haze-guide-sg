import { createHash } from 'node:crypto';

export function createContentSecurityPolicy(html) {
  const hashes = [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
    ([, content]) => `'sha256-${createHash('sha256').update(content).digest('base64')}'`,
  );
  return [
    "default-src 'none'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-attr 'none'",
    "img-src 'self' data:",
    "font-src 'self'",
    'connect-src https://api-open.data.gov.sg',
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types 'none'",
  ].join('; ');
}

export function securityPolicy() {
  return {
    name: 'production-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Hash final inline metadata after Vite rewrites assets. Dev HMR uses a separate policy.
        const policy = createContentSecurityPolicy(html);
        return html.replace(
          '<!-- security:policy -->',
          `<meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        );
      },
    },
  };
}
