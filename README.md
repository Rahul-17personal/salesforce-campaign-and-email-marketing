# Salesforce Campaign & Email Marketing Hub

Secure Salesforce-connected campaign management with Amazon SES delivery.

## Current status – Phase 2

The repository now includes a React/TypeScript dashboard, Express/TypeScript API, and Salesforce OAuth 2.0 Web Server Authorization Code flow with PKCE. The OAuth routes are implemented, but an administrator must still create/configure the Salesforce External Client App and add its credentials to the local `.env` file before login can be tested.

CRM reads/writes, campaign operations and SES sending are not yet enabled. No email-send endpoint exists.

## Stack

- React + TypeScript + Vite
- Node.js + Express + TypeScript
- Salesforce REST API using per-user OAuth Authorization Code + PKCE
- Redis-backed production sessions (in-memory only for local development)
- AES-256-GCM token encryption
- Amazon SES email delivery (planned)
- PostgreSQL + Redis/BullMQ (planned)

## Local start

Requires Node.js 22+ and npm 10+.

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173. Configure the Salesforce External Client App by following `docs/SALESFORCE_OAUTH_SETUP.md`.

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/DEVELOPMENT.md`
- `docs/SALESFORCE_OAUTH_SETUP.md`

## Security boundaries

- Never commit `.env`, Salesforce credentials, OAuth tokens, AWS credentials or customer data.
- Each human user authorizes their own Salesforce identity; no shared admin user is used for interactive login.
- Salesforce remains the source of truth. CRM operations must enforce org/user binding, sharing, CRUD and field-level security.
- Require consent/suppression checks, unsubscribe handling, verified sender identity and approval before marketing sends.
- Foundation checks do not constitute a security audit or production certification.

## Roadmap

1. Phase 1 foundation: workspace, dashboard shell, API health route, CI and docs.
2. Phase 2 identity: OAuth + PKCE endpoints, encrypted tokens, sessions and logout; awaits org configuration and end-to-end test.
3. Phase 3 CRM: scoped Contact/Lead/Account queries, pagination and permission checks.
4. Phase 4 campaigns: Campaign/CampaignMember management, approvals and idempotency.
5. Phase 5 email: templates, audience snapshots, consent/suppression, SES worker, event webhooks and scheduling.
6. Phase 6 governance: audit trails, analytics, retention, security testing and deployment.
