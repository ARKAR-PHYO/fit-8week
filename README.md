# 8-Week Plan

A private PWA for the 8-week fat-loss plan (Nov 2 – Dec 28, 2026): daily menu and recipes, workouts with the right duration for each week, weigh-ins, weekly check-ins and progress. Your Google Sheet tracker is the only data store, so the phone and the Mac always see the same data.

**Stack:** Next.js 16 (App Router, Cache Components) · Auth.js v5 (Google sign-in, email allowlist) · Google Sheets API via a service account · hand-written service worker · Vercel (`sin1`).

## How it works

```
iPhone / Mac ──► fit.luncreative.com (Vercel)
                   │  proxy.ts: signed-out → /login, /api/* → 401
                   │  every /api route: requireUser() re-checks session + allowlist
                   ▼
                 /api/day, /api/progress  (read)     /api/sync  (write queue)
                   │                                    │
                   └──────► Google Sheets API (service account, server-only) ◄──┘
                                   │
                         "8-Week Body Transformation Tracker"
```

- **Writes** go to an outbox in the device's IndexedDB first, then to `POST /api/sync` (batched, retried when back online). Nothing is lost offline or if the app closes mid-save.
- **Upserts by key**, never blind appends: weight → `Daily Weight` row for that date (only the *Weight* and *Notes* cells; formula columns are never written); meals → `Meal Log` by (Date, Meal); workouts → `Workout Log` by (Date, Session); check-ins → `Weekly Measurements` row by week label.
- **Two devices:** each change carries the time it was made. An older change arriving after a newer one is dropped (`stale`), so the latest edit wins.
- **Sheet layout is checked** on every read/write by header name. A renamed or missing column returns a clear error instead of writing to the wrong place.
- All values are written `RAW`, so text that looks like a formula stays text.
- Plan content (menu, recipes, workouts) lives in `src/content/*.ts` and is prerendered; it works offline.

## Setup (one time, about 30 minutes)

Do these in order. You'll paste values into Vercel at the end; don't put them anywhere else.

### 1. Google Cloud project and Sheets API

1. Go to <https://console.cloud.google.com/> signed in as **michael@luncreative.com**.
2. Create a project, e.g. **fit-8week**.
3. **APIs & Services → Library →** search **Google Sheets API → Enable**.

### 2. Service account (the app's key to the Sheet)

1. **IAM & Admin → Service Accounts → Create service account**, name `fit-8week-sheets`. Skip the optional role and user steps.
2. Open it → **Keys → Add key → Create new key → JSON**. A file downloads. Keep it private and delete it after step 6.
3. Note the service account email (`fit-8week-sheets@<project>.iam.gserviceaccount.com`).

> If key creation is blocked with "Service account key creation is disabled", your Workspace has the `iam.disableServiceAccountKeyCreation` policy on. An admin can turn it off for this project under **IAM & Admin → Organization Policies**. Tell me if you hit this; the fallback is a different auth approach.

### 3. Workspace sharing check (important)

1. Open the **8-Week Body Transformation Tracker** Sheet → **Share**.
2. Add the service account email as **Editor**, untick "Notify people", **Share**.
3. Results:
   - **It shares normally** → you're done with this step.
   - **A warning you can click past** ("this person is outside your organization") → click **Share anyway**. That's fine.
   - **Sharing is blocked** → your Workspace restricts external sharing. As the Workspace admin, go to <https://admin.google.com> → **Apps → Google Workspace → Drive and Docs → Sharing settings → Sharing options** and allow sharing outside the organization (you can keep warnings on). If you'd rather not change that policy, tell me and we'll switch to the Apps Script fallback, which runs as you and needs no external sharing.

### 4. Google sign-in (OAuth client)

1. **APIs & Services → OAuth consent screen** (or **Google Auth Platform → Branding**): app name **8-Week Plan**, user type **Internal** (only luncreative.com accounts can even see the sign-in screen). Save.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
3. **Authorized JavaScript origins:** `https://fit.luncreative.com`
4. **Authorized redirect URIs:** `https://fit.luncreative.com/api/auth/callback/google`
   (For local development, also add `http://localhost:3000` and `http://localhost:3000/api/auth/callback/google`.)
5. Create, then copy the **Client ID** and **Client secret**.

### 5. Vercel project

1. <https://vercel.com/new> → import **ARKAR-PHYO/fit-8week**. Framework: Next.js (detected). Don't deploy yet if it asks, or let the first deploy fail; it needs the variables below.
2. **Settings → Environment Variables** (Production, and Preview if you want preview deploys to work):

   | Name | Value |
   |---|---|
   | `AUTH_SECRET` | Run `npx auth secret` (or `openssl rand -base64 33`) and paste the result |
   | `AUTH_GOOGLE_ID` | OAuth Client ID from step 4 |
   | `AUTH_GOOGLE_SECRET` | OAuth Client secret from step 4 |
   | `ALLOWED_EMAILS` | `michael@luncreative.com` |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON key |
   | `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON key, the whole value from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----\n`. Pasting it with literal `\n` sequences is fine; the app converts them. |
   | `SHEET_ID` | `1EHbflPj5VuAtAvf7fFbWG_u0m76p7ZFnMVUQyQFxYN8` |

3. **Deployments → Redeploy** so the variables take effect.
4. Delete the downloaded JSON key file from your Mac.

### 6. Domain

1. Vercel → **Settings → Domains → Add** `fit.luncreative.com`.
2. At your DNS provider for luncreative.com, add the record Vercel shows (normally **CNAME** `fit` → `cname.vercel-dns.com`).
3. Wait for Vercel to show **Valid Configuration**; SSL is issued automatically.

### 7. First run on iPhone

1. Open **https://fit.luncreative.com** in **Safari** and sign in with Google.
2. **Share → Add to Home Screen.** Open it from the home screen from now on. An installed PWA keeps its offline data much more reliably on iOS than a Safari tab.
3. Check: log a test weight on Today, open the Sheet, see it in *Daily Weight*, then clear it in the app.

## Development

```bash
cp .env.example .env.local   # fill in values (use the localhost OAuth URIs)
npm install
npm run dev                  # http://localhost:3000
npm test                     # unit tests (date math, Sheet repository, validation, stats)
npm run typecheck && npm run lint
npm run build
```

The service worker only registers in production builds (`npm run build && npm start`).

## Project layout

```
src/
  proxy.ts                 site-wide login check (Next 16 name for middleware)
  auth.ts                  Auth.js config + email allowlist
  app/(app)/               Today, Recipes, Workouts, Check-in, Progress
  app/login/               sign-in page
  app/api/day|progress|sync  data endpoints (each calls requireUser())
  server/session.ts        requireUser(): session + allowlist re-check
  server/sheets/           gateway (Sheets API), schema (tabs/headers), repo (reads, upserts)
  lib/plan.ts              all date math, in Asia/Yangon
  lib/ops.ts               write operations + validation (shared client/server)
  lib/client/              offline outbox, cached reads, hooks
  content/                 menu, recipes, workouts
public/sw.js               service worker
tests/                     vitest + in-memory fake Sheet
```

## Known limits

- **Sheets API quota:** about 60 requests per minute for the service account. Normal use is far below this; a very large offline backlog syncs over a few minutes.
- **Check-in screen offline:** a check-in saved offline is queued and synced, but the form shows the last synced values until it syncs.
- **Progress photos** are not in the app yet; keep using the photo-link columns in the Sheet.
- **Changing the plan dates** means editing `PLAN_START` in `src/lib/plan.ts` and the Sheet's date rows together.
