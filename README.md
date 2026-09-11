# Personal AI Agent — Phase 1

> "Tell me what you need. I'll help get it done."

Personal AI Agent is the foundation for a personal AI operating system: a
single place where you'll eventually be able to tell an AI what you need —
by text or voice — and have it use tools you've authorized (email,
calendar, files, messaging, browser, and more) to get it done.

**This repository is Phase 1.** It is the complete frontend, application
architecture, navigation, and reusable components for that product —
built so real connectors can be added later without rebuilding the UI.
**No external service is actually connected yet.** Every place that would
eventually talk to Gmail, Calendar, WhatsApp, GitHub, or any other
provider clearly says "Connect" or "Coming soon" instead of pretending to
work.

---

## What's in Phase 1

- **Landing page** — product introduction, honest about what is and isn't
  built yet.
- **Login page** — the complete sign-in UI (Google button, email/password,
  forgot/create account), wired to local component state only. No
  authentication provider is connected, and the screen says so.
- **Agent workspace** (`/agent`) — the core screen: a conversation UI,
  quick actions, a step-by-step `AgentAction` progress component, and a
  `ConfirmationCard` component for actions that would need your approval.
  Responses are simulated locally (see [Limitations](#known-limitations-in-phase-1)) —
  nothing calls a real model or a real tool yet.
- **Connections page** (`/connections`) — an integrations dashboard.
  Nothing is shown as connected; every entry is either "Not connected"
  (Google Workspace) or "Coming soon" (WhatsApp, Telegram, GitHub,
  Vercel, Web Browser).
- **Activity page** (`/activity`) — a timeline of agent actions, currently
  backed by local demo data, structured so it can read from a real
  database later.
- **Settings page** (`/settings`) — Profile, AI preferences, Voice,
  Security, and Appearance (light / dark / system theme).
- **Responsive, accessible UI** — a sidebar on desktop that becomes a
  bottom navigation bar on mobile, touch-friendly controls, keyboard
  focus states, and semantic HTML throughout.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS, with a small custom design-token system (see
  `app/globals.css` and `tailwind.config.ts`)
- No UI/icon/animation libraries — icons are hand-written inline SVGs in
  `components/ui/Icons.tsx`, kept deliberately dependency-light per the
  Phase 1 brief.

---

## Running it locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build      # production build
npm run start      # run the production build locally
npm run lint       # ESLint
npm run typecheck  # TypeScript, no emit
```

> This project was authored in an environment without package-registry
> access, so `npm install` / `npm run build` have not been run against the
> real npm registry as part of building it. The dependency list in
> `package.json` is intentionally small (Next, React, Tailwind, and their
> types/tooling — nothing else), and the code was written and reviewed
> carefully against Next.js 14 / TypeScript conventions. Please run
> `npm install && npm run build` as your first step after cloning, and
> open an issue-to-self (or just fix forward) if anything surfaces —
> see [Known limitations](#known-limitations-in-phase-1).

---

## Environment variables

Phase 1 doesn't read any environment variables yet — there's nothing
live to configure. `.env.example` documents the variables later phases
will need, so the contract is stable before the code that uses it exists:

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser client (auth + database) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-only client — never exposed to the browser |
| `NEXT_PUBLIC_APP_URL` | OAuth redirect base URL |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | Google Workspace connector (Gmail, Calendar, Drive, Tasks) |
| `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` | GitHub connector |
| `ANTHROPIC_API_KEY` | Server-side model calls for the real agent runtime |

Copy `.env.example` to `.env.local` when you start wiring up a real
provider. Never commit `.env.local`.

---

## Known limitations in Phase 1

Being explicit about this is intentional — the brief for this project
asked for no fake integrations, so here is exactly what is and isn't
real:

- **No authentication.** The login screen is a complete, working UI, but
  "Sign in", "Continue with Google", "Create account", and "Forgot
  password" only show an inline notice explaining that auth isn't
  connected. There is a "Preview the agent workspace as a demo" link
  instead of a real signed-in session.
- **No connected tools or accounts.** Every connector on `/connections`
  is either "Not connected" or "Coming soon." Clicking "Connect" explains
  what's still needed (OAuth credentials + Supabase) rather than
  pretending to connect.
- **The agent workspace is a local simulation.** Sending a message plays
  a scripted `AgentAction` sequence (Understanding → Planning → Using a
  tool → Completed) and then replies that it doesn't have the relevant
  tool connected yet. This is clearly labeled "Demo" in the UI. No
  request leaves the browser, no model is called.
- **The `ConfirmationCard` approval flow is a demo.** Approving a
  simulated "send an email" example never sends anything — the card
  says so explicitly once resolved.
- **Voice input/output, avatar upload, and password reset** are visibly
  present in the UI (per the brief) but marked "Coming soon" and
  disabled — they don't silently do nothing, they say so.
- **Data doesn't persist.** Profile edits in Settings, theme preference
  aside, live only in React state for the current page session. Theme
  preference is the one exception and is stored in `localStorage`,
  since it's a UI preference, not a credential.
- **Not build-verified against the npm registry.** See the note in
  [Running it locally](#running-it-locally).

## What's genuinely working

- Full navigation across all six screens, on desktop and mobile.
- Light / dark / system theme, applied without a flash on load.
- The `AgentAction` and `ConfirmationCard` components are real,
  reusable, and typed against the same interfaces (`AgentActionStep`,
  `PermissionRequest`) the future real agent runtime will populate.
- The chat UI, quick actions, and input box are fully interactive.

---

## Architecture, for the phases after this one

### Folder structure

```
app/                      Routes (App Router)
  page.tsx                 Landing
  login/page.tsx            Login
  agent/page.tsx             Agent workspace (core screen)
  connections/page.tsx        Connections dashboard
  activity/page.tsx            Activity timeline
  settings/page.tsx             Settings

components/
  layout/                  Sidebar, mobile nav, app shell, theme
  landing/                 Landing page sections
  agent/                   Chat UI, AgentAction, ConfirmationCard, etc.
  connections/             ConnectionCard
  activity/                ActivityItem
  settings/                SettingsSection
  ui/                      Button, StatusChip, Toggle, Icons — shared primitives

lib/
  types.ts                 Shared data model (User, Conversation, Message,
                            AgentRun, Tool, ToolExecution, Connection,
                            ActivityLog, PermissionRequest, ...)
  demo-data.ts              Local demo data, shaped like future DB rows
  agent/
    tools.ts                 Tool registry (catalog of future capabilities)
    permissions.ts            READ / PREPARE / EXECUTE permission model
    runAgentDemo.ts            Local-only demo run simulator
  connectors/
    types.ts                  Shared ConnectorDefinition contract
    google/, github/, browser/  One folder per provider — currently
                                 metadata only, no request logic
  auth/
    session.ts                Auth contract to swap for Supabase Auth
  database/
    client.ts                 Where the future Supabase client(s) get built
```

### Agent architecture

Every future capability is modeled as a `Tool` (`lib/types.ts`):

```ts
interface Tool {
  id: string;
  name: string;
  description: string;
  connectorId: string;
  permissionLevel: "read" | "prepare" | "execute";
  inputSchema: Record<string, unknown>;
  available: boolean;
}
```

`permissionLevel` drives the UI directly: `execute`-level tools always
route through `ConfirmationCard` before anything happens
(`requiresConfirmation()` in `lib/agent/permissions.ts`). `read` and
`prepare` tools can run without interrupting the user.

### Adding a real connector later

Each connector is an independent module under `lib/connectors/<name>/`.
To make one real:

1. Add its OAuth credentials to `.env.local` (see the table above).
2. Implement the OAuth exchange and API calls **server-side** — a route
   handler or server action, never in a client component.
3. Flip `implemented: true` on its `ConnectorDefinition` and register its
   tools in `lib/agent/tools.ts` with `available: true`.
4. Update `lib/demo-data.ts` (or, once Supabase is connected, the real
   `connections` table) to reflect the real connection state.

No other file needs to change — the Connections page, the agent
workspace, and `ConfirmationCard` all read from these shared types.

### Adding Supabase

`lib/database/client.ts` is intentionally empty right now. When Supabase
is introduced:

- Build the browser client there using `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, gated by row-level security.
- Build a server-only client using `SUPABASE_SERVICE_ROLE_KEY`, and only
  ever construct it inside server actions or route handlers — that key
  must never reach the client bundle.
- Swap `lib/demo-data.ts` reads for real queries; the component props
  don't need to change since they're already typed against
  `lib/types.ts`.

### Security notes

- No API keys, OAuth secrets, or tokens are hardcoded anywhere in this
  repo. `.env.example` contains only empty placeholders.
- `lib/auth/session.ts` deliberately avoids `localStorage` for anything
  session-related — real session state belongs in an httpOnly cookie
  managed by Supabase Auth.
- Service-role/database secrets must only ever be read server-side (see
  `lib/database/client.ts`).

---

## Roadmap (not built yet — for context only)

- **V1 — AI Work Assistant:** Gmail, Calendar, Drive, Tasks, web
  research, browser.
- **V2 — Multi-app Agent:** more connectors, multi-step workflows,
  voice, richer browser actions.
- **V3 — Personal AI OS:** shopping assistance, booking, communication,
  an Android companion, deeper computer interaction.

Only the Phase 1 foundation described above is implemented in this
repository.
