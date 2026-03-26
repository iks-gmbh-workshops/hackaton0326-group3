# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| `0.1.x` | Yes |
| `< 0.1.0` | No |

## Reporting a Vulnerability

Please do not report undisclosed vulnerabilities through public issues.

Preferred reporting channel:
- Use GitHub's private vulnerability reporting flow (`Security` -> `Report a vulnerability`).

If that is not available in your environment:
- Contact the project maintainers through a private channel and include `Security report` in the subject.

Please include:
- Affected component and version
- Reproduction steps or proof of concept
- Impact assessment (confidentiality, integrity, availability)
- Suggested mitigation (if known)

## Response Process

- Initial acknowledgment target: within 3 business days
- Triage target: within 7 business days
- Fix planning: shared after triage, based on severity and exploitability

## Disclosure Policy

- Coordinated disclosure is expected.
- A public advisory is published after a fix is available or mitigation guidance is ready.

## Security Hygiene in This Repository

- Authentication is handled with Keycloak using OIDC.
- Access tokens are kept in memory only (not persisted in local storage/session storage).
- Dependency checks are automated via Dependabot and a scheduled GitHub Actions workflow.
