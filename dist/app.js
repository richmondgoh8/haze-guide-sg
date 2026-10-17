const PM_URL = 'https://api-open.data.gov.sg/v2/real-time/api/pm25';
const PSI_URL = 'https://api-open.data.gov.sg/v2/real-time/api/psi';
const REGIONS = ['north', 'south', 'east', 'west', 'central'];
const $ = (id) => document.getElementById(id);
let latest = null;
let loading = false;

function bandFor(value) {
  if (!Number.isFinite(value)) return null;
  if (value <= 55) return { name: 'Normal', className: 'normal', index: 1 };
  if (value <= 150) return { name: 'Elevated', className: 'elevated', index: 2 };
  if (value <= 250) return { name: 'High', className: 'high', index: 3 };
  return { name: 'Very high', className: 'very-high', index: 4 };
}

function psiLabel(value) {
  if (!Number.isFinite(value)) return 'Unavailable';
  if (value <= 50) return 'Good';
  if (value <= 100) return 'Moderate';
  if (value <= 200) return 'Unhealthy';
  if (value <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

const guidance = {
  1: { status: 'NORMAL · BAND 1', main: 'Carry on with your usual plans.', detail: 'Normal activities are fine for the next hour. Keep an eye on the reading if the haze changes.', vulnerable: 'Normal activities are generally fine. Follow your own care plan if you have symptoms.' },
  2: { status: 'ELEVATED · BAND 2', main: 'Take the strenuous stuff indoors.', detail: 'Reduce strenuous outdoor activity for the next hour. A gentler or indoor option makes sense.', vulnerable: 'Avoid strenuous outdoor activity for the next hour.' },
  3: { status: 'HIGH · BAND 3', main: 'Skip the outdoor workout.', detail: 'Avoid strenuous outdoor activity for the next hour. Choose an indoor alternative where possible.', vulnerable: 'Avoid all outdoor activity for the next hour. If going out is unavoidable, a well-fitting respirator may reduce exposure.' },
  4: { status: 'VERY HIGH · BAND 4', main: 'Keep outdoor time to a minimum.', detail: 'Minimise all outdoor activity for the next hour. If you must go out, a well-fitting respirator may reduce exposure.', vulnerable: 'Avoid all outdoor activity for the next hour. If going out is unavoidable, a well-fitting respirator may reduce exposure.' }
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
  const stale = age > 2 * 60 * 60 * 1000 || age < -20 * 60 * 1000;
  const hasBoth = Number.isFinite(pm) && Number.isFinite(psi);
  $('status-dot').className = `status-dot ${hasBoth && !stale ? 'ok' : 'warn'}`;
  $('data-status-text').textContent = !latest ? 'Live readings unavailable. Try refreshing or check haze.gov.sg.' : `NEA reading: ${sgtTime(timestamp)}${stale ? ' · May be outdated — check the official site' : ''}${!hasBoth ? ' · Some data unavailable' : ''}`;

  const advice = band && !stale ? guidance[band.index] : null;
  $('action-status').textContent = advice?.status || 'READING UNAVAILABLE';
  $('action-main').textContent = advice?.main || 'Check the latest official reading before heading out.';
  $('action-detail').textContent = advice?.detail || 'This feed is unavailable or outdated. Open haze.gov.sg for current advice.';
  $('action-vulnerable').textContent = advice?.vulnerable || 'If you have symptoms or higher health risk, use the official guidance and your care plan.';

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
