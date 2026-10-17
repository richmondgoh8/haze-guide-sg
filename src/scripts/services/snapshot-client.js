import { REQUEST_TIMEOUT_MS } from '../config.js';
import { parseSnapshot } from '../domain/reading-snapshot.js';

export function createSnapshotClient({
  fetchImpl = globalThis.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  return {
    async loadLatest({ signal } = {}) {
      const controller = new AbortController();
      const abort = () => controller.abort(signal?.reason);
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(abort, timeoutMs);
      try {
        const response = await fetchImpl(`${import.meta.env?.BASE_URL ?? './'}data/latest.json`, {
          signal: controller.signal,
          cache: 'no-cache',
          credentials: 'omit',
          redirect: 'error',
        });
        if (!response.ok) throw new Error(`Reading snapshot: HTTP ${response.status}`);
        return parseSnapshot(await response.json());
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
      }
    },
  };
}
