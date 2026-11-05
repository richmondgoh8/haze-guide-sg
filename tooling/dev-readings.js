import { createNeaClient } from '../src/scripts/services/nea-client.js';
import { mergeSnapshot } from './publish-snapshot.js';

export const DEV_SNAPSHOT_REFRESH_MS = 15 * 60 * 1000;

export const EMPTY_SNAPSHOT = Object.freeze({
  version: 1,
  generatedAt: null,
  readings: { pm25: null, psi: null, uv: null },
});

/** Fetch live readings for local development without exposing an upstream call in production. */
export function createDevReadings({
  client = createNeaClient(),
  now = Date.now,
  refreshMs = DEV_SNAPSHOT_REFRESH_MS,
  warn = console.warn,
} = {}) {
  let snapshot = null;
  let freshUntil = 0;
  let pending = null;

  async function refresh() {
    try {
      const latest = await client.loadLatest();
      for (const error of latest.errors) {
        warn(`Local readings: ${error.resource} unavailable (${error.message})`);
      }
      snapshot = mergeSnapshot(latest, snapshot?.readings, now());
      freshUntil = now() + refreshMs;
    } catch (error) {
      warn(`Local readings unavailable: ${error.message}`);
    }
    return snapshot ?? EMPTY_SNAPSHOT;
  }

  function load() {
    if (snapshot && now() < freshUntil) return Promise.resolve(snapshot);
    pending ??= refresh().finally(() => {
      pending = null;
    });
    return pending;
  }

  return { load };
}

/** Serve a live snapshot at the same URL the built site uses. */
export function devReadingsPlugin() {
  return {
    name: 'dev-live-readings',
    apply: 'serve',
    configureServer(server) {
      const readings = createDevReadings();
      readings.load().catch(() => {});
      server.middlewares.use((request, response, next) => {
        const path = (request.url ?? '').split('?')[0];
        if (path !== '/data/latest.json') return next();
        readings
          .load()
          .then((snapshot) => {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.setHeader('Cache-Control', 'no-store');
            response.end(JSON.stringify(snapshot));
          })
          .catch((error) => next(error));
      });
    },
  };
}
