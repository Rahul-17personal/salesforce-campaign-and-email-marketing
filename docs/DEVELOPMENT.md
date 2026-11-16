# Development guide

## Local setup

Follow `docs/STANDALONE_SETUP.md` on Windows PowerShell. Use Node.js 22+, Docker Compose and npm.

## Commands

- `npm.cmd run dev`: run API and web workspaces.
- `npm.cmd run db:migrate`: apply the SQL schema in `apps/api/sql`.
- `npm.cmd run db:seed`: create development-only demo users and sample data.
- `npm.cmd run typecheck`: TypeScript checks.
- `npm.cmd run build`: production builds.

## API endpoints

- `GET /health`: API and database health.
- `GET /auth/status`: current local session and CSRF token.
- `POST /auth/login`: local email/password sign-in.
- `POST /auth/logout`: CSRF-protected local sign-out.
- `GET /dashboard/summary`: authenticated summary metrics, recent campaigns, contacts and email templates.

The Vite proxy strips `/api` before forwarding. The browser therefore calls `/api/auth/status`, `/api/auth/login`, and `/api/dashboard/summary`.

## Data model

- `app_users`: local user identity, role, status and bcrypt password hash.
- `contacts`: synthetic Contact/Lead records and a marketing-consent flag.
- `campaigns`: campaign state, subject and demonstration delivery metrics.
- `email_templates`: template metadata, preview and safe HTML source (not rendered as executable page markup).
- `audit_logs`: authentication events.
- `app_sessions`: server-side sessions created by connect-pg-simple.

## Phase boundaries

This phase is a standalone login and demo-data workspace. It does not yet implement contact/campaign write operations, CSV imports, campaign member management, email sending, scheduling or Salesforce integration.
