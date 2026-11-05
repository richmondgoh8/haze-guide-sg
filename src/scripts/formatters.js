const singaporeTime = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const singaporeHour = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore',
  hour: 'numeric',
  hourCycle: 'h23',
});

export function formatTimestamp(timestamp) {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return 'time unavailable';
  return `${singaporeTime.format(new Date(timestamp))} SGT`;
}

export function getSingaporeHour(timestamp) {
  return Number(singaporeHour.format(new Date(timestamp)));
}
