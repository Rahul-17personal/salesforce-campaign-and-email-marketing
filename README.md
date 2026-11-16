# CampaignHub – Email Marketing & Campaign Workspace

A standalone email-marketing and campaign-management application. **Salesforce is not required or connected in this phase.** The application uses local user accounts, PostgreSQL and synthetic demo data. Amazon SES will be added in a later phase; this phase does not send email.

## Current phase: Standalone application and demo data

Included:
- Local email/password authentication with Admin, Marketer and Viewer roles
- PostgreSQL database and persistent server-side sessions
- Demo seed accounts, synthetic contacts/leads, campaigns and email templates
- Dashboard KPIs and read-only demo pages for contacts, campaigns and templates
- Login rate limiting, CSRF checks, secure HttpOnly session cookies and audit events
- Docker Compose for a local PostgreSQL instance

Not yet included:
- Contact/campaign editing, audience builder or CSV import
- AWS SES email delivery, scheduling, unsubscribe processing or event webhooks
- Salesforce integration
- Production deployment

## Requirements

- Node.js 22+
- npm 10+
- Docker Desktop with Docker Compose (recommended for local PostgreSQL)

## Windows setup (PowerShell)

Run from the repository root.

1. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Generate a unique session signing secret:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Replace the sample `SESSION_SECRET` in `.env` with the generated value. Do not share or commit it.

3. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   docker compose ps
   ```

4. Install dependencies:

   ```powershell
   npm.cmd install
   ```

5. Create the database schema and seed synthetic records:

   ```powershell
   npm.cmd run db:migrate
   npm.cmd run db:seed
   ```

6. Start the web and API applications:

   ```powershell
   npm.cmd run dev
   ```

7. Open **http://localhost:5173**. Use `localhost` consistently; do not use `127.0.0.1` for local sign-in because the API validates the exact browser origin.

## Demo sign-in accounts

These credentials are for local development only and are configured in `.env.example`. The seed script hashes them with bcrypt before storing them.

| Role | Email | Demo password |
|---|---|---|
| Admin | admin@campaignhub.local | CampaignHub!2026 |
| Marketer | marketing@campaignhub.local | Marketing!2026 |
| Viewer | viewer@campaignhub.local | Viewer!2026 |

Change the demo passwords in your local `.env` before seeding if you prefer. Never use these demo credentials in a shared or production deployment.

## Useful URLs

- Web app: http://localhost:5173
- API health: http://localhost:4000/health
- API auth status: http://localhost:4000/auth/status (same browser session is required for the local auth state)

## Commands

- `npm.cmd run dev` – start the web and API workspaces
- `npm.cmd run db:migrate` – apply the SQL schema
- `npm.cmd run db:seed` – seed demo users, contacts, campaigns and templates
- `npm.cmd run typecheck` – TypeScript checks
- `npm.cmd run build` – production builds

## Architecture and security

- PostgreSQL stores user accounts, contacts, campaigns, email templates and audit events.
- `connect-pg-simple` stores server-side sessions in PostgreSQL; the browser receives only an HttpOnly session cookie.
- Passwords are hashed with bcrypt; raw passwords are never stored.
- Login is rate-limited. Login and logout requests validate Origin and a session-bound CSRF token.
- Dashboard data endpoints require an authenticated local user.
- Seeded contacts use reserved `example.com` addresses. The app does not send emails in this phase.
- Use a dedicated database, secrets manager, TLS, backups, monitoring and a security review before any shared production deployment.

See `docs/STANDALONE_SETUP.md`, `docs/ARCHITECTURE.md` and `docs/SECURITY.md`.
