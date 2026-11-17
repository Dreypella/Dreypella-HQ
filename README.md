# Dreypella HQ

Dreypella HQ is a local development foundation for the Dreypella Group headquarters platform. It uses a React, TypeScript and Vite frontend, a Node.js HTTP API and SQLite persistence.

## Current capabilities

- Authentication and session foundations.
- Organisation, department and workforce position registries.
- Department memberships and backend-enforced scoped human task access.
- Task creation, reading and status transitions.
- API integration tests.

## Planned work

AI model orchestration, AI employee execution, external integrations, voice, trading, investment operations, live legal research and production deployment are not yet connected or ready for operational use.

## Requirements and setup

Requires Node.js 24 or a compatible release with built-in `node:sqlite`, and npm.

Install dependencies with `npm install`.

Start the API in one terminal using `npm run api`. Start the frontend in another using `npm run dev`. Open the local address printed by Vite.

## Verification

- `npm run test:api`
- `npm run lint`
- `npm run build`

## Local database

By default, SQLite data is stored outside the repository at `~/.local/share/dreypella-hq/dreypella-hq.sqlite`. Set `DREYPELLA_DATA_DIR` to override the storage directory. Keep database files and backups outside source control.

Migrations are numbered and applied through the application migration process. Do not edit or rerun migrations already applied; use a new migration for future schema changes.

## Security and deployment

This is a local development foundation, not a production-ready deployment. Backend permissions enforce human task access; frontend visibility is not a substitute for server-side authorisation. AI employee execution controls are separate and are not yet connected.

Never commit passwords, session secrets, API keys or access tokens. Live financial execution, external integrations and production deployment require separate review, testing and explicit authorisation.
