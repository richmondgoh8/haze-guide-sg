import {
  ACTIVITY_GUIDANCE,
  classifyPm25,
  describePsi,
  getWindowAdvice,
  isCurrentReading,
} from './air-quality.js';

const API_ROOT = 'https://api-open.data.gov.sg/v2/real-time/api';
const REGIONS = ['north', 'south', 'east', 'west', 'central'];
const REGION_TOWNS = {
  north: 'Woodlands, Sembawang, Yishun, Punggol and Sengkang',
  south: 'Queenstown, Bukit Merah, Orchard, the city and Sentosa',
  east: 'Bedok, Tampines, Pasir Ris, Simei and East Coast',
  west: 'Jurong, Clementi, Bukit Batok, Choa Chu Kang and Tuas',
  central: 'Ang Mo Kio, Bishan, Toa Payoh, Thomson and Serangoon Gardens',
};
const REGION_STORAGE_KEY = 'air-actually-region';
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
const getElement = (id) => document.getElementById(id);
const regionSelect = getElement('region');
const refreshButton = getElement('refresh');
const checklistInputs = [...document.querySelectorAll('.plan-check')];

let readings = { pm25: null, psi: null };
let requestPending = false;
let checklistReading = null;

function regionName(region) {
  return region[0].toUpperCase() + region.slice(1);
}

function formatTimestamp(timestamp) {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return 'time unavailable';
  return (
    new Intl.DateTimeFormat('en-SG', {
      timeZone: 'Asia/Singapore',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(timestamp)) + ' SGT'
  );
}

function selectRegion(region) {
  if (!REGIONS.includes(region)) return;
  regionSelect.value = region;
  try {
    localStorage.setItem(REGION_STORAGE_KEY, region);
  } catch {
    // A blocked storage API should not prevent region selection.
  }
  render();
}

function renderReadingStatus(pm25, psi, current) {
  const timestamps = [];
  if (readings.pm25) timestamps.push(`PM2.5: ${formatTimestamp(readings.pm25.timestamp)}`);
  if (readings.psi) timestamps.push(`PSI: ${formatTimestamp(readings.psi.timestamp)}`);
  const missing = [];
  if (!classifyPm25(pm25)) missing.push('PM2.5 unavailable');
  if (describePsi(psi) === 'Unavailable') missing.push('PSI unavailable');
  if (readings.pm25 && !current) missing.push('PM2.5 reading is out of date');
  if (readings.psi && !isCurrentReading(readings.psi.timestamp))
    missing.push('PSI reading is out of date');

  getElement('status-dot').className = `status-dot ${missing.length ? 'warn' : 'ok'}`;
  getElement('data-status-text').textContent = [...timestamps, ...missing].join(' · ');
}

function renderHazeLevel(band, current) {
  const activeBand = current ? band : null;
  getElement('pm-band').textContent = activeBand ? activeBand.title : 'Current advice unavailable';
  getElement('pm-band').className = `band-pill ${activeBand?.className || ''}`;
  getElement('pm-card').dataset.band = activeBand?.className || '';
  getElement('pm-category').textContent = band
    ? `NEA category: ${band.name} · Band ${band.index}${current ? '' : ' · Last reported'}`
    : 'NEA category unavailable';
  getElement('level-caption').textContent = activeBand
    ? `Haze level ${band.index} of 4. ${band.title}.`
    : 'No current level. Check the latest official reading.';

  for (const step of document.querySelectorAll('.severity-step')) {
    const selected = Number(step.dataset.level) === activeBand?.index;
    step.classList.toggle('is-current', selected);
    if (selected) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
    step.querySelector('.level-marker').textContent = selected ? 'Current level' : '';
  }
}

function renderActivity(band, current, region) {
  const advice = current && band ? ACTIVITY_GUIDANCE[band.index] : null;
  getElement('action-region').textContent = `${regionName(region)} · Next hour`;
  getElement('action-status').textContent = advice ? band.title : 'READING UNAVAILABLE';
  getElement('action-main').textContent =
    advice?.main || 'Check the latest reading before heading out.';
  getElement('action-detail').textContent =
    advice?.detail || 'The feed is missing or out of date. Check haze.gov.sg for current advice.';
  getElement('action-vulnerable').textContent =
    advice?.vulnerable || 'Follow your care plan and check the official advisory.';
  getElement('outdoor-verdict').textContent = advice
    ? `${regionName(region)}: ${advice.main}`
    : 'No current recommendation. Check the official reading.';
  getElement('outdoor-summary').dataset.band = advice ? band.className : 'unavailable';
  getElement('activity-walk').textContent = advice?.walk || 'Check haze.gov.sg before heading out.';
  getElement('activity-exercise').textContent =
    advice?.exercise || 'A current reading is needed for activity advice.';
  getElement('activity-mask').textContent =
    advice?.mask || 'Check the official advisory and the mask guide below.';
  getElement('exercise-verdict').textContent =
    advice?.exerciseTitle || 'Check before exercising outside';
  getElement('exercise-detail').textContent =
    advice?.exercise || 'Wait for a current reading or check haze.gov.sg.';
  getElement('exercise-alternative').textContent =
    advice?.alternative || 'Check the latest reading before choosing an activity.';
  getElement('plan-outdoors-detail').textContent =
    advice?.exerciseTitle || 'A current reading is needed.';
}

function renderWindowAdvice(pm25, timestamp) {
  const advice = getWindowAdvice(pm25, timestamp);
  getElement('window-card').dataset.state = advice.state;
  getElement('window-verdict').textContent = advice.title;
  getElement('window-detail').textContent = advice.detail;
  getElement('plan-windows-detail').textContent = advice.title;
}

function renderChecklist(key) {
  if (checklistReading !== key) {
    checklistInputs.forEach((input) => {
      input.checked = false;
    });
    checklistReading = key;
  }
  checklistInputs.forEach((input) => {
    input.disabled = key === null;
  });
  const checked = checklistInputs.filter((input) => input.checked).length;
  getElement('plan-progress').value = checked;
  getElement('plan-count').textContent = `${checked} of 3 checked`;
  getElement('plan-status').textContent =
    key === null
      ? 'The checklist will be available when a current reading arrives.'
      : checked === 3
        ? 'All three reminders checked for this reading.'
        : 'Tick each reminder after you have made your plan.';
}

function renderRegions() {
  const current = isCurrentReading(readings.pm25?.timestamp);
  for (const region of REGIONS) {
    const button = document.querySelector(`[data-region="${region}"]`);
    const value = readings.pm25?.readings.pm25_one_hourly?.[region];
    const band = classifyPm25(value);
    const selected = region === regionSelect.value;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.region-value').textContent = band ? value : '—';
    button.querySelector('.region-band').textContent = band
      ? current
        ? band.shortLabel
        : 'Old reading'
      : 'Unavailable';
    button.querySelector('.region-band').className = `region-band ${band?.className || ''}`;
  }
}

function render() {
  const region = regionSelect.value;
  const pm25 = readings.pm25?.readings.pm25_one_hourly?.[region];
  const psi = readings.psi?.readings.psi_twenty_four_hourly?.[region];
  const band = classifyPm25(pm25);
  const current = isCurrentReading(readings.pm25?.timestamp);

  getElement('region-towns').textContent =
    `${regionName(region)} includes ${REGION_TOWNS[region]}.`;
  getElement('pm-value').textContent = band ? pm25 : '—';
  getElement('psi-value').textContent = describePsi(psi) !== 'Unavailable' ? psi : '—';
  getElement('psi-band').textContent = describePsi(psi);
  getElement('plan-reading-detail').textContent =
    current && band
      ? `${regionName(region)} · ${formatTimestamp(readings.pm25.timestamp)}`
      : 'Waiting for a current reading.';

  renderReadingStatus(pm25, psi, current);
  renderHazeLevel(band, current);
  renderActivity(band, current, region);
  renderWindowAdvice(pm25, readings.pm25?.timestamp);
  renderChecklist(current && band ? `${region}:${readings.pm25.timestamp}:${pm25}` : null);
  renderRegions();
}

async function fetchReading(endpoint, signal) {
  const response = await fetch(`${API_ROOT}/${endpoint}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
  const payload = await response.json();
  const item = payload?.data?.items?.[0];
  if (payload.code !== 0 || !item?.readings || !item?.timestamp) {
    throw new Error(`${endpoint}: missing reading or timestamp`);
  }
  return item;
}

async function refreshReadings() {
  if (requestPending) return;
  requestPending = true;
  refreshButton.disabled = true;
  refreshButton.classList.add('is-loading');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // PSI failure must not discard a usable PM2.5 reading.
    const [pm25, psi] = await Promise.allSettled([
      fetchReading('pm25', controller.signal),
      fetchReading('psi', controller.signal),
    ]);
    readings = {
      pm25: pm25.status === 'fulfilled' ? pm25.value : null,
      psi: psi.status === 'fulfilled' ? psi.value : null,
    };
    for (const result of [pm25, psi]) {
      if (result.status === 'rejected') console.warn('NEA request failed:', result.reason.message);
    }
  } finally {
    clearTimeout(timeout);
    requestPending = false;
    refreshButton.disabled = false;
    refreshButton.classList.remove('is-loading');
    render();
  }
}

try {
  const savedRegion = localStorage.getItem(REGION_STORAGE_KEY);
  if (REGIONS.includes(savedRegion)) regionSelect.value = savedRegion;
} catch {
  // Keep the HTML default when browser storage is unavailable.
}

regionSelect.addEventListener('change', () => selectRegion(regionSelect.value));
getElement('regional-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-region]');
  if (button) selectRegion(button.dataset.region);
});
refreshButton.addEventListener('click', refreshReadings);
checklistInputs.forEach((input) =>
  input.addEventListener('change', () => renderChecklist(checklistReading)),
);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    render();
    refreshReadings();
  }
});
setInterval(() => {
  if (!document.hidden) refreshReadings();
}, REFRESH_INTERVAL_MS);

refreshReadings();
