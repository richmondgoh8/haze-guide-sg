# Security assessment — 17 October 2026

Status: application hardening and functional checks passed. The independent passive scan has open hosting/header findings; this is **not an all-clear**. CodeQL's initial test-assertion findings have been corrected and are awaiting the final rescan. This is not a certified or comprehensive manual VAPT.

## Scope

The tracked source and reachable Git history, locked npm dependencies, generated static build, all four pages, dashboard data boundaries and the project's own public GitHub Pages path. No login, database or authenticated backend exists. No tests target NEA/data.gov.sg or linked third-party services. ZAP runs against localhost with passive rules only; no active attack or denial-of-service testing is performed.

## Local evidence

| Check                              | Result                                              |
| ---------------------------------- | --------------------------------------------------- |
| `npm audit --json`                 | 0 known advisories across installed dependency tree |
| Gitleaks 8.30.1, reachable history | 8 commits scanned; no leaks found                   |
| Gitleaks 8.30.1, working tree      | No leaks found                                      |
| Gitleaks 8.30.1, production build  | No leaks found                                      |
| Unit tests                         | 34 passed                                           |
| Browser tests                      | 22 passed                                           |

Gitleaks was downloaded from the upstream release and its archive SHA-256 checked against the release checksum (`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`). Scans use the default rules and redact findings. A secret-pattern scan can miss unsupported or obfuscated credentials; zero findings does not prove that no secret ever existed.

The browser tests include hostile stored region values, hostile URL text and API values, blocked unsafe DOM sinks, blocked unapproved connections, policy placement/hash checks, no normal-operation CSP violations, safe new-tab links, private/development-file exclusion, and the existing functional/mobile/no-JavaScript tests. Test API responses are local fixtures; live data is checked separately after deployment.

## Remediation

- Added a production-only, deny-by-default CSP before resource loads, with exact hashes for inline JSON-LD. No broad inline/eval exception was introduced.
- Enforced Trusted Types without a permissive default policy in supporting browsers. Untrusted readings still pass through type validation and render via `textContent`.
- Bundled the two fonts locally with their licences, removing third-party stylesheet/font requests.
- Added a no-referrer policy and explicit credential omission/redirect rejection on API fetches.
- Added dependency auditing to deployment and independent secret, CodeQL and passive ZAP workflows.

## Public hosting findings

The initial HTTP check returned a 301 from HTTP to HTTPS and a valid HTTPS page. The response did not contain CSP, HSTS, X-Frame-Options, X-Content-Type-Options or Permissions-Policy headers. This repository cannot configure those HTTP headers on GitHub Pages. A meta policy adds useful protections but is not a replacement for header-only directives or a way to make header scanners pass.

Anti-framing remains an open defence-in-depth gap. This informational site has no authenticated or transactional actions, which limits the immediate clickjacking impact; it does not make the finding disappear. Moving to a dedicated origin with configurable response headers is the route to closing these hosting findings. Do not represent the current deployment as passing every VAPT rule.

## Independent and live results

The [first Security checks run](https://github.com/richmondgoh8/haze-guide-sg/actions/runs/38999175714) completed Gitleaks, CodeQL and ZAP 2.17.0. The unfiltered ZAP artifact contains **0 high, 2 medium, 5 low and 3 informational alert types**. Counts are alert types, not affected-URL counts. The high-risk CI gate passed, but the medium/low findings remain open:

| Risk   | Finding                                                 | Rule  |
| ------ | ------------------------------------------------------- | ----- |
| Medium | CSP has no enforceable `frame-ancestors` restriction    | 10055 |
| Medium | Missing anti-clickjacking response header               | 10020 |
| Low    | Missing COEP, COOP and CORP headers (three alert types) | 90004 |
| Low    | Missing Permissions-Policy                              | 10063 |
| Low    | Missing X-Content-Type-Options                          | 10021 |

The framing findings describe related gaps, not two independent exploits. Frame-ancestors cannot be supplied in an effective meta CSP. Cross-origin isolation headers also need an actual use-case/compatibility review; this app does not use SharedArrayBuffer or authenticated cross-window flows. No alert rules were disabled to obtain a clean result.

The three informational alerts concern JavaScript/no-JavaScript behaviour and cacheability. Static public guides can be cached; they do not contain personalised data. The local preview's HTTP headers are not identical to GitHub Pages, so local cache/HSTS observations must not be blindly reported as production vulnerabilities.

CodeQL initially reported three high-severity rule matches in test code: an unanchored URL assertion and two case-sensitive tag extraction expressions. These are not demonstrated exploitable production findings. The URL assertion now compares the parsed origin exactly, and the metadata expressions match case-insensitively. The tests were corrected instead of excluding the files or dismissing the alerts.

After deployment, all four public pages loaded with the production policy, no CSP violations during normal use, no JavaScript errors and no mobile overflow. East readings loaded from the real public API. `.env`, `.git/config`, `package.json` and the development source path returned 404. Header-only findings remain as described above.

## Limits

No independent human penetration tester, formal attestation, exhaustive business-logic testing, supply-chain proof or ongoing monitoring is provided. Dependency advisories and browser/hosting behaviour can change after this date. Review new features and provider changes, and rerun scans after dependency updates. See [SECURITY.md](../SECURITY.md) for the repeatable checks and disclosure route.
