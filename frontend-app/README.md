This is the Drumdibum frontend built with [Next.js](https://nextjs.org).

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Keycloak Configuration

The frontend uses `keycloak-js` and expects these public environment variables:

```bash
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=drumdibum
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=drumdibum-frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

If these are not set, the defaults above are used.

With the repository's `docker-compose.yml` and `keycloak/drumdibum-realm.yml`, the matching Keycloak client is already defined:

- Realm: `drumdibum`
- Public client: `drumdibum-frontend`
- Redirect URI: `http://localhost:3000/*`

Run from the repository root to start Keycloak + Postgres:

```bash
docker compose up -d
```

Then start this frontend and use the Login button in the navbar.

## Notes

- Auth state is initialized with Keycloak `check-sso`.
- Login/logout are handled by Keycloak redirects.
- Access token is available in `useAuth()` as `accessToken` for API calls.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
