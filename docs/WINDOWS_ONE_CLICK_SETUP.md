# Windows one-click setup

CampaignHub includes a Windows bootstrap script for Windows 10 (build 19041+) and Windows 11. It automates local development prerequisites and application startup.

## Start it

1. Pull the latest feature/application-foundation branch.
2. Make sure Node.js 22+ and Git are installed.
3. Double-click Setup-CampaignHub.bat in the repository root.

Or run from PowerShell:

    .\Setup-CampaignHub.bat

The script will:
- Detect whether WSL 2 is available.
- If WSL is missing, request administrator approval to run wsl --install --no-distribution, register a one-time resume command and ask whether to restart Windows.
- After restart/sign-in, continue setup automatically.
- Update WSL and set WSL 2 as the default.
- Install Docker Desktop in per-user WSL 2 mode with WinGet if it is missing.
- Start Docker Desktop and wait for its engine.
- Create/update the local .env, including rotating the previously exposed local session secret once. Secret values are never printed.
- Install npm dependencies, start PostgreSQL with Docker Compose, wait for database health, migrate and seed demo data.
- Launch the React/API development process in a separate PowerShell window and open the browser.

## Actions Windows still requires

This automation does not bypass operating-system or legal controls:
- The first WSL installation requires a UAC administrator approval and a Windows restart.
- Docker Desktop may show its subscription agreement on first launch. Review and accept it yourself. Docker Desktop licensing depends on the organization/use case; review Docker's current subscription terms before using it for company work.
- If your organization blocks WSL, virtualization, WinGet or Docker Desktop through endpoint policy, contact IT. The script stops rather than bypassing device controls.

## Demo sign-in accounts

- Admin: admin@campaignhub.local / CampaignHub!2026
- Marketer: marketing@campaignhub.local / Marketing!2026
- Viewer: viewer@campaignhub.local / Viewer!2026

These are development-only credentials. Change them before sharing or deploying.

## Rerun and troubleshooting

The script is safe to rerun for local setup. It does not delete the PostgreSQL volume. It applies migrations and runs an idempotent demo seed.

- Docker engine is not ready: open Docker Desktop, finish first-run setup, wait for Engine running, then rerun.
- Port 4000 or 5173 already in use: stop the existing CampaignHub development terminal and rerun.
- PostgreSQL startup fails: run docker compose logs postgres.
- To inspect database health: run docker compose ps.
- To reset all local data (destructive): docker compose down -v, then rerun. Do not use this on production data.

## Security notes

- The script writes local configuration into the Git-ignored .env file.
- It rotates the local session secret once and records a Git-ignored marker so a reboot/resume does not rotate it again.
- Docker Compose binds PostgreSQL to loopback only.
- The application runs as the normal signed-in Windows user; only the WSL installation command is elevated.
- No Salesforce credentials are requested, and no emails are sent by this phase.
