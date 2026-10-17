import { readFileSync, appendFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(process.argv[2] || 'security-reports/zap.json', 'utf8'));
if (!Array.isArray(report.site) || report.site.length === 0) {
  throw new Error('ZAP did not produce a usable site report');
}
const alerts = report.site.flatMap((site) => site.alerts || []);
const counts = { high: 0, medium: 0, low: 0, informational: 0 };
for (const alert of alerts) {
  const risk = Number(alert.riskcode);
  if (![0, 1, 2, 3].includes(risk)) throw new Error(`Unknown ZAP risk: ${alert.riskcode}`);
  counts[['informational', 'low', 'medium', 'high'][risk]] += 1;
  console.log(`${alert.riskdesc}: ${alert.alert} [${alert.pluginid}]`);
}
console.log(JSON.stringify({ scanner: 'ZAP passive baseline', ...counts }));
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = alerts
    .map((alert) => `| ${alert.riskdesc} | ${alert.alert} | ${alert.pluginid} |`)
    .join('\n');
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Passive scan findings\n\nThis is not a penetration-test certification. The CI gate fails on high-risk alerts. All medium/low alerts remain open for review; they are not silently ignored. Download the ZAP report artifact for evidence.\n\n| Risk | Finding | Rule |\n| --- | --- | --- |\n${rows}\n`,
  );
}
if (alerts.some((alert) => Number(alert.riskcode) > 0)) {
  console.log(
    '::warning::ZAP reported open security findings. A successful high-risk gate is not an all-clear.',
  );
}
if (counts.high > 0) process.exitCode = 1;
