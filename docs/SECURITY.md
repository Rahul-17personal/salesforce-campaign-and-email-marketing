# Security and governance baseline

This is a design baseline, not a claim of completed certification or penetration testing.

## Identity and sessions
- Interactive user login uses Salesforce OAuth 2.0 Web Server Authorization Code flow with PKCE.
- Validate one-time OAuth state and PKCE verifier; use exact redirect URI matching.
- Bind every app session to the verified Salesforce org ID and user ID.
- Never collect Salesforce passwords or expose OAuth tokens to browser JavaScript.
- Encrypt access and refresh tokens with AES-256-GCM before server-side session storage.
- Rotate the local session ID after successful authentication.
- Cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Use CSRF validation for state-changing cookie-authenticated routes.
- Revoke refresh token on logout when available, then always destroy the local session.

## Session persistence
- In-memory sessions are development-only.
- Production requires Redis, TLS, network isolation, strong authentication and an eight-hour session TTL.
- Production requires a dedicated 32-byte token-encryption key, stored outside Git in a secret manager/KMS-backed system.
- Never reuse a local development key in production.

## Authorization
- Authentication is not equivalent to authorization. Deny CRM operations by default until the CRM layer enforces Salesforce CRUD, field-level security and record sharing.
- Never trust client-supplied Salesforce record IDs, user IDs, org IDs or approval status.
- Separate campaign author, approver and sender permissions.
- Integration identities require least privilege and explicit attribution.

## Data protection
- Minimize stored CRM data; prefer IDs and transient query results.
- Encrypt database, backups and object storage; use TLS in transit.
- Store secrets in AWS Secrets Manager, never source control or frontend bundles.
- Define retention, deletion and access review policies before production.
- Do not log message bodies, recipient addresses, tokens, cookies or raw provider payloads.
- Use synthetic data in development.

## Email governance
- Maintain a central suppression list and process unsubscribe, complaint and hard-bounce events.
- Evaluate documented consent/legal basis and Salesforce opt-out fields before audience creation and again immediately before sending.
- Include a working unsubscribe mechanism and honor requests promptly.
- Verify sender domain and configure DKIM, SPF and DMARC alignment.
- Apply send-rate and daily quotas, recipient caps, test-send flow and approval thresholds.
- Block sending while SES is in sandbox or sender identity is unverified.
- Classify transactional and marketing messages separately.
- Obtain legal/compliance review for recipient jurisdictions and applicable privacy/anti-spam laws.

## Operational security
- Use security headers, strict CORS, payload limits, rate limiting and schema validation.
- Run dependency, secret, SAST, DAST and penetration testing before release.
- Alert on unusual exports, auth failures, approval bypass attempts and bounce/complaint spikes.
- Maintain tamper-evident audit events for login, access, export, audience changes, approvals, sends and admin changes.
- Document incident response, key rotation, restore and breach notification procedures.
