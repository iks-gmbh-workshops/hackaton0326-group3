# Changelog — drumdibum frontend

## 2026-03-24 — Initial frontend scaffold

### Added

- **shadcn/ui** (Base UI + Nova preset) with Tailwind CSS 4
- **Lucide** icons
- **Auth context** (`src/lib/auth-context.tsx`) — mock login/logout, ready for Keycloak
- **Domain types** (`src/lib/types.ts`) — `User`, `Group`, `Activity`, `Participant`, `Notification`, etc.
- **Mock data** (`src/lib/mock-data.ts`) — sample groups, activities, notifications for development
- **Navbar** (`src/components/navbar.tsx`) — responsive, notification bell with unread count, user dropdown
- **Root layout** updated with `AuthProvider` + `Navbar`

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — hero + feature cards |
| `/dashboard` | `app/dashboard/page.tsx` | My groups, upcoming activities, pending RSVPs |
| `/groups/new` | `app/groups/new/page.tsx` | Create group form |
| `/groups/[id]` | `app/groups/[id]/page.tsx` | Group detail — members list + activities |
| `/groups/[id]/members/add` | `app/groups/[id]/members/add/page.tsx` | Add registered users or invite by email |
| `/groups/[id]/activities/new` | `app/groups/[id]/activities/new/page.tsx` | Create activity form |
| `/activities/[id]` | `app/activities/[id]/page.tsx` | Activity detail with RSVP accept/decline |
| `/profile` | `app/profile/page.tsx` | Edit profile + delete account (danger zone) |
| `/invite/[token]` | `app/invite/[token]/page.tsx` | Unregistered user invite landing page |

### shadcn/ui components installed

`button`, `card`, `badge`, `avatar`, `input`, `label`, `textarea`, `separator`, `dropdown-menu`

### Config changes

- `next.config.ts` — added `allowedDevOrigins: ["127.0.0.1"]` for dev proxy
- `package.json` — dependencies added by shadcn init

### Not yet implemented (TODO stubs in code)

- Backend API calls (all forms use `setTimeout` placeholders)
- Keycloak auth redirect (login/logout are mock state toggles)
- Email sending for unregistered invites (backend responsibility)
- Loading / error boundary pages
