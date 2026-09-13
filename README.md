# Personal AI Agent — Phase 2

> "Tell me what you need. I'll help get it done."

Personal AI Agent is the foundation for a personal AI operating system.
**Phase 1** was the complete frontend and architecture, with no external
service actually connected. **Phase 2** (this version) wires that
architecture up to real infrastructure: real accounts via Supabase Auth,
a real Postgres database, and a real AI agent that can search the web.

Nothing in this repo fakes a success state. If something isn't
configured — no `GEMINI_API_KEY`, no Supabase project — the app shows
a real error explaining what's missing, not a scripted "it worked."

---

## What's real in Phase 2

- **Accounts.** Sign up / sign in with email + password, or "Continue
  with Google" (once the Google provider is enabled in your Supabase
  project — see [Setup](#setup)). Sessions are real Supabase Auth
  sessions, refreshed by `middleware.ts` on every request.
- **A real database.** Postgres via Supabase, with Row Level Security so
  every table is automatically scoped to its owner. Schema in
  `supabase/migrations/0001_init.sql`.
- **A real AI agent.** `/api/agent/chat` calls the Google Gemini API
  server-side with your own `GEMINI_API_KEY`, using the model's
  built-in web search tool. Conversations and messages are saved to your
  account and reload when you come back.
- **A real activity log.** Every answer and every web search the agent
  runs is written to `activity_log` and shown on the Activity page.
- **Real voice input.** The mic button in the agent workspace uses the
  browser's native SpeechRecognition API — no external transcription
  service, no key required. Works in Chrome and Edge; other browsers see
  an honest "not supported" message instead of a dead button.
- **A route-protecting middleware** that keeps `/agent`, `/connections`,
  `/activity`, and `/settings` behind sign-in.

## What's still not connected (on purpose)

- **Gmail, Google Calendar, Google Drive, Google Tasks** — these need
  their own OAuth app (separate from "Continue with Google" sign-in,
  which only needs the Google provider turned on in Supabase). Not
  implemented; the Connections page says so.
- **WhatsApp, Telegram, GitHub, Vercel** — no connector exists yet.
- **Sending, booking, purchasing, or deleting anything for real.** The
  `ConfirmationCard` approval flow still only demos what approval would
  look like — there's no connected tool behind it that could actually
  send an email or make a booking, so approving one never does anything
  beyond recording the demo state. It says so explicitly.
- **AI response-style and confirmation preferences** on the Settings
  page apply to the current session only; they aren't saved to your
  account yet (your profile name *is* saved — see the schema).
- **Voice responses** (text-to-speech) — not implemented.

---

## Tech stack

Everything from Phase 1, plus:

- [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript) +
  [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs) —
  Supabase client/server/middleware helpers for the Next.js App Router
- Direct `fetch` calls to the Gemini API (no SDK dependency,
  consistent with the "no unnecessary libraries" brief) — see
  `app/api/agent/chat/route.ts`

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your Supabase project

If you haven't already, create one at [database.new](https://database.new).

### 3. Run the database migration

Open your project's **SQL Editor** in the Supabase dashboard, paste the
contents of `supabase/migrations/0001_init.sql`, and run it. (Or, if you
use the Supabase CLI: `supabase db push`.) This creates every table the
app needs, all with Row Level Security already enabled.

### 4. Enable Google sign-in (optional)

In your Supabase project: **Authentication → Providers → Google**, turn
it on, and follow Supabase's prompt to add a Google OAuth client ID and
secret *to Supabase* (not to this app). This is only for sign-in — it
does not give the agent access to Gmail or Calendar data.

### 5. Set environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in, at minimum:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API Keys (or the legacy `anon` key — both work, see below) |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

> **Legacy keys still work.** If your Supabase project predates the
> publishable/secret key rollout and only shows `anon` / `service_role`
> keys, put the `anon` key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
> anyway — Supabase's client libraries accept either key format
> transparently.

Without `GEMINI_API_KEY` set, the app still runs — the agent
workspace will just show a real "AI provider isn't configured" error
instead of a reply, rather than pretending to work.

### 6. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account,
and you should land in the agent workspace.

Other scripts are unchanged from Phase 1: `npm run build`, `npm run
start`, `npm run lint`, `npm run typecheck`.

> As with Phase 1, this project was authored in an environment without
> package-registry access, so these commands have not been run against
> the real npm registry / a real Supabase project as part of writing
> this code. See [Verification](#verification-notes) for exactly what
> was checked instead, and please run `npm install && npm run build`
> yourself as the first step.

---

## Architecture

### Supabase client/server layout

```
lib/supabase/
  client.ts       Browser client (Client Components) — publishable key only
  server.ts       Server client (Server Components, Server Actions,
                  Route Handlers) — reads/writes the session via cookies
  middleware.ts   updateSession(): refreshes the session and redirects
                  signed-out visitors away from protected pages
middleware.ts     Root Next.js middleware, wires up updateSession()
```

Every table access goes through the server client and is scoped by Row
Level Security — there is no separate "admin" client anywhere in the
app. `SUPABASE_SECRET_KEY` is documented in `.env.example` for a future
phase that needs to bypass RLS, but nothing reads it yet.

### Auth flow

- **Email/password and Google OAuth** both start from `app/login/page.tsx`
  (a Client Component using `lib/supabase/client.ts`).
- Google OAuth redirects through `app/auth/callback/route.ts`, which
  exchanges the code for a session server-side.
- `lib/auth/session.ts` exports `getCurrentUser()` — the one place that
  turns a session into the app's `User` type (joining in the `profiles`
  row for display name/avatar). Server Components call this directly;
  nothing client-side needs to re-implement it.
- `lib/actions/auth.ts` and `lib/actions/profile.ts` are Server Actions
  for signing out and updating the profile name — called directly from
  Client Components (`Sidebar`, `SettingsForm`) with no separate API
  route needed.

### Data layer

```
lib/data/
  conversations.ts   list/create conversations, list/insert messages
  activity.ts        list/log activity entries
  connections.ts     merges lib/connectors/catalog.ts (static provider
                     metadata) with the user's real `connections` rows
```

Every function takes an already-constructed Supabase client so callers
control which client (and therefore which request's cookies) is used —
these files never construct their own client.

### The real agent: `app/api/agent/chat/route.ts`

1. Authenticates the caller via the server Supabase client — a request
   with no valid session gets a real `401`, not a demo response.
2. Creates a conversation row if none was passed in, and saves the
   user's message.
3. Sends the recent message history to the Gemini API with
   the model's server-side web search tool enabled.
4. Saves the assistant's reply and logs one `activity_log` row per
   request — `"completed"` on success, `"failed"` with a descriptive
   `action` on any error (network failure, non-2xx from Gemini, empty
   reply). Nothing is logged as completed unless it actually completed.
5. Returns the saved message (plus whether web search was used) to the
   client, which is the only place `components/agent/AgentWorkspace.tsx`
   gets its data — there's no local simulation left in Phase 2.

Check [ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs) for
the current model name and the current Google Search grounding tool shape
before relying on this in production; the model name is a dated
identifier (currently `gemini-3.7-flash` in this codebase) that
Google revises over time.

### Tool registry & permissions (unchanged model, now partly real)

`lib/agent/tools.ts` still defines every tool as `read` / `prepare` /
`execute` (see `lib/agent/permissions.ts`). In Phase 2, `web.research`
is the first tool with `available: true` — it's invoked automatically
by the model, not through a separate manual call path. Every other tool
stays `available: false` until its connector is actually built.

### Adding a real connector later

Unchanged from Phase 1 — see `lib/connectors/<name>/` for the per-provider
metadata pattern and `lib/connectors/catalog.ts` for where a new entry
gets listed. The only new piece is that "connected" now means a row
exists in the real `connections` table for that user, not a hardcoded
flag.

### Security notes

- No API keys, OAuth secrets, or tokens are hardcoded anywhere in this
  repo — `.env.example` contains only empty placeholders.
- `GEMINI_API_KEY` is read only inside a Route Handler
  (`app/api/agent/chat/route.ts`), which runs exclusively on the server —
  it's never sent to the browser.
- Row Level Security means even a leaked publishable key can't read
  another user's rows; it can only act as whatever user is actually
  signed in.
- `SUPABASE_SECRET_KEY` (documented, not yet used) must only ever be
  read server-side, and never inside a file that's part of the client
  bundle.

---

## Verification notes

This environment has no access to the npm registry or to a live
Supabase/Gemini project, so the following could not be run directly.
Here's what was checked instead, and what's on you to confirm:

- **Not run:** `npm install`, `npm run build`, `npm run dev` against
  real infrastructure; the actual Supabase migration; a real sign-up →
  chat → activity-log round trip.
- **Checked:** every `.ts`/`.tsx` file compiles with no syntax errors
  and no undefined-name/duplicate-identifier errors under a relaxed
  `tsc` pass (see the project's build history for the exact command);
  every import resolves to a real exported symbol; Server/Client
  Component boundaries were audited by hand (no Client Component
  imports a module that calls `cookies()` or `next/headers`); RLS
  policies were written so every table's `insert`/`select`/`update` is
  scoped to `auth.uid()`; grepped for hardcoded secrets and leftover
  debug statements (none found).
- **Please do after cloning:** run the migration, set real env vars,
  `npm install && npm run build`, and actually sign up once before
  trusting the deploy — a live Supabase/Gemini round trip is the one
  thing that genuinely can't be verified without network access.

---

## Deploying

### GitHub

```bash
git init
git add .
git commit -m "Phase 2: Supabase, real auth, real AI agent"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### Vercel

1. **Add New → Project**, import the repo. Framework preset auto-detects
   Next.js — leave the defaults.
2. Add environment variables in **Project → Settings → Environment
   Variables**: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, and
   `NEXT_PUBLIC_APP_URL` (set this to your Vercel deployment URL, e.g.
   `https://your-app.vercel.app`).
3. In Supabase, add your Vercel URL as a **Redirect URL**
   (Authentication → URL Configuration) — e.g.
   `https://your-app.vercel.app/auth/callback` — or Google sign-in and
   email confirmation links will bounce back to `localhost`.
4. Deploy.
5. Run the SQL migration against this same Supabase project if you
   haven't already (one project can back both local dev and production —
   or create a separate Supabase project for production and run the
   migration there too).

---

## Roadmap (not built yet — for context only)

- **V1 — AI Work Assistant:** Gmail, Calendar, Drive, Tasks, richer web
  research, browser actions beyond search.
- **V2 — Multi-app Agent:** more connectors, multi-step workflows,
  voice responses, richer browser actions.
- **V3 — Personal AI OS:** shopping assistance, booking, communication,
  an Android companion, deeper computer interaction.
