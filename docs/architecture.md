# MUN MIND — Architecture

> Technical deep-dive for developers. Read [`README.md`](../README.md) first for the product context and the safety architecture summary. This document covers *how* the app is put together.

## Table of contents

1. [Runtime shape](#runtime-shape)
2. [Source tree](#source-tree)
3. [Request lifecycle — the message flow](#request-lifecycle--the-message-flow)
4. [State management](#state-management)
5. [Config loading and validation](#config-loading-and-validation)
6. [The LLM adapter layer](#the-llm-adapter-layer)
7. [API reference](#api-reference)
8. [Database schema](#database-schema)
9. [Testing strategy](#testing-strategy)
10. [Security headers and CSP](#security-headers-and-csp)
11. [How to extend](#how-to-extend)

---

## Runtime shape

MUN MIND is a **Next.js 16 App Router** application deployed on Vercel. Every page is either a React Server Component (RSC) or a Client Component marked with `"use client"`. There is no separate backend — API routes live under `src/app/api/*` and run on Vercel's Node.js serverless runtime.

- **Rendering.** Onboarding and the landing page pre-render statically. `/chat` is a client component that hydrates to an interactive SPA-like shell. API routes are `dynamic = "force-dynamic"` because they read env vars and call external services.
- **Data layer.** Supabase (Postgres) stores three anonymized tables — sessions, mood_entries, resource_clicks. The anon role has INSERT-only RLS. No SELECTs are ever issued from user-facing code.
- **LLM calls.** Two providers (Gemini 2.5 Pro and Groq Llama 3.3 70B) sit behind a swappable adapter. The router picks a primary based on the operation (`assess` → Gemini, `converse` → Groq) and falls back automatically on failure.
- **State persistence.** Everything client-side lives in React state or `sessionStorage`. No `localStorage`, no cookies, no IndexedDB. Closing the tab is a full reset by design.

---

## Source tree

```
src/
├── app/                         ← Next.js App Router pages + routes
│   ├── api/                     ← Serverless API endpoints
│   │   ├── checkin/route.ts     ← First message in a session
│   │   ├── converse/route.ts    ← Subsequent turns
│   │   ├── mood/route.ts        ← Anonymized mood telemetry
│   │   ├── resource-click/route.ts
│   │   ├── diag/llm/route.ts    ← Dev-only provider health check (404s in prod)
│   │   └── health/route.ts      ← Triggers Zod config validation at build
│   ├── about/page.tsx           ← Mission page
│   ├── chat/page.tsx            ← Chat shell (renders ChatContainer)
│   ├── reset/page.tsx           ← Dev-only: clears sessionStorage
│   ├── resources/page.tsx       ← Static resource directory
│   ├── style-guide/page.tsx     ← Component gallery
│   ├── page.tsx                 ← Landing (OnboardingFlow)
│   ├── layout.tsx               ← Root layout, metadata, fonts, header/footer
│   ├── globals.css              ← Design tokens, base styles, focus rings
│   ├── icon.tsx                 ← Favicon PNG generated via next/og
│   ├── apple-icon.tsx           ← iOS home-screen icon
│   └── opengraph-image.tsx      ← 1200×630 link-preview card
│
├── components/
│   ├── AppHeader.tsx            ← Sticky top nav
│   ├── AppFooter.tsx            ← Crisis-numbers footer
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx   ← Landing → privacy → campus orchestrator
│   │   ├── PrivacyNoticeModal.tsx
│   │   └── CampusSelector.tsx
│   ├── chat/
│   │   ├── ChatContainer.tsx    ← Top-level chat orchestrator
│   │   ├── ChatInput.tsx        ← Textarea + send + voice button
│   │   ├── MessageList.tsx      ← Scrolling log with live region
│   │   ├── MoodWidget.tsx       ← Inline 5-option mood picker
│   │   ├── CrisisBanner.tsx     ← Pinned red-tier banner
│   │   ├── ResourceCard.tsx     ← Inline resource with tel: and url links
│   │   ├── VoiceButton.tsx      ← Mic + first-use privacy disclosure
│   │   ├── SessionSummaryModal.tsx
│   │   ├── SessionTimeoutModal.tsx
│   │   └── TypingIndicator.tsx
│   ├── resources/
│   │   └── ResourcesDirectory.tsx
│   └── ui/                      ← Primitives (Button, Card, Modal, Input, Badge, Icon, ChatBubble)
│
├── hooks/
│   ├── useChat.ts               ← Core chat state + send logic
│   ├── useIdleTimer.ts          ← Activity-based idle detection
│   ├── useIsTouchDevice.ts      ← matchMedia('(pointer: coarse)')
│   └── useSpeechRecognition.ts  ← Web Speech API wrapper
│
├── lib/
│   ├── crisis-detector.ts       ← ⚠️  Deterministic crisis detector (client-safe)
│   ├── escalation.ts            ← Tier → resource bundle mapping
│   ├── disclaimers.ts           ← Centralized disclaimer strings
│   ├── config.ts                ← Zod-validated config loaders (server-only)
│   ├── client-prompts.ts        ← Client-safe copies of key prompt strings
│   ├── onboarding-storage.ts    ← sessionStorage wrapper for privacy ack + campus
│   ├── voice-storage.ts         ← sessionStorage wrapper for voice ack
│   ├── supabase.ts              ← Typed clients + INSERT-only writers
│   ├── cn.ts                    ← clsx + tailwind-merge helper
│   ├── api/
│   │   └── http.ts              ← parseJsonBody, jsonError, logApiEvent
│   └── llm/
│       ├── types.ts             ← Shared interfaces
│       ├── errors.ts            ← LLMError class (client-safe)
│       ├── http.ts              ← Shared HTTP classifier, fence stripper
│       ├── schema.ts            ← Forgiving assessment response parser
│       ├── history.ts           ← History cap + normalization helpers
│       ├── gemini.ts            ← Gemini 2.5 Pro adapter
│       ├── groq.ts              ← Groq Llama 3.3 70B adapter
│       ├── router.ts            ← Primary/fallback routing + degraded responses
│       └── index.ts             ← Public barrel
│
├── config/
│   ├── resources.json           ← ⚠️  Editable: all MUN + NL resources
│   ├── keywords.json            ← ⚠️  Editable with clinical review: crisis phrases
│   ├── prompts.json             ← ⚠️  LLM system prompts
│   ├── campuses.json            ← Campus metadata
│   └── copy.json                ← ⚠️  Every user-facing string
│
└── types/
    └── config.ts                ← TypeScript mirrors of the Zod schemas
```

Files marked ⚠️ are **safety-critical or non-dev-editable**. See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the rules around editing them.

---

## Request lifecycle — the message flow

This is the single most important sequence to understand. It's what happens when a student types a message and hits send.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Student types in ChatInput.tsx                                      │
│    On touch devices, Enter inserts newline. Desktop, Enter sends.      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. useChat.sendMessage(input)                                          │
│    - adds user bubble to in-memory state                               │
│    - calls detectCrisis(input) LOCALLY — no network                    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼ RED detected                  ▼ not red
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│ 3a. Client-red path          │   │ 3b. Normal path                  │
│ - tier locked to "red"       │   │ - POST /api/checkin (first turn) │
│   irreversibly               │   │   or /api/converse (subsequent)  │
│ - render RED_TIER_REPLY      │   │ - server runs detectCrisis again │
│   immediately from           │   │ - server calls LLM adapter       │
│   client-prompts.ts          │   │   (assess or converse)           │
│ - render crisis resources    │   │ - returns {tier, reply,          │
│   (getResourcesForTier("red")│   │   resources, topicTags, ...}     │
│ - fire anonymized telemetry  │   └──────────────────────────────────┘
│   in background (never       │                   │
│   awaited)                   │                   ▼
│ - NEVER waits on server      │   ┌──────────────────────────────────┐
└──────────────────────────────┘   │ 4. Client merges tier            │
              │                    │    (server can escalate, never   │
              │                    │    de-escalate)                  │
              │                    │    Client filters resources by   │
              │                    │    campus (sessionStorage only)  │
              │                    └──────────────────────────────────┘
              │                                   │
              └───────────────┬──────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. addMessage({role: "bot", content, tier, resources, ...})            │
│    MessageList re-renders; ChatBubble appears; live region announces.  │
└────────────────────────────────────────────────────────────────────────┘
```

### Invariants enforced by this flow

1. **INV-1 — Crisis detection runs client-side first.** No server latency or failure can delay crisis resources.
2. **INV-2 — Campus never reaches the server.** Zod schemas on every API route explicitly reject a `campus` field. Resource filtering by campus happens in the client from `sessionStorage`.
3. **INV-3 — Server can escalate tier, never downgrade.** `mergeTier()` in `useChat.ts` enforces this.
4. **INV-4 — No message content hits logs.** Every API route logs through `logApiEvent()` which only emits `{route, tier, status, event, errorCode}`.
5. **INV-5 — Red tier is irreversible within a session.** Once set, subsequent turns cannot drop back to yellow or green.
6. **INV-6 — The red telemetry path sends a sentinel, not the message.** The client-red flow POSTs `{message: "[crisis_event]"}` so raw text never transits the wire.

---

## State management

### What lives where

| State | Where | Lifetime | Notes |
|---|---|---|---|
| Messages in the current conversation | React `useState` in `useChat` | Tab lifetime, wiped on navigation | Max 6 messages (3 turns) kept in memory |
| Current tier (green / yellow / red) | React `useState` in `useChat` | Tab lifetime | Escalate-only |
| Selected mood score | React `useState` in `useChat` | Tab lifetime | Exposed via `sessionSummary` |
| Topic tags from LLM assessment | React `useState` in `useChat` | Tab lifetime | Exposed via `sessionSummary` |
| Session ID (Supabase UUID) | `useRef` in `useChat` | Tab lifetime | Used to link mood entries + resource clicks |
| Privacy acknowledgment | `sessionStorage: mun-mind:privacy-ack` | Tab close | Required to enter `/chat` |
| Selected campus | `sessionStorage: mun-mind:campus` | Tab close | Never transmitted; client-side filter only |
| "Has visited" flag | `sessionStorage: mun-mind:has-visited` | Tab close | Currently unused since return-visit hero swap was removed |
| Voice input acknowledgment | `sessionStorage: mun-mind:voice-ack` | Tab close | Required once per session before using the mic |

### Why `useSyncExternalStore` for sessionStorage reads

`sessionStorage` is an external store that React doesn't know about. Naive `useEffect` + `useState` reads cause a hydration flash where the server renders the "no state" view, then the client flips to the real state on mount — visible as a flicker.

`useSyncExternalStore` with a client snapshot and a server snapshot (returning `false` / `null`) solves this cleanly. You'll see the pattern in `ChatContainer.tsx`, `ResourcesDirectory.tsx`, `useIsTouchDevice.ts`, and `useSpeechRecognition.ts`.

One gotcha: `getSnapshot` **must return a stable reference** when the underlying value hasn't changed, or React throws `"The result of getSnapshot should be cached"`. `ChatContainer.tsx` caches the last snapshot in a module-scope closure for exactly this reason.

---

## Config loading and validation

Every JSON config file under `src/config/` is loaded through `src/lib/config.ts`, which runs a **Zod schema check at module load time**. If any file is malformed, the app refuses to start with a descriptive error pointing at the broken file.

This matters because the configs are editable by non-developers. A MUN staff member who breaks `resources.json` while updating a phone number will see a clear error at build time instead of a runtime crash in front of a distressed student.

`config.ts` also enforces **cross-file integrity checks** that run at load time:

- Every resource's campus must exist in `campuses.json`
- Every resource id must be unique
- Every resource must have at least one contact method (phone, url, or text)
- At least one red-tier resource must exist
- `helpline_988` must exist (PRD §7 hard requirement)
- The NL Provincial Crisis Line must exist (PRD §7)
- `emergency_911` must exist
- No red-tier keyword category can be marked `negatable: true`
- `copy.json` mood options must have unique scores covering 1–5

If any of these fail, the build fails. These checks are the reason a phone number typo can't ship to production.

**Important:** `src/lib/config.ts` is `server-only`. Client-side code that needs a subset of these values (e.g. crisis keywords for the client-side detector, system prompts for the degraded path) imports the raw JSON directly or uses a dedicated client-safe module (`src/lib/client-prompts.ts`).

---

## The LLM adapter layer

Everything LLM-related lives under `src/lib/llm/`. The public interface is:

```ts
interface LLMProvider {
  assess(input: string): Promise<AssessmentResult>;
  converse(history: Message[], input: string, sessionTier: SessionTier): Promise<ConversationResult>;
}
```

Two adapters implement this: `GeminiAdapter` and `GroqAdapter`. The `router` picks a primary and falls back on failure. The routing decisions:

### `assess(input)` — first-turn analysis

1. Try Gemini with the full `assess_system_prompt`.
2. On failure (auth, rate-limit, network, parse error), try Groq with the simpler `assess_fallback_prompt`.
3. On failure of both, return `promptsConfig.assess_degraded_response` (deterministic yellow-tier reply with `moodScore: null`).

The degraded path deliberately leaves `moodScore: null` so analytics aren't corrupted with fabricated scores.

### `converse(history, input, tier)` — subsequent turns

1. Cap `history` to the last 6 messages (3 turns). Sending more wastes tokens and risks rate-limit issues.
2. Call Groq directly (no Gemini path — too low daily quota).
3. On failure, return `promptsConfig.converse_degraded_response`.

### Response parsing

Both Gemini and Groq are instructed to return JSON. In practice they sometimes wrap it in markdown fences (`\`\`\`json ... \`\`\``) or return snake_case instead of camelCase. `schema.ts::parseAssessmentResponse()` is a forgiving parser that strips fences, coerces field names, and applies sane bounds (e.g. `moodScore` clamped to 1–5, `topicTags` capped at 5).

### Error taxonomy

`LLMError` has five `type` values: `auth`, `rate_limit`, `network`, `parse`, `server`. Each is exposed to the diagnostic route (`/api/diag/llm`) for debugging, but the student-facing response is always either the real LLM output or a deterministic fallback — never a raw error.

---

## API reference

All routes are Node.js serverless functions with `dynamic = "force-dynamic"`. All POST routes validate their request body with Zod and reject unknown fields.

### `POST /api/checkin`

Used for the first message of a session.

**Request:**
```json
{ "message": "I've been really stressed lately" }
```

`campus` is explicitly not accepted. `message` is required, max 4000 chars.

**Response (non-red):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "tier": "yellow",
  "moodScore": 2,
  "reply": "I hear you. Stress can sneak up during midterms...",
  "topicTags": ["academic stress", "sleep"],
  "resources": [ /* yellow-tier resources, unfiltered by campus */ ],
  "degraded": false
}
```

**Response (red — deterministic):**
```json
{
  "sessionId": null,
  "tier": "red",
  "moodScore": null,
  "reply": "<from prompts.json red_tier_response.reply>",
  "resources": [ /* red-tier resources */ ],
  "deterministic": true
}
```

No session row is created on the deterministic red path to avoid per-crisis row accumulation.

### `POST /api/converse`

Used for every message after the first.

**Request:**
```json
{
  "message": "can we talk about sleep",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "sessionTier": "yellow"
}
```

History is capped at 6 entries (3 turns). `sessionTier` is `"green"` or `"yellow"` — the server uses this to prompt the LLM appropriately. Clients pass `"yellow"` when the session is red since red handling is fully client-side.

**Response:**
```json
{
  "tier": "yellow",
  "reply": "Sleep is often one of the first things to go when stress climbs...",
  "resources": [],
  "degraded": false
}
```

`resources` is **always empty on this route** — the first `/api/checkin` turn attaches resources, and subsequent turns deliberately don't re-pitch them. If the LLM escalates to a higher tier, the client re-fetches resources locally via `getResourcesForTier`.

### `POST /api/mood`

Records an anonymized mood-widget click.

**Request:**
```json
{ "sessionId": "<uuid>", "moodScore": 3 }
```

**Response:** `{ "ok": true }` or an error.

### `POST /api/resource-click`

Records that a student tapped a resource card.

**Request:**
```json
{ "sessionId": "<uuid>", "resourceKey": "mun_wellness_stjohns", "tier": "yellow" }
```

`resourceKey` must match `/^[a-z0-9_-]{1,64}$/`. The route cross-checks that the key exists in `resources.json` and the tier is consistent — defends against a tampered client POSTing arbitrary keys.

### `GET /api/health`

Triggers Zod validation of every config file. Returns counts or throws at build time if a config is broken. Used by CI and build pipelines.

### `GET /api/diag/llm` (dev only)

Calls `assess()` on both providers with a benign literal ("I had a good day today.") and returns per-provider status. **404s in production.**

---

## Database schema

Defined in `supabase/migrations/001_init.sql`. Three tables, all INSERT-only for the anon role:

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table mood_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  mood_score smallint not null check (mood_score between 1 and 5),
  created_at timestamptz not null default now()
);

create table resource_clicks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  resource_key text not null check (char_length(resource_key) <= 64),
  tier text not null check (tier in ('green', 'yellow', 'red')),
  created_at timestamptz not null default now()
);
```

**No user identifiers. No messages. No IPs. No campuses. No user-agents.** Exactly three non-id fields across three tables: `mood_score` (1-5), `resource_key` (opaque snake_case id), and `tier`.

RLS policies (also in migration 001) allow anon-role INSERT only. SELECT returns empty by default-deny. The service role client exists for admin aggregate queries (Phase 15) but is not currently wired into any route.

A pg_cron job in `supabase/migrations/004_retention_daily.sql` deletes rows older than 30 days every night at 3 AM UTC.

---

## Testing strategy

Tests live under `src/**/__tests__/` and run via Vitest with the `happy-dom` environment. Current status: **167 tests across 8 files**.

The test suite is focused on **safety-critical logic**, not UI rendering:

| Test file | What it protects |
|---|---|
| `src/lib/__tests__/crisis-detector.test.ts` | Every keyword category, negation handling, Unicode / l33tspeak, performance on 5k-char inputs, edge cases (empty, whitespace only) |
| `src/lib/__tests__/escalation.test.ts` | Tier → resource mapping, campus filtering, priority ordering |
| `src/lib/llm/__tests__/router.test.ts` | Gemini → Groq fallback, degraded response path, history cap enforcement, sessionTier rules |
| `src/lib/llm/__tests__/schema.test.ts` | Forgiving JSON parser: markdown fences, snake_case, bounds clamping |
| `src/lib/llm/__tests__/gemini.test.ts`, `groq.test.ts` | Adapter-specific request shaping + response parsing |
| `src/lib/__tests__/onboarding-storage.test.ts` | sessionStorage wrapper, malformed-value recovery |
| `src/app/api/__tests__/checkin.test.ts`, `converse.test.ts` | API route integration — Zod validation, crisis-first ordering, Supabase failure graceful degrade |

**Not tested:** component rendering, Tailwind classes, icon fonts. Those are verified manually via the style guide page and the live deployment. For a hackathon timeline this tradeoff is deliberate — safety logic gets rigorous tests, visual polish gets a manual review.

---

## Security headers and CSP

Defined in `next.config.ts`. The full set:

```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline';     ← 'unsafe-eval' added only in dev
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self'
    https://generativelanguage.googleapis.com
    https://api.groq.com
    https://*.supabase.co
    https://vitals.vercel-insights.com
    https://va.vercel-scripts.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=(), browsing-topics=()
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

Key points:

- **`microphone=(self)`** — required for voice input via Web Speech API. `microphone=()` silently blocked the mic on a previous deploy.
- **`unsafe-inline`** on `script-src` — required for Next.js App Router hydration scripts. A future improvement is a nonce-based CSP via middleware.
- **`unsafe-eval`** is only added in development. Production builds never set it.
- **`connect-src`** whitelists only the LLM, Supabase, and Vercel telemetry endpoints. A future XSS cannot exfiltrate data to an arbitrary server.

---

## How to extend

### Adding a new config field

1. Add the field to the JSON file.
2. Add it to the Zod schema in `src/lib/config.ts`.
3. Add it to the TypeScript mirror type in `src/types/config.ts`.
4. Use the typed export (`copyConfig`, `resourcesConfig`, etc.) wherever you need it.

The Zod schema throws at load time if the JSON doesn't match, so you'll catch mismatches immediately.

### Adding a new API route

1. Create `src/app/api/your-route/route.ts`.
2. Import from `src/lib/api/http.ts` — use `parseJsonBody` for request validation and `jsonError` for errors. Always return fallback resources on error paths.
3. Add `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"` at the top.
4. Log through `logApiEvent` only — **never** log request bodies, headers, or LLM responses.
5. If the route writes to Supabase, use the existing `createSession` / `insertMoodEntry` / `insertResourceClick` helpers so you inherit UUID validation and RLS behavior.

### Adding a new LLM provider

1. Create an adapter at `src/lib/llm/<provider>.ts` implementing `LLMProvider` from `types.ts`.
2. Add it to `router.ts` as either a primary or a fallback.
3. Update `api/diag/llm/route.ts` to test the new provider.
4. Add a test file following the `groq.test.ts` pattern.
5. Add the env var to `.env.local.example` and the README's env var table.

### Adding a new screen

1. Create `src/app/your-screen/page.tsx`. Prefer a server component unless you need client interactivity.
2. Add a nav link to `AppHeader.tsx` if it should be visible from every page.
3. Use existing UI primitives from `src/components/ui/` — don't re-invent Button, Card, Modal, etc.
4. Pull all strings from `src/config/copy.json` under a new key. Don't hardcode user-facing text.
5. Update `docs/platform-docs.md` with a feature entry.

### Touching safety-critical code

Re-read [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — specifically the "safety-critical code" table and the four-question review gate. These changes require a real review, not a self-merge.
