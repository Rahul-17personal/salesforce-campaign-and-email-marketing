# Development guide

## Local setup
1. Install Node.js 22 LTS and npm 10+.
2. Clone the repository and switch to `feature/application-foundation`.
3. Copy `.env.example` to `.env`.
4. Set a random local `SESSION_SECRET` of at least 32 characters.
5. Run `npm install`.
6. Run `npm run dev`.

## Commands
- `npm run dev`: run API and web workspaces.
- `npm run typecheck`: TypeScript checks.
- `npm run lint`: currently runs TypeScript checks as a baseline.
- `npm run build`: production builds.

## Current endpoint
- `GET /health`: health only; no credentials or customer data returned.

## Not implemented yet
Salesforce OAuth endpoints, persistent sessions, Postgres, Redis, CRM endpoints, campaign writes, SES delivery, scheduling and event webhooks. Do not expose this service publicly or configure production credentials until these controls are implemented and tested.
