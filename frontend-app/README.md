# Drumdibum Frontend

Frontend application for Drumdibum, built with Next.js App Router and Keycloak authentication.
The app communicates with the backend through the local proxy route `/api/custom/*`.

## Features

- Keycloak login/logout with OIDC + PKCE
- Dashboard, profile, groups, activities, invite flow
- Central auth context with token refresh handling
- BFF-style API forwarding in `src/app/api/custom/[...path]/route.ts`

## Prerequisites

- Node.js 20+
- npm 10+
- Running backend API and Keycloak instance

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (for example in `.env.local`):

```bash
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=drumdibum
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=drumdibum-frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

3. Start the frontend:

```bash
npm run dev
```

4. Open <http://localhost:3000>.

## Useful Scripts

- `npm run dev`: start local development server
- `npm run build`: production build
- `npm run start`: run production build locally
- `npm run lint`: run ESLint
- `npm run test:run`: run tests once
- `npm run test:coverage`: run tests with coverage
- `npm run deps:audit`: run npm vulnerability audit
- `npm run deps:outdated`: check outdated dependencies
- `npm run deps:check`: run audit + outdated checks

## Full Local Stack

From repository root (`../` relative to this folder), start dependent services:

```bash
docker compose up -d
```

This repository includes Keycloak realm bootstrap config (`keycloak/drumdibum-realm.yml`) matching:
- Realm: `drumdibum`
- Client: `drumdibum-frontend`
- Redirect URI: `http://localhost:3000/*`

## Security and Dependency Hygiene

- Security reporting process: see [SECURITY.md](./SECURITY.md)
- Auth tokens are stored in memory and refreshed regularly
- Redirect URIs are sanitized to origin + pathname before Keycloak redirects
- Dependency monitoring is automated via:
  - `.github/dependabot.yml` (weekly updates)
  - `.github/workflows/dependency-hygiene.yml` (weekly audit/outdated checks)

Run `npm run deps:check` before releases or regularly during maintenance.
