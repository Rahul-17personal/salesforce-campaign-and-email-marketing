# Development guide

## Local setup

1. Install Node.js 22 LTS and npm 10+.
2. Clone the repository and switch to `feature/application-foundation`.
3. Copy `.env.example` to `.env`.
4. Generate a unique session secret and token encryption key; see `docs/SALESFORCE_OAUTH_SETUP.md`.
5. Configure a Salesforce External Client App using the exact callback URL in that guide.
6. Run `npm.cmd install` on Windows PowerShell.
7. Run `npm.cmd run dev`.
8. Open **http://localhost:5173**. Use localhost consistently; do not mix with 127.0.0.1 for OAuth.

## Commands

- `npm.cmd run dev`: run API and web workspaces.
- `npm.cmd run typecheck`: TypeScript checks.
- `npm.cmd run lint`: currently runs TypeScript checks as a baseline.
- `npm.cmd run build`: production builds.

## Phase 2 API

- `GET /health`: API health.
- `GET /auth/status`: OAuth configuration and current app-session status.
- `GET /auth/salesforce`: starts Salesforce authorization-code + PKCE.
- `GET /auth/salesforce/callback`: validates the callback and creates a signed-in session.
- `POST /auth/logout`: CSRF-protected local logout and best-effort Salesforce token revocation.

The Vite proxy strips `/api` before forwarding, so browser paths are prefixed with `/api`.

## Session stores

- Development: in-memory session store (sessions disappear on backend restart).
- Production: Redis is mandatory. Set `REDIS_URL`, use HTTPS, a strong `SESSION_SECRET`, and a dedicated `TOKEN_ENCRYPTION_KEY_HEX`.
- Never use the development memory store for production.

## Not implemented yet

Salesforce Contacts/Leads/Accounts queries, Campaign/CampaignMember operations, database-backed audit logging, SES sending, scheduling, suppression-list persistence and webhook processing. Do not expose the service publicly until these controls are implemented and tested.
