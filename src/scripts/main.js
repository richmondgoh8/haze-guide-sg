import { createDashboardController } from './app/dashboard-controller.js';
import { createSnapshotClient } from './services/snapshot-client.js';
import { createRegionPreference } from './services/region-preference.js';
import { createDashboardView } from './ui/dashboard-view.js';

const dashboard = createDashboardController({
  client: createSnapshotClient(),
  preference: createRegionPreference(),
  view: createDashboardView(document),
});

document.addEventListener('visibilitychange', () => dashboard.setVisible(!document.hidden));
dashboard.start();
