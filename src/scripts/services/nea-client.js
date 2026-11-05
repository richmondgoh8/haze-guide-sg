import { REGIONS, REQUEST_TIMEOUT_MS } from '../config.js';

const API_ROOT = 'https://api-open.data.gov.sg/v2/real-time/api';
const ENDPOINTS = {
  pm25: { path: 'pm25', field: 'pm25_one_hourly' },
  psi: { path: 'psi', field: 'psi_twenty_four_hourly' },
  uv: { path: 'uv', parser: parseUv },
};

/** Convert the provider response into the small measurement shape used by the app. */
export function parseReading(payload, resource) {
  const endpoint = ENDPOINTS[resource];
  if (!endpoint) throw new Error(`Unknown measurement: ${resource}`);
  if (endpoint.parser) return endpoint.parser(payload);
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

/** UV is island-wide and arrives as hourly points rather than regional values. */
export function parseUv(payload) {
  if (payload?.code !== 0 || !Array.isArray(payload.data?.records)) {
    throw new Error('uv: invalid NEA response');
  }
  const point = payload.data.records
    .flatMap((record) => (Array.isArray(record?.index) ? record.index : []))
    .filter(
      (entry) =>
        Number.isFinite(Date.parse(entry?.hour)) &&
        Number.isFinite(entry?.value) &&
        entry.value >= 0,
    )
    .sort((a, b) => Date.parse(b.hour) - Date.parse(a.hour))[0];
  if (!point) throw new Error('uv: missing readings or valid timestamp');
  return { timestamp: point.hour, value: point.value };
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
        credentials: 'omit',
        redirect: 'error',
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
      // Feeds settle independently; one failure must not suppress the usable readings.
      const results = await Promise.allSettled(resources.map((key) => requestReading(key, signal)));
      const snapshot = { pm25: null, psi: null, uv: null, errors: [] };
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
