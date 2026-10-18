import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CODEQL } from './codeql-config.js';
import { cleanGitEnvironment, run, withSnapshot } from './git-snapshot.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function codeqlBinary(root) {
  return join(root, '.cache', 'codeql', CODEQL.version, 'codeql');
}

export function requireCodeql(root) {
  const binary = codeqlBinary(root);
  if (!existsSync(binary))
    throw new Error('CodeQL is not installed. Run make setup-security, then retry.');
  const version = JSON.parse(run(binary, ['version', '--format=json'], { capture: true })).version;
  if (version !== CODEQL.version)
    throw new Error(
      `Expected CodeQL ${CODEQL.version}; found ${version}. Run make setup-security.`,
    );
  return binary;
}

export async function setupCodeql({
  root = projectRoot,
  fetchImpl = globalThis.fetch,
  platform = process.platform,
  arch = process.arch,
} = {}) {
  if (platform !== 'linux' || arch !== 'x64')
    throw new Error(
      'The pinned local CodeQL bundle supports Linux x64. Use the required GitHub PR checks on other platforms.',
    );
  if (existsSync(codeqlBinary(root))) {
    requireCodeql(root);
    console.log(`CodeQL ${CODEQL.version} is already installed.`);
    return;
  }
  const cache = join(root, '.cache', 'codeql');
  await mkdir(cache, { recursive: true });
  const staging = await mkdtemp(join(cache, 'install-'));
  try {
    console.log(`Downloading the pinned CodeQL ${CODEQL.version} bundle (about 693 MB).`);
    const response = await fetchImpl(CODEQL.url, { signal: AbortSignal.timeout(10 * 60 * 1000) });
    if (!response.ok) throw new Error(`CodeQL download failed: HTTP ${response.status}`);
    const archive = join(staging, 'bundle.tar.gz');
    await pipeline(Readable.fromWeb(response.body), createWriteStream(archive));
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(archive)) hash.update(chunk);
    if (hash.digest('hex') !== CODEQL.sha256)
      throw new Error('CodeQL checksum mismatch; the archive was not extracted.');
    run('tar', ['-xzf', archive, '-C', staging]);
    const extracted = join(staging, 'codeql');
    const version = JSON.parse(
      run(join(extracted, 'codeql'), ['version', '--format=json'], { capture: true }),
    ).version;
    if (version !== CODEQL.version)
      throw new Error('Downloaded CodeQL version does not match the pinned version.');
    await rename(extracted, join(cache, CODEQL.version));
    console.log(`Installed CodeQL ${CODEQL.version}.`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function scanCodeql(root, source) {
  const binary = requireCodeql(root);
  const temporary = await mkdtemp(join(tmpdir(), 'haze-codeql-'));
  const reports = join(root, 'security-reports', 'codeql-local');
  await mkdir(reports, { recursive: true });
  try {
    const database = join(temporary, 'database');
    const env = cleanGitEnvironment(root);
    run(
      binary,
      [
        'database',
        'create',
        database,
        '--language=javascript-typescript',
        `--source-root=${source}`,
      ],
      { env },
    );
    run(
      binary,
      [
        'database',
        'analyze',
        database,
        CODEQL.suite,
        '--format=sarif-latest',
        `--output=${join(reports, 'javascript.sarif')}`,
        `--threads=${Math.min(2, availableParallelism())}`,
      ],
      { env },
    );
    run(process.execPath, [join(projectRoot, 'tooling/check-codeql-report.js'), reports]);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] === 'setup') await setupCodeql();
    else if (process.argv[2] === 'scan') {
      const ref = process.argv[3];
      requireCodeql(projectRoot);
      await withSnapshot(projectRoot, ref ? { mode: 'commit', ref } : {}, (source) =>
        scanCodeql(projectRoot, source),
      );
    } else throw new Error('Usage: node tooling/codeql.js setup | scan [commit]');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
