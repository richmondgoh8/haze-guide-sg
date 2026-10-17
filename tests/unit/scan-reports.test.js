import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

function temporaryReports(context) {
  const directory = mkdtempSync(join(tmpdir(), 'haze-scan-reports-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('CodeQL gate rejects findings, missing reports and unsuccessful analyses', (context) => {
  const directory = temporaryReports(context);
  const script = new URL('../../tooling/check-codeql-report.js', import.meta.url);
  const check = () =>
    spawnSync(process.execPath, [script.pathname, directory], { encoding: 'utf8' });
  assert.notEqual(check().status, 0);
  for (const [run, expected] of [
    [{ results: [], invocations: [{ executionSuccessful: true }] }, 0],
    [{ results: [{ ruleId: 'test-rule', message: { text: 'Finding' } }] }, 1],
    [{ results: [], invocations: [{ executionSuccessful: false }] }, 1],
    [{}, 1],
  ]) {
    writeFileSync(join(directory, 'javascript.sarif'), JSON.stringify({ runs: [run] }));
    assert.equal(check().status, expected);
  }
});

test('ZAP gate preserves medium warnings and rejects high-risk or unusable reports', (context) => {
  const directory = temporaryReports(context);
  const file = join(directory, 'zap.json');
  const script = new URL('../../tooling/check-zap-report.js', import.meta.url);
  const check = (report) => {
    writeFileSync(file, JSON.stringify(report));
    return spawnSync(process.execPath, [script.pathname, file], { encoding: 'utf8' });
  };
  assert.equal(check({ site: [{ alerts: [] }] }).status, 0);
  const medium = check({
    site: [
      {
        alerts: [{ riskcode: '2', riskdesc: 'Medium', alert: 'Header missing', pluginid: 'test' }],
      },
    ],
  });
  assert.equal(medium.status, 0);
  assert.match(medium.stdout, /open security findings/);
  assert.match(medium.stdout, /"medium":1/);
  assert.equal(
    check({
      site: [{ alerts: [{ riskcode: '3', riskdesc: 'High', alert: 'Finding', pluginid: 'test' }] }],
    }).status,
    1,
  );
  assert.notEqual(check({ site: [] }).status, 0);
  assert.notEqual(check({ site: [{ alerts: [{ riskcode: 'unexpected' }] }] }).status, 0);
});
