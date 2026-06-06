# Pawdojo

Gamified dog training for the web — a Duolingo-style training loop for dog owners. Live at **[pawdojo.app](https://pawdojo.app)**.

> The package name and codebase are `pawdojo`; "Goodboy" was an earlier codename and may still appear in history or notes.

## What it is

Pawdojo turns dog training into a daily habit by borrowing the mechanics that make language apps sticky. Owners pick lessons, run short hands-on practice sessions with their dog, and earn XP for completing them.

The core loop:

1. **Pick a lesson** from the dashboard (each targets a specific skill or behavior).
2. **Run a practice session** — short, guided steps you do with your dog.
3. **Log the session** to award XP and update progress.
4. **Keep the streak alive** — daily activity builds a streak; missed days break it.
5. **Unlock achievements** as XP, streaks, and completed lessons accumulate.

Progress is tracked per dog, so owners with multiple dogs maintain separate XP, streaks, and lesson history. The UI is mobile-first (the Playwright suite drives a 390×844 viewport).

## Tech stack

Versions are the declared ranges from `package.json`.

| Area | Library | Version |
| --- | --- | --- |
| Framework | [Next.js](https://nextjs.org) (App Router) | ^16.2.6 |
| UI | React / React DOM | ^19.2.6 |
| Styling | Tailwind CSS (`@tailwindcss/postcss`, `@tailwindcss/typography`) | ^4.3.0 |
| Backend | Supabase — `@supabase/ssr` | ^0.10.3 |
| Backend | Supabase — `@supabase/supabase-js` | ^2.106.1 |
| Client state | Zustand | ^5.0.13 |
| Server state | TanStack Query (`@tanstack/react-query`) | ^5.100.13 |
| Markdown | `react-markdown` / `remark-gfm` | ^10.1.0 / ^4.0.1 |
| Animation | `motion` | ^12.40.0 |
| Unit tests | Vitest | ^4.1.7 |
| E2E tests | Playwright | ^1.60.0 |
| Language | TypeScript | ^6.0.3 |

## Project structure

```
src/
  app/            Next.js App Router pages and layouts
    actions/      Server actions (create-dog, log-session, switch-dog, ...)
    api/          Route handlers (auth callback, CSP report)
    (app)/        Authenticated app routes (dashboard, lesson, practice, profile, progress)
  components/      Reusable UI components (auth, dashboard, lesson, practice, ...)
  lib/            Library code: supabase clients, gamification, sounds, haptics, validation
  stores/         Zustand state management
supabase/         SQL migrations and seed data
tests/            Vitest unit tests
e2e/              Playwright end-to-end tests
```

## Local development

**Prerequisites**

- Node.js 22 (the version CI runs on).
- The [Supabase CLI](https://supabase.com/docs/guides/cli) for the local Postgres + Auth stack (requires Docker).

**Setup**

```bash
# 1. Install dependencies (deterministic, from package-lock.json)
npm ci

# 2. Configure environment
cp .env.example .env.local
# then fill in the values described below

# 3. Start the local Supabase stack (applies migrations from supabase/)
supabase start

# 4. Run the dev server
npm run dev
```

The app runs at http://localhost:3000.

**Environment variables** (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (or the local `supabase start` URL). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for privileged server-side operations. |
| `NEXT_PUBLIC_SITE_URL` | Trusted public origin (no trailing slash) that pins OAuth redirect bounces so a spoofed `Host` header can't turn the auth callback into an open redirect. Set this in production. |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | Credentials for the test account used by the Playwright specs. |

## Testing

```bash
npm test         # Vitest unit tests (vitest --run)
npm run test:e2e # Playwright end-to-end tests
npm run lint     # ESLint over src/
```

- **Unit tests** (Vitest, jsdom) live in `tests/`. They run headless with no external services and are what CI executes.
- **E2E tests** (Playwright) live in `e2e/` and drive a real browser against `http://localhost:3000`. They need the dev server running and a seeded Supabase instance plus the `E2E_TEST_*` credentials, so they are not part of CI.

CI (`.github/workflows/ci.yml`) runs on pull requests to `main` and executes `npm ci`, `npm run lint`, and `npm test` on Node 22. It does not run Playwright or a production build, and has no Supabase.

## Deployment

Deployed on [Vercel](https://vercel.com), serving [pawdojo.app](https://pawdojo.app). Supabase runs as the hosted backend; set the environment variables above in the Vercel project settings (use the production Supabase keys and `NEXT_PUBLIC_SITE_URL=https://pawdojo.app`).
