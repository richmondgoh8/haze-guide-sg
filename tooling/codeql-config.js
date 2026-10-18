import { pathToFileURL } from 'node:url';

export const CODEQL = Object.freeze({
  version: '2.27.2',
  url: 'https://github.com/github/codeql-action/releases/download/codeql-bundle-v2.27.2/codeql-bundle-linux64.tar.gz',
  sha256: 'f002864be6dd8d5d7bdb123aaf7291ec8e291012bd9f70b6d2362f730db52aeb',
  suite: 'codeql/javascript-queries:codeql-suites/javascript-security-extended.qls',
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`url=${CODEQL.url}`);
}
