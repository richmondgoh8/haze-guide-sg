import { REFRESH_INTERVAL_MS, isRegion } from '../config.js';
import { createDashboardModel } from '../domain/dashboard-model.js';
import { chooseActivityPhrases } from '../domain/activity-phrases.js';

export function createDashboardController({
  client,
  preference,
  view,
  now = Date.now,
  scheduler = globalThis,
  random = Math.random,
}) {
  const state = {
    region: preference.read(),
    readings: { pm25: null, psi: null },
    loading: false,
    phraseChoices: chooseActivityPhrases(random),
  };
  let visible = true;
  let started = false;
  let disposed = false;
  let pending = null;
  let requestController;
  let interval;
  let unbind;

  function render() {
    if (!disposed) view.render(createDashboardModel(state, now()));
  }

  function selectRegion(region) {
    if (disposed || !isRegion(region)) return;
    state.region = region;
    preference.write(region);
    render();
  }

  function refresh() {
    if (disposed) return Promise.resolve();
    if (pending) return pending;
    state.loading = true;
    render();
    requestController = new AbortController();
    pending = Promise.resolve()
      .then(() => client.loadLatest({ signal: requestController.signal }))
      .then((readings) => {
        if (!disposed) state.readings = readings;
      })
      .catch(() => {
        if (!disposed) state.readings = { pm25: null, psi: null };
      })
      .finally(() => {
        pending = null;
        state.loading = false;
        render();
      });
    return pending;
  }

  return {
    start() {
      if (started || disposed) return pending ?? Promise.resolve();
      started = true;
      unbind = view.bind({ onRegionChange: selectRegion, onRefresh: refresh });
      interval = scheduler.setInterval(() => {
        if (visible) refresh();
      }, REFRESH_INTERVAL_MS);
      return refresh();
    },
    refresh,
    selectRegion,
    setVisible(value) {
      visible = value;
      if (visible && !disposed) {
        render();
        return refresh();
      }
      return Promise.resolve();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      scheduler.clearInterval(interval);
      requestController?.abort();
      unbind?.();
    },
  };
}
