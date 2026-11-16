# Security and governance baseline

This is a design baseline, not a claim of completed certification or penetration testing.

## Identity and sessions
- Salesforce OAuth Authorization Code + PKCE; validate state, exact redirect URI and callback.
- Bind the session to the Salesforce org and authenticated user.
- Do not collect Salesforce passwords.
- Store tokens encrypted server-side; restrict decryption to the API workload.
- Rotate session IDs after login and privilege changes.
- Cookies: Secure in production, HttpOnly, SameSite=Lax or stricter; enforce idle and absolute expiry.
- Implement CSRF protection for state-changing cookie-authenticated requests.
- Provide session revocation and disconnect controls.

## Authorization
- Deny by default; enforce permissions on every endpoint.
- Re-check Salesforce org/user binding and Salesforce CRUD, FLS and sharing for CRM operations.
- Never trust client-supplied Salesforce record IDs, user IDs, org IDs, recipient counts or approval status.
- Separate campaign author, approver and sender permissions.
- Require new approval when audience or content changes after approval.
- Integration identities require least privilege and explicit attribution.

## Data protection
- Minimize stored CRM data; prefer IDs and transient query results.
- Encrypt database, backups, object storage and OAuth tokens at rest; TLS in transit.
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
- Helmet, strict CORS, payload limits, rate limiting and schema validation.
- Dependency, secret, SAST, DAST and penetration testing before release.
- Alert on unusual exports, auth failures, approval bypass attempts and bounce/complaint spikes.
- Maintain tamper-evident audit events for login, access, export, audience changes, approvals, sends and admin changes.
- Document incident response, key rotation, restore and breach notification procedures.
