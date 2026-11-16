# CampaignHub – Email Marketing & Campaign Workspace

A standalone email-marketing and campaign-management application. **Salesforce is not required or connected in this phase.** The application uses local user accounts, PostgreSQL and synthetic demo data. Amazon SES will be added later; this phase does not send email.

## Current phase: Standalone application and demo data

Included:
- Local email/password authentication with Admin, Marketer and Viewer roles
- PostgreSQL database and persistent server-side sessions
- Demo seed accounts, synthetic contacts/leads, campaigns and email templates
- Dashboard KPIs and read-only demo pages for contacts, campaigns and templates
- Login rate limiting, CSRF checks, secure HttpOnly session cookies and audit events
- Docker Compose for local PostgreSQL
- Windows one-click bootstrap for WSL 2, Docker Desktop, PostgreSQL, migrations, demo seed and app launch

## Requirements

- Windows 10 (build 19041+) or Windows 11
- Node.js 22+
- Git
- Docker Desktop (the Windows bootstrap can install it)
- Administrator approval for initial WSL feature installation

## Windows one-click setup

1. Pull the latest feature/application-foundation branch.
2. Double-click Setup-CampaignHub.bat in the repository root.
3. Approve the UAC request for WSL if prompted. If Windows needs a restart, the script registers itself to resume at the next sign-in.
4. Review and accept Docker Desktop's first-run subscription agreement when shown.
5. The script starts PostgreSQL, migrates and seeds the database, launches the app and opens the browser.

See docs/WINDOWS_ONE_CLICK_SETUP.md for details and limitations.

## Manual Windows setup

See docs/STANDALONE_SETUP.md.

## Demo sign-in accounts

| Role | Email | Demo password |
|---|---|---|
| Admin | admin@campaignhub.local | CampaignHub!2026 |
| Marketer | marketing@campaignhub.local | Marketing!2026 |
| Viewer | viewer@campaignhub.local | Viewer!2026 |

These are development-only credentials. Change them before using a shared or production environment.

## Useful URLs

- Web app: http://localhost:5173
- API health: http://localhost:4000/health

## Commands

- npm.cmd run setup:windows – run the Windows bootstrap
- npm.cmd run dev – start the web and API workspaces
- npm.cmd run db:migrate – apply the SQL schema
- npm.cmd run db:seed – seed demo users, contacts, campaigns and templates
- npm.cmd run typecheck – TypeScript checks
- npm.cmd run build – production builds

## Architecture and security

- PostgreSQL stores user accounts, contacts, campaigns, email templates and audit events.
- connect-pg-simple stores server-side sessions in PostgreSQL; the browser receives only an HttpOnly session cookie.
- Passwords are hashed with bcrypt; raw passwords are never stored.
- Login is rate-limited. Login and logout requests validate Origin and a session-bound CSRF token.
- Dashboard data endpoints require an authenticated local user.
- Seeded contacts use reserved example.com addresses. The app does not send emails in this phase.
- Use a dedicated database, secrets manager, TLS, backups, monitoring and a security review before any shared production deployment.

See docs/STANDALONE_SETUP.md, docs/ARCHITECTURE.md and docs/SECURITY.md.
