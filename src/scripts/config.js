export const DEFAULT_REGION = 'east';
export const REGION_STORAGE_KEY = 'air-actually-region';
export const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 12_000;
export const READING_POLICY = {
  maxAgeMs: 2 * 60 * 60 * 1000,
  allowedClockSkewMs: 20 * 60 * 1000,
};

export const REGIONS = [
  { id: 'north', name: 'North', towns: 'Woodlands, Sembawang, Yishun, Punggol and Sengkang' },
  { id: 'south', name: 'South', towns: 'Queenstown, Bukit Merah, Orchard, the city and Sentosa' },
  { id: 'east', name: 'East', towns: 'Bedok, Tampines, Pasir Ris, Simei and East Coast' },
  { id: 'west', name: 'West', towns: 'Jurong, Clementi, Bukit Batok, Choa Chu Kang and Tuas' },
  {
    id: 'central',
    name: 'Central',
    towns: 'Ang Mo Kio, Bishan, Toa Payoh, Thomson and Serangoon Gardens',
  },
];

export function isRegion(value) {
  return REGIONS.some((region) => region.id === value);
}
