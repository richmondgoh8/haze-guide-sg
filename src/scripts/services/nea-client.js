import { REGIONS, REQUEST_TIMEOUT_MS } from '../config.js';

const API_ROOT = 'https://api-open.data.gov.sg/v2/real-time/api';
const ENDPOINTS = {
  pm25: { path: 'pm25', field: 'pm25_one_hourly' },
  psi: { path: 'psi', field: 'psi_twenty_four_hourly' },
};

/** Convert the provider response into the small measurement shape used by the app. */
export function parseReading(payload, resource) {
  const endpoint = ENDPOINTS[resource];
  if (!endpoint) throw new Error(`Unknown measurement: ${resource}`);
  if (payload?.code !== 0 || !Array.isArray(payload.data?.items)) {
    throw new Error(`${resource}: invalid NEA response`);
  }

  const item = payload.data.items
    .filter((entry) => Number.isFinite(Date.parse(entry?.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
  const sourceValues = item?.readings?.[endpoint.field];
  if (!sourceValues || typeof sourceValues !== 'object' || Array.isArray(sourceValues)) {
    throw new Error(`${resource}: missing readings or valid timestamp`);
  }

  const values = Object.fromEntries(
    REGIONS.map(({ id }) => {
      const value = sourceValues[id];
      return [id, Number.isFinite(value) && value >= 0 ? value : null];
    }),
  );
  if (Object.values(values).every((value) => value === null)) {
    throw new Error(`${resource}: no valid regional values`);
  }
  return { timestamp: item.timestamp, values };
}

export function createNeaClient({
  fetchImpl = globalThis.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  async function requestReading(resource, parentSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort(parentSignal?.reason);
    if (parentSignal?.aborted) abort();
    else parentSignal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${API_ROOT}/${ENDPOINTS[resource].path}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`${resource}: HTTP ${response.status}`);
      return parseReading(await response.json(), resource);
    } finally {
      clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', abort);
    }
  }

  return {
    async loadLatest({ signal } = {}) {
      const resources = Object.keys(ENDPOINTS);
      // Both feeds settle independently; missing PSI must not suppress usable PM2.5.
      const results = await Promise.allSettled(resources.map((key) => requestReading(key, signal)));
      const snapshot = { pm25: null, psi: null, errors: [] };
      results.forEach((result, index) => {
        const resource = resources[index];
        if (result.status === 'fulfilled') snapshot[resource] = result.value;
        else
          snapshot.errors.push({ resource, message: result.reason?.message || 'Request failed' });
      });
      return snapshot;
    },
  };
}
