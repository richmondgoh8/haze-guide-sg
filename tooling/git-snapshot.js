import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export function run(command, args, { cwd, capture = false, input, env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    input,
    stdio: capture || input !== undefined ? 'pipe' : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr?.toString().trim();
    throw new Error(
      `${command} ${args[0]} failed (${result.status ?? result.signal})${detail ? `: ${detail}` : ''}`,
    );
  }
  return result.stdout;
}

export function git(root, args) {
  return run('git', args, { cwd: root, capture: true }).toString().trim();
}

// Git exports index/worktree paths to hooks; do not carry them into another checkout.
export function cleanGitEnvironment(root) {
  const env = { ...process.env };
  for (const name of git(root, ['rev-parse', '--local-env-vars']).split('\n')) delete env[name];
  return env;
}

/** Export without checking out a branch, changing the index, or stashing local edits. */
export async function withSnapshot(root, { mode = 'working', ref, dependencies = false }, action) {
  const directory = await mkdtemp(join(tmpdir(), 'haze-check-'));
  try {
    if (mode === 'staged') {
      git(root, ['checkout-index', '--all', `--prefix=${directory}/`]);
    } else if (mode === 'commit') {
      const commit = git(root, ['rev-parse', '--verify', `${ref}^{commit}`]);
      const archive = run('git', ['archive', '--format=tar', commit], { cwd: root, capture: true });
      run('tar', ['-xf', '-', '-C', directory], { input: archive });
    } else {
      const paths = run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
        cwd: root,
        capture: true,
      })
        .toString()
        .split('\0')
        .filter(Boolean);
      for (const path of new Set(paths)) {
        const source = resolve(root, path);
        try {
          await lstat(source);
        } catch (error) {
          if (error.code === 'ENOENT') continue;
          throw error;
        }
        await mkdir(dirname(join(directory, path)), { recursive: true });
        await cp(source, join(directory, path), { recursive: true, dereference: false });
      }
    }
    if (dependencies) {
      const { symlink } = await import('node:fs/promises');
      await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir');
    }
    return await action(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
