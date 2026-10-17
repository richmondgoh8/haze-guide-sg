import { REGIONS } from '../config.js';
import { ACTIVITY_GUIDANCE, UNAVAILABLE_ACTIVITY } from '../content/advice.js';
import { formatTimestamp } from '../formatters.js';
import { classifyPm25, describePsi, getWindowAdvice, isCurrentReading } from './air-quality.js';
import { describeBandPosition } from './band-position.js';

/** Select advice and display values without depending on the browser or NEA's payload format. */
export function createDashboardModel({ readings, region, loading = false }, now = Date.now()) {
  const selectedRegion = REGIONS.find(({ id }) => id === region);
  if (!selectedRegion) throw new Error(`Unknown region: ${region}`);
  const pm25 = readings.pm25?.values[region];
  const psi = readings.psi?.values[region];
  const band = classifyPm25(pm25);
  const current = Boolean(band && isCurrentReading(readings.pm25?.timestamp, now));
  const activeBand = current ? band : null;
  const advice = activeBand ? ACTIVITY_GUIDANCE[band.index] : UNAVAILABLE_ACTIVITY;

  const status = [];
  const warnings = [];
  if (readings.pm25) status.push(`PM2.5: ${formatTimestamp(readings.pm25.timestamp)}`);
  if (readings.psi) status.push(`PSI: ${formatTimestamp(readings.psi.timestamp)}`);
  if (!band) warnings.push('PM2.5 unavailable');
  if (describePsi(psi) === 'Unavailable') warnings.push('PSI unavailable');
  if (readings.pm25 && !isCurrentReading(readings.pm25.timestamp, now)) {
    warnings.push('PM2.5 reading is out of date');
  }
  if (readings.psi && !isCurrentReading(readings.psi.timestamp, now)) {
    warnings.push('PSI reading is out of date');
  }

  return {
    loading,
    region: selectedRegion,
    pm25: {
      value: band ? pm25 : '—',
      title: activeBand?.title || 'Current advice unavailable',
      className: activeBand?.className || '',
      category: band
        ? `NEA category: ${band.name} · Band ${band.index}${current ? '' : ' · Last reported'}`
        : 'NEA category unavailable',
    },
    psi: { value: describePsi(psi) !== 'Unavailable' ? psi : '—', label: describePsi(psi) },
    status: {
      warning: warnings.length > 0,
      text:
        loading && !readings.pm25 && !readings.psi
          ? 'Checking official NEA readings…'
          : [...status, ...warnings].join(' · '),
    },
    severity: {
      position: activeBand ? describeBandPosition(pm25) : null,
      activeLevel: activeBand?.index ?? null,
      caption: activeBand
        ? `Haze level ${band.index} of 4. ${band.title}.`
        : 'No current level. Check the latest official reading.',
    },
    activity: {
      ...advice,
      exerciseDetail: activeBand
        ? advice.exercise
        : 'Wait for a current reading or check haze.gov.sg.',
      status: activeBand?.title || 'READING UNAVAILABLE',
      className: activeBand?.className || 'unavailable',
      summary: activeBand
        ? `${selectedRegion.name}: ${advice.main}`
        : 'No current recommendation. Check the official reading.',
    },
    windows: getWindowAdvice(pm25, readings.pm25?.timestamp, now),
    regions: REGIONS.map((item) => {
      const value = readings.pm25?.values[item.id];
      const regionBand = classifyPm25(value);
      return {
        ...item,
        value: regionBand ? value : '—',
        selected: item.id === region,
        className: regionBand?.className || '',
        label: regionBand
          ? isCurrentReading(readings.pm25?.timestamp, now)
            ? regionBand.shortLabel
            : 'Old reading'
          : 'Unavailable',
      };
    }),
  };
}
