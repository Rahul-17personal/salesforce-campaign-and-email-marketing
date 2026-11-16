# Salesforce Campaign & Email Marketing Hub

Secure Salesforce-connected campaign management with Amazon SES delivery.

## Status
Phase 1 foundation: React/TypeScript frontend, Express/TypeScript API, documentation, security baseline and CI. Salesforce OAuth, CRM operations, campaign mutations and SES sending are not yet enabled. No email-send endpoint exists in this phase.

## Stack
- React + TypeScript + Vite
- Node.js + Express + TypeScript
- Salesforce REST API using OAuth 2.0 Authorization Code + PKCE
- Amazon SES for email delivery (future worker)
- PostgreSQL + Redis/BullMQ (planned)

## Run locally
Requires Node.js 22+ and npm 10+.
```bash
cp .env.example .env
npm install
npm run dev
```
Web: http://localhost:5173  
API health: http://localhost:4000/health

## Security boundaries
- Never put Salesforce tokens, AWS credentials, OAuth client secrets or session secrets in Git or browser code.
- Salesforce remains the source of truth. Enforce org/user binding, sharing, CRUD and field-level security.
- Require consent/suppression checks, unsubscribe handling, verified sender identity and approval before marketing sends.
- Use synthetic data in development.
- Foundation checks do not constitute a security audit or production certification.

## Roadmap
1. Foundation (current): workspace, UI shell, API health endpoint, CI and documentation.
2. Salesforce identity: OAuth + PKCE, validated state, secure server-side sessions and org binding.
3. CRM: scoped Contact/Lead/Account query, pagination and permission checks.
4. Campaigns: Campaign/CampaignMember management, approvals and idempotency.
5. Email: templates, audience snapshots, consent/suppression, SES worker, event webhooks and scheduling.
6. Governance: audit trails, analytics, retention, security testing and deployment.
