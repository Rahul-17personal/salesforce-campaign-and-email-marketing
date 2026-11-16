# Architecture

## System boundaries

### React web client
- Presents the marketing workspace and uses same-origin API requests.
- Never receives Salesforce client secrets, long-lived tokens, or AWS credentials.
- Does not send email directly.

### Node API
- Owns OAuth callback processing, sessions, authorization, validation, audit events, and orchestration.
- Performs Salesforce REST requests using the authenticated user's authorized connection.
- Uses an integration identity only for approved background tasks, with least privilege and explicit audit attribution.

### Salesforce
- Remains the source of truth for Contacts, Leads, Accounts, Campaigns and Campaign Members.
- Reads and writes must honor org sharing, CRUD, field-level security and business validation.
- Audience queries select only required fields and use pagination.

### AWS SES
- Delivers email only after approval and pre-send policy checks.
- Use a verified domain, configuration sets, message tags and event destinations.
- Event processing is idempotent and correlates provider events to campaign/message IDs.
- A successful API submission is not proof of inbox delivery.

## Planned event flow
1. User authenticates using Salesforce OAuth Authorization Code + PKCE.
2. API validates OAuth state, PKCE, redirect URI and identity; creates a server-side session.
3. API queries a narrowly scoped audience from Salesforce.
4. User reviews recipient snapshot, consent/suppression status and campaign membership.
5. An authorized approver approves the send request.
6. Worker revalidates campaign state, permissions, suppression, consent, quotas and idempotency.
7. Worker sends through SES; provider events are correlated using campaign/message tags.
8. Aggregates and campaign status are synchronized back to Salesforce where permitted.

## Reliability controls
- Durable queue with bounded concurrency, exponential backoff and dead-letter handling.
- Idempotency keys for campaign and recipient jobs.
- Recheck suppression immediately before each send.
- Store audience snapshot metadata and query criteria; avoid unnecessary copies of CRM PII.
- Validate provider events and deduplicate them.
- Define pause/cancel semantics; already accepted messages cannot be recalled.
