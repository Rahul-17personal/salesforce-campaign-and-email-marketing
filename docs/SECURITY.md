# Security and governance baseline

This document describes the current local-mode controls and the additional work required before shared or production use. It is not a certification or penetration-test report.

## Implemented in standalone mode

- Local accounts use bcrypt password hashes; plaintext passwords are not stored.
- Login is rate-limited and returns generic invalid-credentials errors.
- The API validates the browser Origin and a session-bound CSRF token for login/logout.
- Session IDs are regenerated after login.
- Browser session cookies are HttpOnly, SameSite=Lax and Secure in production.
- Session data is stored server-side in PostgreSQL; the browser receives only the session identifier.
- Dashboard data routes require an authenticated session.
- Authentication events are recorded in the audit log.
- Sample contacts use reserved example.com addresses. No email delivery endpoint is present.
- Demo seeding is restricted to NODE_ENV=development.

## Local development limits

- Docker Compose credentials and demo account passwords are public development fixtures. Change them before sharing an environment.
- Local HTTP is permitted only for loopback development. Use HTTPS outside localhost.
- Do not expose the development PostgreSQL port or API directly to the internet.
- Database session storage is local-development oriented until production networking, TLS, database roles, retention and backups are configured.

## Required before production

- Replace demo accounts with an administrative provisioning or invitation workflow; disable public/demo seeding.
- Enforce role-based permissions on every management operation, not merely page visibility.
- Add stronger password policy, password reset, account lockout/recovery, MFA or company identity provider integration.
- Store production secrets in a secrets manager and rotate them.
- Use a least-privilege database role, private network, TLS with certificate validation, encrypted backups and a tested recovery plan.
- Add security audit retention, alerting, export monitoring and access reviews.
- Complete SAST, dependency/secret scanning, DAST, penetration testing and incident response procedures.
- Add consent and suppression checks, unsubscribe enforcement, verified sender authentication, campaign approval and rate limits before marketing email can be sent.

## Future email controls

AWS SES integration must be added behind a background worker. Before a job is sent, it must re-check consent, opt-out, suppression, verified sender, recipient limits, approval and idempotency. Complaints, hard bounces and unsubscribe events must update the suppression data before subsequent sends.
