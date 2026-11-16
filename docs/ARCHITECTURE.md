# Architecture

## Current standalone architecture

- **React + TypeScript + Vite:** Browser UI, local sign-in form and demo workspace views.
- **Node.js + Express + TypeScript:** API, password authentication, session lifecycle and dashboard read APIs.
- **PostgreSQL:** Local users, contacts, campaigns, email templates, audit events and server-side sessions.
- **connect-pg-simple:** Express session store backed by PostgreSQL.
- **Docker Compose:** Local PostgreSQL service for development.

## Request flow

1. Browser calls `GET /api/auth/status` to create or retrieve an anonymous session and CSRF token.
2. User submits email/password to `POST /api/auth/login` with Origin and CSRF headers.
3. API validates credentials against a bcrypt hash, rotates the session ID and stores the local user identity in the PostgreSQL-backed session.
4. Authenticated browser requests `GET /api/dashboard/summary`.
5. API reads metrics, campaigns, contacts and templates from PostgreSQL.
6. Logout validates Origin/CSRF, records an audit event, destroys the server-side session and clears the cookie.

## Database ownership

- PostgreSQL is the system of record in standalone phase.
- Demo records are synthetic. The seeder is development-only and idempotent by email/name.
- Contact consent is represented as a local data field; later audience/send phases must enforce it at query time and immediately before delivery.

## Future integrations (not active)

- **Salesforce:** deferred. A future connector can sync Contacts, Leads, Accounts, Campaigns and Campaign Members without becoming a dependency of the standalone workspace.
- **Amazon SES:** deferred. A future queue/worker will handle approved email delivery and provider events.
- **Redis/BullMQ:** may be introduced for distributed background work when required. Current web sessions use PostgreSQL.
