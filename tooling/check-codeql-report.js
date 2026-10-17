import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = process.argv[2] || 'security-reports/codeql';
const files = readdirSync(directory).filter((file) => file.endsWith('.sarif'));
if (files.length === 0) throw new Error('CodeQL did not produce a SARIF report');
let findings = 0;
for (const file of files) {
  const report = JSON.parse(readFileSync(join(directory, file), 'utf8'));
  if (!Array.isArray(report.runs) || report.runs.length === 0)
    throw new Error('CodeQL report has no runs');
  for (const run of report.runs) {
    if (!Array.isArray(run.results)) throw new Error('CodeQL report has no results array');
    if (run.invocations?.some((invocation) => invocation.executionSuccessful === false)) {
      throw new Error('CodeQL analysis did not complete successfully');
    }
    for (const result of run.results) {
      findings += 1;
      console.log(`${result.ruleId}: ${result.message?.text || 'Security finding'}`);
    }
  }
}
console.log(`CodeQL security findings: ${findings}`);
if (findings > 0) process.exitCode = 1;
