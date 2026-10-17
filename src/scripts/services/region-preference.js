import { DEFAULT_REGION, REGION_STORAGE_KEY, isRegion } from '../config.js';

export function createRegionPreference({ getStorage = () => globalThis.localStorage } = {}) {
  return {
    read() {
      try {
        const value = getStorage()?.getItem(REGION_STORAGE_KEY);
        return isRegion(value) ? value : DEFAULT_REGION;
      } catch {
        return DEFAULT_REGION;
      }
    },
    write(region) {
      if (!isRegion(region)) return;
      try {
        getStorage()?.setItem(REGION_STORAGE_KEY, region);
      } catch {
        // Region selection must still work when storage is blocked or full.
      }
    },
  };
}
