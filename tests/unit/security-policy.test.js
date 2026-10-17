import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createContentSecurityPolicy } from '../../tooling/security-policy.js';

test('production CSP denies executable inline code, arbitrary connections and embedded documents', () => {
  const policy = createContentSecurityPolicy('<html></html>');
  for (const directive of [
    "default-src 'none'",
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-attr 'none'",
    'connect-src https://api-open.data.gov.sg',
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "trusted-types 'none'",
  ])
    assert.ok(policy.includes(directive), directive);
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|https:\s|\*/);
  // These directives cannot be enforced by an HTML meta policy.
  assert.doesNotMatch(policy, /frame-ancestors|report-uri|sandbox/);
});

test('CSP hashes exact inline metadata, not external scripts or a reusable nonce', () => {
  const content = '\n{"@type":"WebPage"}\n';
  const hash = createHash('sha256').update(content).digest('base64');
  const policy = createContentSecurityPolicy(
    `<script type="application/ld+json">${content}</script><script src="./app.js"></script>`,
  );
  assert.ok(policy.includes(`'sha256-${hash}'`));
  assert.equal((policy.match(/sha256-/g) || []).length, 1);
  assert.ok(!policy.includes('nonce-'));
});
