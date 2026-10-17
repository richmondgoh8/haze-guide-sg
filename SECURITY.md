# Security

This is a public static site, not a government or clinical service. It has no accounts, authenticated sessions, payment flow, database or server-side application API. Live readings come from keyless public NEA endpoints. The selected region is the only application value stored locally.

## Reporting a vulnerability

Please use the repository's private vulnerability-reporting feature if it is available. Otherwise contact the maintainer through their GitHub profile before sharing sensitive exploit details. Do not post credentials or personal data in a public issue. This repository does not publish a response-time guarantee.

Do not probe NEA/data.gov.sg, GitHub's infrastructure, other repositories or linked websites as part of testing this project. Use a local production build for intrusive tests. Normal read-only checks of this site's own public pages are sufficient for deployment verification.

## Checks

The deployment workflow runs a locked-dependency audit, unit tests and production browser tests. It also waits for the reusable Security checks workflow, which runs:

- Gitleaks on reachable Git history and the working tree, with secrets redacted in logs.
- CodeQL's JavaScript/TypeScript `security-extended` query suite. Findings are published to the repository's code-scanning results and the raw SARIF is retained. A separate gate requires zero current report findings; scanner execution alone is not treated as success.
- A digest-pinned ZAP passive baseline against the local build, with the full JSON/HTML evidence retained as a workflow artifact. It does not run an active attack scan or follow the NEA APIs.

The ZAP report gate fails on high-risk findings or unusable scanner output. Medium/low findings remain visible in the job summary and report; they are not changed to IGNORE. Passing that gate is **not** a zero-finding VAPT pass. Review all findings and the [assessment notes](docs/SECURITY-ASSESSMENT.md).

Automated scans are point-in-time checks, not a certified penetration test or a guarantee of security. Authentication/authorization and database attacks are not applicable to this architecture; they have not been “passed” by testing a nonexistent backend.

## Browser policy

Production HTML has an early meta-delivered Content Security Policy. It limits scripts, styles, fonts and connections to this origin, blocks embedded objects/frames/forms and uses hashes for the exact inline structured metadata. It does not permit `unsafe-inline` or `unsafe-eval`. Trusted Types is enforced in supporting browsers; older browsers still receive the rest of the CSP and the app continues to use text-only DOM updates.

Fonts are bundled locally under their included OFL licences. There is no third-party runtime JavaScript, advertising, analytics or API credential. API requests omit credentials and fail rather than follow redirects. Referrer information is withheld from outgoing requests.

Browsers read `data/latest.json` from the static deployment. Only the scheduled/deployment workflow calls the fixed government endpoints. The publisher whitelists numeric regional readings, rejects invalid/future timestamps, and retains the last validated measurement on source failure without refreshing its source timestamp. Visitors cannot request upstream refreshes or choose upstream URLs. This bounds upstream load; it does not add configurable edge DDoS protection or per-IP rate limits. Scan evidence artifacts are retained for one day because the workflow also runs on the data-refresh schedule.

The development server intentionally does not inject the production CSP because Vite's development runtime has different requirements. Test the built site with `npm run build` and `npm run preview`; never expose the development server as the production deployment.

## Hosting limits

GitHub Pages controls HTTP response headers. A meta CSP cannot enforce `frame-ancestors`, HSTS, `X-Content-Type-Options`, `X-Frame-Options` or Permissions-Policy. Do not add these directives to a meta tag and claim they work. The public assessment records which headers are actually present.

Serving this repository on a host that supports response headers would allow stronger controls, including framing restrictions. That requires a separate deployment/URL decision. No hosting migration or scanner-warning suppression is implied by adding the application policy.

Since GitHub project sites share an origin across an account's repositories, CSP `'self'` trusts that origin, not just this project path. Do not host untrusted executable uploads in another repository on the same origin. A dedicated origin is preferable if the threat model grows.

References: [OWASP CSP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html), [OWASP HTTP headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html), [ZAP baseline scope and exit codes](https://www.zaproxy.org/docs/docker/baseline-scan/).
