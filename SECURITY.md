# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately** — do not open a public
issue, pull request, or discussion for an unpatched vulnerability.

> **Maintainers:** set the security contact below before public release.
> Suggested: a dedicated alias (e.g. `security@yourdomain`) or GitHub's
> [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting).

- **Contact:** `security@ssota.example` _(placeholder — replace)_

When reporting, please include:

- a description of the vulnerability and its impact;
- steps to reproduce (proof-of-concept if possible);
- affected version / commit; and
- any suggested remediation.

## What to expect

- We aim to acknowledge a report within a few business days.
- We will work on a fix and coordinate a disclosure timeline with you.
- We are happy to credit reporters who wish to be named.

## Scope

This policy covers the SSOTA source in this repository. When self-hosting, you
are responsible for the security of your own deployment — in particular your
database, object storage, secrets/environment variables, and any OAuth apps you
register for connectors. Never commit real secrets; use environment variables.
