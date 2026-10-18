import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function setupFixture(context) {
  const root = mkdtempSync(join(tmpdir(), 'haze-setup-test-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  copyFileSync(new URL('../../Makefile', import.meta.url), join(root, 'Makefile'));
  writeFileSync(
    join(root, 'npm'),
    '#!/bin/sh\nprintf "%s\\n" "$*" >> calls\nif [ "$*" = "ci" ]; then exit "${INSTALL_EXIT:-0}"; fi\n',
    { mode: 0o755 },
  );
  return root;
}

for (const installExit of [0, 1]) {
  test(`setup ${installExit ? 'stops after dependency failure' : 'installs dependencies before security tooling'}`, (context) => {
    const root = setupFixture(context);
    const result = spawnSync('make', ['setup'], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${root}:${process.env.PATH}`,
        INSTALL_EXIT: String(installExit),
      },
    });
    assert.equal(result.status === 0, installExit === 0, result.stderr);
    assert.equal(
      readFileSync(join(root, 'calls'), 'utf8'),
      installExit ? 'ci\n' : 'ci\nrun security:setup\n',
    );
  });
}
