const singaporeTime = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatTimestamp(timestamp) {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return 'time unavailable';
  return `${singaporeTime.format(new Date(timestamp))} SGT`;
}
