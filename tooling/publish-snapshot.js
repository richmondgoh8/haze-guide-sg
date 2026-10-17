import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { READING_POLICY, REQUEST_TIMEOUT_MS } from '../src/scripts/config.js';
import { normalizeMeasurement, parseSnapshot } from '../src/scripts/domain/reading-snapshot.js';
import { createNeaClient } from '../src/scripts/services/nea-client.js';
import { SITE } from './site-pages.js';

export function mergeSnapshot(latest, previous, now = Date.now()) {
  const readings = {};
  for (const resource of ['pm25', 'psi']) {
    const candidates = [latest?.[resource], previous?.[resource]]
      .map(normalizeMeasurement)
      .filter(
        (value) => value && Date.parse(value.timestamp) <= now + READING_POLICY.allowedClockSkewMs,
      )
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    readings[resource] = candidates[0] ?? null;
  }
  if (!readings.pm25 && !readings.psi)
    throw new Error('No validated readings available; keep the existing deployment.');
  return { version: 1, generatedAt: new Date(now).toISOString(), readings };
}

export async function collectSnapshot({ fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  let previous = null;
  try {
    const response = await fetchImpl(new URL('data/latest.json', SITE.url), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-cache',
      credentials: 'omit',
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    previous = parseSnapshot(await response.json());
  } catch {
    console.warn('Previous snapshot unavailable; a valid upstream reading is required.');
  }
  const latest = await createNeaClient({ fetchImpl }).loadLatest();
  for (const error of latest.errors) console.warn(`Feed unavailable: ${error.resource}`);
  return mergeSnapshot(latest, previous, now);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const snapshot = await collectSnapshot();
  await mkdir('dist/data', { recursive: true });
  await writeFile('dist/data/latest.json', `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Published snapshot: PM2.5 ${snapshot.readings.pm25?.timestamp ?? 'unavailable'}; PSI ${snapshot.readings.psi?.timestamp ?? 'unavailable'}`,
  );
}
