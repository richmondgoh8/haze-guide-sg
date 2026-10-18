import { existsSync } from 'node:fs';
import { chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { requireCodeql, scanCodeql } from './codeql.js';
import { cleanGitEnvironment, git, run, withSnapshot } from './git-snapshot.js';

export async function installHooks(root, env = process.env) {
  if (env.CI || env.GITHUB_ACTIONS) return;
  try {
    git(root, ['rev-parse', '--git-dir']);
  } catch {
    return;
  }
  const previous = run('git', ['config', '--get', '--default', '', 'core.hooksPath'], {
    cwd: root,
    capture: true,
  });
  const configured = previous.toString().trim();
  if (configured && configured !== '.githooks')
    throw new Error(
      `Existing Git hooks at ${configured} were preserved. Integrate .githooks before enabling these checks.`,
    );
  if (!configured) {
    for (const hook of ['pre-commit', 'pre-push']) {
      const path = resolve(root, git(root, ['rev-parse', '--git-path', `hooks/${hook}`]));
      if (existsSync(path))
        throw new Error(
          `Existing Git hook at ${path} was preserved. Integrate .githooks before enabling these checks.`,
        );
    }
  }
  await chmod(join(root, '.githooks/pre-commit'), 0o755);
  await chmod(join(root, '.githooks/pre-push'), 0o755);
  git(root, ['config', '--local', 'core.hooksPath', '.githooks']);
  console.log('Installed local Git hooks. CodeQL is installed by make setup.');
}

export async function checkStaged(root) {
  if (!git(root, ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'])) return;
  if (!existsSync(join(root, 'node_modules')))
    throw new Error('Dependencies are missing. Run npm ci before committing.');
  console.log('Checking the staged snapshot: formatting and unit tests.');
  const env = cleanGitEnvironment(root);
  await withSnapshot(root, { mode: 'staged', dependencies: true }, async (source) => {
    run('npm', ['run', 'format:check'], { cwd: source, env });
    run('npm', ['test'], { cwd: source, env });
  });
}

export async function checkPush(root, input) {
  const commits = new Set();
  for (const line of input.trim().split('\n').filter(Boolean)) {
    const [, localSha] = line.trim().split(/\s+/);
    if (!localSha || /^0+$/.test(localSha)) continue;
    commits.add(git(root, ['rev-parse', '--verify', `${localSha}^{commit}`]));
  }
  if (!commits.size) return;
  requireCodeql(root);
  for (const ref of commits) {
    console.log(`Checking pushed commit ${ref.slice(0, 12)} with CodeQL.`);
    await withSnapshot(root, { mode: 'commit', ref }, (source) => scanCodeql(root, source));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const root = fileURLToPath(new URL('../', import.meta.url));
    if (process.argv[2] === 'install') await installHooks(root);
    else if (process.argv[2] === 'pre-commit') await checkStaged(root);
    else if (process.argv[2] === 'pre-push') {
      let input = '';
      for await (const chunk of process.stdin) input += chunk;
      await checkPush(root, input);
    } else throw new Error('Unknown Git hook command.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
