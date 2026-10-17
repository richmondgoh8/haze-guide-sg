const PM_URL = 'https://api-open.data.gov.sg/v2/real-time/api/pm25';
const PSI_URL = 'https://api-open.data.gov.sg/v2/real-time/api/psi';
const REGIONS = ['north', 'south', 'east', 'west', 'central'];
const $ = (id) => document.getElementById(id);
let latest = null;
let loading = false;

function bandFor(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  if (value <= 55) return { name: 'Normal', className: 'normal', index: 1 };
  if (value <= 150) return { name: 'Elevated', className: 'elevated', index: 2 };
  if (value <= 250) return { name: 'High', className: 'high', index: 3 };
  return { name: 'Very high', className: 'very-high', index: 4 };
}

function psiLabel(value) {
  if (!Number.isFinite(value) || value < 0) return 'Unavailable';
  if (value <= 50) return 'Good';
  if (value <= 100) return 'Moderate';
  if (value <= 200) return 'Unhealthy';
  if (value <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

const guidance = {
  1: {
    status: 'NORMAL · BAND 1', main: 'Outdoor activities are generally okay.',
    detail: 'The official guide allows normal activity for the next hour. Recheck if conditions change.',
    walk: 'Carry on with your normal activities.', exercise: 'Normal outdoor exercise can continue if you feel well.',
    mask: 'Generally unnecessary for routine commuting or indoors. No need to buy a higher-rated mask for normal air.',
    vulnerable: 'Normal activities can continue. Follow your care plan and seek advice if you develop symptoms.'
  },
  2: {
    status: 'ELEVATED · BAND 2', main: 'Go easier outdoors. Reduce strenuous activity.',
    detail: 'Keep the intensity down for the next hour. Moving a hard workout indoors is a practical alternative.',
    walk: 'Keep outdoor activity light; consider a shorter outing if you feel irritation.', exercise: 'Reduce strenuous activity such as hard running, fast cycling or competitive sport.',
    mask: 'A respirator is generally unnecessary for a short commute. Reduce exposure first; a higher filter rating is not a reason to exercise harder.',
    vulnerable: 'Avoid strenuous outdoor activity for the next hour.'
  },
  3: {
    status: 'HIGH · BAND 3', main: 'Avoid strenuous outdoor activity.',
    detail: 'Choose an indoor workout for the next hour. Limit exposure according to your health, symptoms and how long you need to be outside.',
    walk: 'Keep necessary activity brief and gentle. Higher-risk people should avoid all outdoor activity.', exercise: 'Avoid strenuous outdoor exercise, including hard running or cycling.',
    mask: 'For prolonged exposure, or unavoidable outings for higher-risk people, a well-fitting N95 / KN95 / KF94 / FFP2 can reduce exposure. Choose a genuine model that seals well.',
    vulnerable: 'Avoid all outdoor activity for the next hour. For unavoidable exposure, a well-fitting respirator may help; consult a doctor where appropriate.'
  },
  4: {
    status: 'VERY HIGH · BAND 4', main: 'Minimise all outdoor activity.',
    detail: 'Stay indoors as much as possible for the next hour. Postpone optional outings and exercise.',
    walk: 'Minimise time outside; higher-risk people should avoid outdoor activity.', exercise: 'Postpone outdoor exercise. Use an indoor alternative.',
    mask: 'For unavoidable outdoor activity, consider a well-fitting N95 / KN95 / KF94 / FFP2. A higher rating is optional; it does not replace reducing exposure.',
    vulnerable: 'Avoid all outdoor activity for the next hour. Seek medical advice if you feel unwell.'
  }
};

function sgtTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'time unavailable';
  return new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(date) + ' SGT';
}

function currentRegion() { return $('region').value; }

function render() {
  const region = currentRegion();
  $('action-region').textContent = `${region.toUpperCase()} · NEXT HOUR`;
  const pm = latest?.pm?.readings?.pm25_one_hourly?.[region];
  const psi = latest?.psi?.readings?.psi_twenty_four_hourly?.[region];
  const band = bandFor(pm);
  $('pm-value').textContent = Number.isFinite(pm) ? pm : '—';
  $('psi-value').textContent = Number.isFinite(psi) ? psi : '—';
  $('psi-band').textContent = psiLabel(psi);
  $('pm-band').textContent = band ? `${band.name} · Band ${band.index}` : 'Unavailable';
  $('pm-band').className = `band-pill ${band?.className || ''}`;
  $('pm-card').dataset.band = band?.className || '';

  const timestamp = latest?.pm?.timestamp;
  const age = timestamp ? Date.now() - new Date(timestamp).getTime() : Infinity;
  const stale = !Number.isFinite(age) || age > 2 * 60 * 60 * 1000 || age < -20 * 60 * 1000;
  const hasBoth = Number.isFinite(pm) && Number.isFinite(psi);
  $('status-dot').className = `status-dot ${hasBoth && !stale ? 'ok' : 'warn'}`;
  $('data-status-text').textContent = !latest ? 'Live readings unavailable. Try refreshing or check haze.gov.sg.' : `NEA reading: ${sgtTime(timestamp)}${stale ? ' · May be outdated — check the official site' : ''}${!hasBoth ? ' · Some data unavailable' : ''}`;

  const advice = band && !stale ? guidance[band.index] : null;
  $('action-status').textContent = advice?.status || 'READING UNAVAILABLE';
  $('action-main').textContent = advice?.main || 'Check the latest official reading before heading out.';
  $('action-detail').textContent = advice?.detail || 'This feed is unavailable or outdated. Open haze.gov.sg for current advice.';
  $('action-vulnerable').textContent = advice?.vulnerable || 'If you have symptoms or higher health risk, use the official guidance and your care plan.';
  $('outdoor-verdict').textContent = advice ? `${region[0].toUpperCase() + region.slice(1)}: ${advice.main}` : 'No current recommendation — check the latest official reading.';
  $('outdoor-summary').dataset.band = advice ? band.className : 'unavailable';
  $('activity-walk').textContent = advice?.walk || 'Check haze.gov.sg before heading out.';
  $('activity-exercise').textContent = advice?.exercise || 'A current reading is needed to give activity guidance.';
  $('activity-mask').textContent = advice?.mask || 'Use the official advisory and the mask guide below.';

  const list = $('regional-list');
  list.replaceChildren(...REGIONS.map(name => {
    const value = latest?.pm?.readings?.pm25_one_hourly?.[name];
    const readingBand = bandFor(value);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `region-item ${name === region ? 'selected' : ''}`;
    button.setAttribute('aria-pressed', String(name === region));
    button.innerHTML = `<span class="region-name">${name[0].toUpperCase() + name.slice(1)}</span><span class="region-reading">${Number.isFinite(value) ? value : '—'} <small>µg/m³</small></span><span class="region-band ${readingBand?.className || ''}">${readingBand?.name || 'Unavailable'}</span><span class="region-arrow" aria-hidden="true">↗</span>`;
    button.addEventListener('click', () => { $('region').value = name; try { localStorage.setItem('air-actually-region', name); } catch {} render(); });
    return button;
  }));
}

async function fetchReading(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const item = payload?.data?.items?.[0];
  if (payload.code !== 0 || !item?.readings || !item?.timestamp) throw new Error('Unexpected NEA response');
  return item;
}

async function refresh() {
  if (loading) return;
  loading = true;
  $('refresh').disabled = true;
  $('refresh').classList.add('is-loading');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const [pm, psi] = await Promise.all([fetchReading(PM_URL, controller.signal), fetchReading(PSI_URL, controller.signal)]);
    latest = { pm, psi };
  } catch (error) {
    console.warn('NEA reading unavailable:', error.message);
    latest = null;
  } finally {
    clearTimeout(timeout);
    loading = false;
    $('refresh').disabled = false;
    $('refresh').classList.remove('is-loading');
    render();
  }
}

try { const saved = localStorage.getItem('air-actually-region'); if (REGIONS.includes(saved)) $('region').value = saved; } catch {}
$('region').addEventListener('change', () => { try { localStorage.setItem('air-actually-region', currentRegion()); } catch {} render(); });
$('refresh').addEventListener('click', refresh);
document.addEventListener('visibilitychange', () => { if (!document.hidden && (!latest || Date.now() - new Date(latest.pm.timestamp).getTime() > 15 * 60 * 1000)) refresh(); });
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 15 * 60 * 1000);
