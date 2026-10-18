import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CODEQL } from '../../tooling/codeql-config.js';
import { codeqlBinary, setupCodeql } from '../../tooling/codeql.js';
import { checkPush, installHooks } from '../../tooling/git-hooks.js';
import { git } from '../../tooling/git-snapshot.js';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const good = "export const value = 'good';\n";
const bad = "export const value = 'bad';\n";

async function fixture(context) {
  const directory = mkdtempSync(join(tmpdir(), 'haze-hooks-test-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = join(directory, 'repo');
  mkdirSync(root);
  git(root, ['init', '--quiet', '--initial-branch=main']);
  git(root, ['config', 'user.name', 'Hook test']);
  git(root, ['config', 'user.email', 'hook-test@example.invalid']);
  git(root, ['config', '--local', 'core.hooksPath', '']);
  for (const directory of ['tooling', '.githooks', 'node_modules'])
    mkdirSync(join(root, directory));
  for (const name of [
    'git-hooks.js',
    'git-snapshot.js',
    'codeql.js',
    'codeql-config.js',
    'check-codeql-report.js',
  ]) {
    copyFileSync(join(projectRoot, 'tooling', name), join(root, 'tooling', name));
  }
  for (const name of ['pre-commit', 'pre-push'])
    copyFileSync(join(projectRoot, '.githooks', name), join(root, '.githooks', name));
  writeFileSync(join(root, '.gitignore'), '.cache/\nsecurity-reports/\nnode_modules/\n');
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      scripts: {
        'format:check': 'node --check example.js',
        test: 'node --test example.test.js',
      },
    }),
  );
  writeFileSync(join(root, 'example.js'), good);
  writeFileSync(
    join(root, 'example.test.js'),
    "import assert from 'node:assert/strict';\nimport { value } from './example.js';\nassert.equal(value, 'good');\n",
  );
  git(root, ['add', '.']);
  git(root, ['-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'Initial fixture']);
  await installHooks(root, {});
  const remote = join(directory, 'remote.git');
  git(root, ['init', '--bare', '--quiet', remote]);
  git(root, ['remote', 'add', 'origin', remote]);
  return { root, remote };
}

function command(root, args) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NODE_TEST_CONTEXT: undefined },
  });
}

function fakeCodeql(root) {
  const binary = codeqlBinary(root);
  mkdirSync(join(root, '.cache', 'codeql', CODEQL.version), { recursive: true });
  writeFileSync(
    binary,
    `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
if (args[0] === 'version') console.log(JSON.stringify({version: '${CODEQL.version}'}));
else if (args[1] === 'create') {
  fs.mkdirSync(args[2]);
  fs.writeFileSync(path.join(args[2], 'source'), args.find(a => a.startsWith('--source-root=')).slice(14));
} else if (args[1] === 'analyze') {
  const source = fs.readFileSync(path.join(args[2], 'source'), 'utf8');
  const bad = fs.readFileSync(path.join(source, 'example.js'), 'utf8').includes("value = 'bad'");
  fs.writeFileSync(args.find(a => a.startsWith('--output=')).slice(9), JSON.stringify({runs:[{
    results: bad ? [{ruleId:'fixture-finding', message:{text:'Rejected pushed source'}}] : [],
    invocations: [{executionSuccessful:true}]
  }]}));
} else process.exit(1);
`,
  );
  chmodSync(binary, 0o755);
}

test('pre-commit checks the staged snapshot and preserves partially staged edits', async (context) => {
  const { root } = await fixture(context);
  const original = git(root, ['rev-parse', 'HEAD']);
  writeFileSync(join(root, 'example.js'), bad);
  git(root, ['add', 'example.js']);
  writeFileSync(join(root, 'example.js'), good);
  const rejected = command(root, ['commit', '-m', 'Must fail']);
  assert.notEqual(rejected.status, 0, rejected.stdout + rejected.stderr);
  assert.equal(git(root, ['rev-parse', 'HEAD']), original);
  assert.equal(git(root, ['show', ':example.js']), bad.trim());
  assert.equal(readFileSync(join(root, 'example.js'), 'utf8'), good);

  git(root, ['add', 'example.js']);
  writeFileSync(join(root, 'change.txt'), 'Staged change\n');
  git(root, ['add', 'change.txt']);
  writeFileSync(join(root, 'example.js'), bad);
  const accepted = command(root, ['commit', '-m', 'Checked staged source']);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(git(root, ['show', 'HEAD:example.js']), good.trim());
  assert.equal(readFileSync(join(root, 'example.js'), 'utf8'), bad);
});

test('pre-commit stops on a failed formatting command', async (context) => {
  const { root } = await fixture(context);
  writeFileSync(join(root, 'example.js'), 'export const = ;\n');
  git(root, ['add', 'example.js']);
  assert.notEqual(command(root, ['commit', '-m', 'Invalid syntax']).status, 0);
});

test('pre-push rejects missing tools but permits a deletion-only update', async (context) => {
  const { root, remote } = await fixture(context);
  const pushed = command(root, ['push', 'origin', 'HEAD:main']);
  assert.notEqual(pushed.status, 0);
  assert.match(pushed.stderr, /Run make setup, then retry/);
  assert.equal(git(remote, ['for-each-ref', '--format=%(refname)']), '');
  await checkPush(root, `refs/heads/main ${'0'.repeat(40)} refs/heads/main ${'1'.repeat(40)}\n`);
});

test('pre-push scans pushed commits, not a different working tree', async (context) => {
  const { root, remote } = await fixture(context);
  fakeCodeql(root);
  writeFileSync(join(root, 'example.js'), bad);
  git(root, ['add', 'example.js']);
  git(root, ['-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'Rejected fixture']);
  writeFileSync(join(root, 'example.js'), good);
  const rejected = command(root, ['push', 'origin', 'HEAD:main']);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout + rejected.stderr, /fixture-finding/);
  assert.equal(git(remote, ['for-each-ref', '--format=%(refname)']), '');
  git(root, ['add', 'example.js']);
  git(root, ['commit', '--quiet', '-m', 'Fixed fixture']);
  writeFileSync(join(root, 'example.js'), bad);
  const accepted = command(root, ['push', 'origin', 'HEAD:main']);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(git(remote, ['rev-parse', 'refs/heads/main']), git(root, ['rev-parse', 'HEAD']));
  assert.equal(readFileSync(join(root, 'example.js'), 'utf8'), bad);
});

test('hook setup preserves other hooks and does nothing in CI', async (context) => {
  const { root } = await fixture(context);
  git(root, ['config', '--local', 'core.hooksPath', '.other-hooks']);
  await assert.rejects(installHooks(root, {}), /were preserved/);
  assert.equal(git(root, ['config', '--get', 'core.hooksPath']), '.other-hooks');
  await installHooks(root, { CI: 'true' });
  assert.equal(git(root, ['config', '--get', 'core.hooksPath']), '.other-hooks');
  git(root, ['config', '--local', '--unset', 'core.hooksPath']);
  const hook = join(root, git(root, ['rev-parse', '--git-path', 'hooks/pre-commit']));
  writeFileSync(hook, '#!/bin/sh\nexit 0\n');
  await assert.rejects(installHooks(root, {}), /was preserved/);
  assert.equal(readFileSync(hook, 'utf8'), '#!/bin/sh\nexit 0\n');
});

test('CodeQL setup rejects a corrupt download before extraction and cleans up', async (context) => {
  const { root } = await fixture(context);
  await assert.rejects(
    setupCodeql({
      root,
      platform: 'linux',
      arch: 'x64',
      fetchImpl: async () => new Response('Corrupt download'),
    }),
    /checksum mismatch/,
  );
  assert.equal(existsSync(codeqlBinary(root)), false);
  assert.deepEqual(readdirSync(join(root, '.cache', 'codeql')), []);
});
