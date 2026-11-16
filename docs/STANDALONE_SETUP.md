# Standalone mode setup

This guide runs CampaignHub without Salesforce. Local sign-in is provided by CampaignHub's own user table. Salesforce integration is not active in this phase.

## 1. Environment file

Create `.env` from `.env.example` only when one does not already exist. If an older `.env` is present, preserve it and add the standalone settings (and remove any unused Salesforce settings).

Generate a private session secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set the generated value as `SESSION_SECRET`. The API intentionally refuses the sample placeholder.

The local database URL in the example matches the Docker Compose PostgreSQL service:

`postgresql://campaignhub:campaignhub_dev_password@localhost:5432/campaignhub`

These Compose credentials are for local development only.

## 2. Start PostgreSQL

```powershell
docker compose up -d postgres
docker compose ps
```

Wait until the PostgreSQL container reports healthy. The database port is bound to the local machine only.

## 3. Install, migrate and seed

```powershell
npm.cmd install
npm.cmd run db:migrate
npm.cmd run db:seed
```

The migration creates the application tables. The seed creates three local roles and synthetic contacts, campaigns and templates. Running the seed again is safe: demo users are updated by email and demo records are inserted or updated by their unique names/emails.

The seed script refuses to run unless `NODE_ENV=development`.

## 4. Run CampaignHub

```powershell
npm.cmd run dev
```

Open `http://localhost:5173`. Use the demo credentials in the README or the account shortcuts on the sign-in screen.

## 5. Database reset

To remove all local demo data and the local session table, stop the app and remove the Docker volume:

```powershell
docker compose down -v
docker compose up -d postgres
npm.cmd run db:migrate
npm.cmd run db:seed
```

**Warning:** `docker compose down -v` permanently deletes the local PostgreSQL data volume. Do not run this against a production database.

## 6. Phase boundary

The dashboard currently displays database-backed overview metrics, demo contacts, campaign records and email templates. Editing, imports, audience building, actual sending and analytics drill-downs belong to later phases. SES configuration values are placeholders only; no SES SDK or sending endpoint is active.
