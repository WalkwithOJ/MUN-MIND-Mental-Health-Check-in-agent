# MUN MIND — Implementation Plan

## Context

This is a greenfield hackathon project: **MUN MindCheck**, an anonymous mental health check-in web app for Memorial University students. Requirements, research, and designs are complete (see `docs/PRD.md`, `docs/research-brief.md`, and the Figma file with 28 frames covering every screen, error state, and flow).

The project currently contains only documentation — no code, no version control, no scaffolded framework. This plan covers going from zero to a deployed, anonymous, dual-LLM-powered check-in app that meets the MVP scope in the PRD.

**Why this shape:** The PRD and research already made the hard decisions (Next.js + Tailwind + Supabase + Vercel, dual-model LLM via Gemini 2.5 Pro + Groq Llama 3.3 70B, true anonymity, SC2.0 Level 0.5 positioning). This plan operationalizes those decisions in build order, front-loading infrastructure and safety-critical primitives so they're in place before UI work.

**User decisions (Q&A):**
- Repo: **Personal GitHub**, **public**, MIT license
- Package manager: **npm**
- Supabase: to be created as part of the plan

---

## Review Status

**Pass 1 — Base plan reviewed by `feature-dev:code-reviewer` (2026-04-04)**
- Critical: 2 (Gemini fallback path, conversation history depth + logging discipline) — addressed
- High: 4 (negation handling, campus quasi-identifier, ErrorState placement, client-side crisis detection) — addressed
- Medium/low: addressed inline

**Pass 2 — Phase 15 expansion reviewed by `feature-dev:code-reviewer` (2026-04-04)**
- Critical: 3 — all addressed
  - Passphrase vault breaks anonymity → **deferred to v1.1**
  - Weekly summary LLM architecture contradiction → **resolved to deterministic template in v1**
  - Journal-in-vault encryption gap → **restricted to localStorage only in v1**
- High: 3 — all addressed
  - Admin dashboard k-anonymity insufficient → **raised to k ≥ 15, per-field enforcement**
  - PWA cache staleness risk → **stale-while-revalidate + versioned cache + skipWaiting**
  - Streaming race condition → **simpler approach: disable input during stream**
- Medium: 2 — addressed (French keyword ownership process, admin auth limitation documented)

All review findings incorporated. Both review outputs will be saved to `tasks/plan-review-2026-04-04.md` once out of plan mode.

---

## Build Order Rationale

1. **Infrastructure first** (repo, scaffold, deploy pipeline) — fail fast on config, not on features
2. **Safety-critical primitives next** (crisis keyword detector, resource config, disclaimers) — these must exist before any LLM call is wired up
3. **LLM adapter layer** — swappable interface before either provider is integrated
4. **UI shell + onboarding** — landing → privacy → campus → chat entry
5. **Core chat loop** — the 90% use case
6. **Mood tracking (client-side)** — localStorage, no server round-trip
7. **Error/loading/edge states** — explicitly scoped, not an afterthought
8. **Polish, verify, deploy**

---

## Phase 0 — Plan Persistence & Rule Updates (before Phase 1)

Once this plan is approved and we exit plan mode:
1. **Copy this plan** from `C:\Users\jsemo\.claude\plans\streamed-rolling-bumblebee.md` to `tasks/todo.md` in the project so it lives with the repo and survives across sessions (per CLAUDE.md "Plan First" rule).
2. **Save the review findings** to `tasks/plan-review-2026-04-04.md` so the rationale for plan changes is preserved.
3. **Update CLAUDE.md** to add a workflow rule: **Every plan MUST be reviewed by a subagent before the user sees it.** Under the existing "Internal Review Gate" section.
4. **Create `tasks/lessons.md`** (referenced by CLAUDE.md but doesn't exist yet) — starts empty, gets populated as corrections happen.

## Phase 1 — Repository & Scaffold

**Goal:** Working Next.js app deployed to Vercel from a public GitHub repo.

**Steps:**
1. Initialize git in `C:\Users\jsemo\OneDrive\Desktop\Projects\MUN_MIND`
2. Create `.gitignore` (Next.js defaults + `.env.local`, `.vercel`, `node_modules`)
3. Create `.env.local.example` listing every required env var name (empty values): `GOOGLE_AI_STUDIO_API_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`
4. Scaffold Next.js at repo root so the repo IS the app
5. Run: `npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --use-npm`
6. Configure `next.config.js` with security headers: Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy
7. Add `LICENSE` (MIT)
8. Add a proper `README.md` linking to `docs/PRD.md` and including a **"Safety Architecture"** section that explains: (1) crisis detection is deterministic and never LLM-dependent, (2) how the Red-tier response works, (3) how to update `resources.json` without touching code, (4) the Gemini fallback behavior, (5) note that legal/ATIPP review is recommended before production
9. Create GitHub repo `mun-mind` (public, MIT), push initial commit — user may need to run `gh auth login` first
10. Connect repo to Vercel, first deploy (empty Next.js app)

**Deliverable:** Public "Hello World" Next.js app live on a vercel.app URL.

---

## Phase 2 — Config-Driven Content Layer

**Goal:** All campus-specific content lives in config files, per PRD handoff requirement. Non-developers can edit without touching code.

**Files to create:**
- `src/config/resources.json` — every MUN/NL resource from research brief (phone numbers, hours, URLs, tier classification, campus scope)
- `src/config/keywords.json` — crisis keyword categories (suicidal ideation, self-harm, harm to others, acute crisis) with negation patterns
- `src/config/prompts.json` — LLM system prompts (initial assessment prompt, conversation turn prompt, Red-tier deterministic response)
- `src/config/copy.json` — UI text: tagline, trust signals, disclaimers, tone-setting microcopy
- `src/config/campuses.json` — St. John's, Grenfell, Marine Institute metadata

**Types:**
- `src/types/config.ts` — TypeScript types for each config file
- `src/lib/config.ts` — typed loaders with runtime validation (Zod)

**Deliverable:** Editable config, imported and validated at build time.

---

## Phase 3 — Safety Primitives

**Goal:** Deterministic crisis detection and escalation logic exist *before* any LLM is wired up. Crisis detection must never depend on the LLM.

**Files:**
- `src/lib/crisis-detector.ts` — pure function `detectCrisis(text: string): CrisisTier` reading `keywords.json`. Handles normalization and multi-phrase matching. Errs toward higher severity.
- `src/lib/escalation.ts` — maps `CrisisTier` to resource bundles from `resources.json`
- `src/lib/disclaimers.ts` — centralized disclaimer strings
- `src/__tests__/crisis-detector.test.ts`

**Design decision — negation handling (from review):**
- **Negation NEVER suppresses Red.** Once any hard crisis keyword is detected, the message is Red regardless of surrounding negation words. False positives are acceptable; false negatives are not.
- Negation only suppresses Yellow → Green in clearly-negated moderate-distress phrases (e.g., "I'm not stressed anymore").
- Document this decision in a comment block in `crisis-detector.ts`.

**Test cases (explicit, required):**
- True positives for every keyword category (suicidal ideation, self-harm, harm to others, acute crisis)
- Negated-but-still-Red: "I told my friend I wasn't suicidal", "I used to want to die but I'm better now" — both must be Red
- Negated Yellow → Green: "I'm not stressed anymore"
- Case/punctuation/whitespace variants
- Multi-phrase compounds
- Very long input (5,000+ chars) — no performance cliff
- Unicode homoglyphs and l33tspeak ("k1ll myself") — partial coverage is better than none
- Empty string, whitespace only

**Testing setup:** `npm install -D vitest @testing-library/react @testing-library/jest-dom`. Safety code gets test coverage; UI does not need it for hackathon timeline.

**Deliverable:** `npm test` passes. Crisis detection proven correct before any LLM code exists.

---

## Phase 4 — LLM Adapter Layer

**Goal:** A swappable interface so both providers are interchangeable. Adding/removing a provider is an env var change.

**Files:**
- `src/lib/llm/types.ts` — explicit types (define BEFORE writing any adapter):
  ```ts
  type CrisisTier = 'green' | 'yellow' | 'red'
  type MoodScore = 1 | 2 | 3 | 4 | 5
  interface AssessmentResult {
    tier: CrisisTier
    moodScore: MoodScore
    reply: string
    topicTags: string[]
  }
  interface Message { role: 'user' | 'assistant', content: string }
  interface ConversationResult { reply: string }
  interface LLMProvider {
    assess(input: string): Promise<AssessmentResult>
    converse(history: Message[], input: string): Promise<ConversationResult>
  }
  ```
- `src/lib/llm/gemini.ts` — Gemini 2.5 Pro adapter (primary for `assess`)
- `src/lib/llm/groq.ts` — Groq Llama 3.3 70B adapter (primary for `converse`, also used as `assess` fallback)
- `src/lib/llm/router.ts` — routing + fallback logic
- `src/lib/llm/index.ts` — public export

**Gemini rate-limit fallback (CRITICAL — from review):**
At 100 req/day, Gemini will exhaust during normal MUN usage peaks. The router MUST implement a named, tested fallback path:

1. Try Gemini for `assess()`
2. On 429/503/network error → fall back to Groq `assess()` with a simplified prompt (stored in `prompts.json` as `assess_fallback_prompt`)
3. On Groq failure → return a deterministic response from `prompts.json` (`assess_degraded_response`) plus Yellow-tier resources. Never return an empty error to the user.
4. Every fallback path logs only the provider and error type (never message content) for rate-limit observability

**Conversation history limits (CRITICAL — from review):**
- Max history depth sent to Groq: **last 3 turns** (6 messages)
- Max tokens per request: ~2,000
- Enforced in `router.ts` before dispatching to Groq

**No-logging rule (CRITICAL — from review):**
- NEVER log `message`, `history`, `input`, or response content in any catch block, error handler, or middleware
- Only log: provider name, HTTP status, error code, timestamp, tier
- Add a comment at the top of every file in `src/lib/llm/` restating this rule
- Review `next.config.js` and Vercel function runtime to confirm no default body logging

**Env vars (in Vercel + local `.env.local`):**
- `GOOGLE_AI_STUDIO_API_KEY`
- `GROQ_API_KEY`

**Integration rule:** crisis detection ALWAYS runs before any LLM call. If crisis detected, deterministic response returns immediately; no LLM invocation.

**Deliverable:** Unit-testable adapter with explicit tests for the Gemini-exhausted fallback path (mock 429 response, verify Groq is called with fallback prompt).

---

## Phase 5 — Supabase Setup

**Goal:** Minimal database for anonymized aggregate metrics only. No conversation data, no PII, no quasi-identifiers.

**Steps:**
1. Create Supabase project (free tier) via supabase.com — manual step for user
2. Store URL + anon key in Vercel env vars
3. Run migration SQL (via Supabase dashboard SQL editor):
   - `sessions` table: `id uuid pk`, `created_at timestamptz`. **NO campus column** (quasi-identifier risk — kept only in client-side sessionStorage)
   - `mood_entries` table: `id uuid pk`, `session_id uuid fk`, `mood_score int (1-5)`, `created_at timestamptz`
   - `resource_clicks` table: `id uuid pk`, `session_id uuid fk`, `resource_key text` (opaque ID like `"mun_wellness_stjohns"` — defined in `resources.json` Phase 2), `tier text`, `created_at timestamptz`
   - Row-level security: anon role allowed INSERT only, never SELECT
4. Verify RLS: run a test query from the anon key — a `SELECT * FROM sessions` must return empty or error, not all rows
5. Retention policy: write `supabase/migrations/002_retention_policy.sql` with a concrete pg_cron job:
   ```sql
   SELECT cron.schedule('delete-old-sessions', '0 3 * * 0', $$
     DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '30 days';
   $$);
   ```
6. Test retention manually by inserting a row dated 31 days ago and verifying deletion after next run

**Files:**
- `src/lib/supabase.ts` — typed client using `@supabase/supabase-js`
- `supabase/migrations/001_init.sql` — versioned schema
- `supabase/migrations/002_retention_policy.sql` — pg_cron deletion job
- `supabase/README.md` — setup instructions for MUN handoff

**Privacy change from review:** Campus is NEVER sent to the server. The resource directory filters by campus using sessionStorage only. This eliminates the quasi-identifier risk flagged in the research brief.

**Deliverable:** Schema in place, RLS verified, retention job scheduled.

---

## Phase 6 — API Routes (+ Error State safety primitive)

**Goal:** Three serverless endpoints + the `ErrorState` component. All API errors MUST return crisis resources, not empty errors.

**Routes:**
- `src/app/api/checkin/route.ts` — POST: accepts first message, runs crisis detector, if safe calls router (Gemini → Groq fallback), returns `{ tier, moodScore, reply, resources }`
- `src/app/api/converse/route.ts` — POST: accepts message + conversation history (capped at 3 turns), runs crisis detector, if safe calls `groq.converse()`, returns `{ tier, reply, resources }`
- `src/app/api/mood/route.ts` — POST: accepts mood score + session id, inserts anonymized row into Supabase

**Error state component (moved earlier from Phase 12 per review — safety-critical):**
- `src/components/ErrorState.tsx` — reusable component that renders an error message AND Tier-3 crisis resource cards (988, NL Crisis Line, Good2Talk, 911). Used whenever any API call fails.
- `public/fallback.html` — static no-JS HTML page with crisis resources. Written and wired up in this phase, not deferred.

**Cross-cutting rules:**
- Input validation with Zod on every route
- **No IP logging** — Vercel function configured to not forward `x-forwarded-for` to logs
- **No message content logging** — never log `req.body.message`, `req.body.history`, or LLM responses. Only log: route name, HTTP status, tier, error code, timestamp.
- The API route handlers must explicitly discard `req.body.message` and `req.body.history` after processing — do not pass through to any logger
- Rate-limit-aware: on 429 from Gemini → Groq fallback; on 429 from Groq → deterministic response with resources
- Every error path (500, 429, 503, network failure) returns a response body containing `{ error: string, fallbackResources: Resource[] }` so the UI can show crisis resources even on failure

**Deliverable:** API layer testable with curl/Postman before any UI is built. All error paths verified to return crisis resources. `public/fallback.html` loads standalone without JavaScript.

---

## Phase 7 — UI Shell & Design System

**Goal:** Translate the Figma design system (frame 1:2) into Tailwind tokens and base components.

**Steps:**
1. Pull design tokens from Figma via `mcp__plugin_figma_figma__get_variable_defs` on frame 1:2
2. Configure `tailwind.config.ts` with colors (deep teal/sage palette from Figma), spacing scale (4, 8, 12, 16, 24, 32, 48, 64), border radius (8px, 16px only), font families
3. Add Inter or matching font via `next/font`
4. Base components in `src/components/ui/`:
   - `Button` (primary, secondary, ghost, crisis variants)
   - `Card`
   - `Modal`
   - `Input`
   - `ChatBubble` (user + bot variants)
   - `Badge`
5. Global layout: `src/app/layout.tsx` with persistent "Crisis resources" link in header, "not a therapist" microcopy
6. Reference `docs/anti-vibe-code.md` — no purple gradients, no sparkles, no glow

**Deliverable:** Style guide page at `/style-guide` (dev-only) showing every component with all states.

---

## Phase 8 — Onboarding Flow

**Goal:** Landing → Privacy → Campus → Chat entry, matching Figma frames 2:1121 / 2:1279 (landing), 2:1199 / 2:1488 (privacy), 2:1356 / 2:1425 (campus selector).

**Pages/components:**
- `src/app/page.tsx` — landing page with tagline, 3 trust signals, single CTA
- `src/components/PrivacyNoticeModal.tsx` — first-visit modal with bullet list and "I understand" checkbox
- `src/components/CampusSelector.tsx` — 3 large cards + "Rather not say"
- State management: `sessionStorage` for "already accepted privacy" and selected campus (session-scoped, cleared on tab close — not localStorage to preserve anonymity)

**Return visit:** detect sessionStorage keys; skip privacy + campus steps, show "Welcome back" copy (frame 2:2589).

**Deliverable:** Student can flow from landing to the chat screen entry point.

---

## Phase 9 — Core Chat Interface

**Goal:** The 90% use case. Frames 2:1558 / 2:1653.

**Files:**
- `src/app/chat/page.tsx` — chat route
- `src/components/chat/ChatContainer.tsx` — conversation state in React (in-memory only, capped at 3 turns for parity with API)
- `src/components/chat/MessageList.tsx` — message bubbles, typing indicator
- `src/components/chat/ChatInput.tsx` — text input + send
- `src/components/chat/MoodWidget.tsx` — inline 5-option mood selector (Great/Good/Okay/Low/Struggling)
- `src/components/chat/QuickReplyChips.tsx` — inline structured options
- `src/components/chat/ResourceCard.tsx` — inline resource card
- `src/hooks/useChat.ts` — hook wrapping the API calls, crisis detection, message state

**Client-side crisis detection (CRITICAL — from review):**
The `useChat` hook runs `detectCrisis(message)` **locally BEFORE** dispatching the API call. If local detection returns `'red'`:
1. Crisis banner renders immediately from local state (no waiting on server)
2. Deterministic Red response is injected as the bot reply locally
3. The API call is still made for telemetry (anonymized tier event), but the UI never depends on its return
4. Server confirmation can upgrade but never downgrade a locally-detected Red tier

This ensures a slow or failed server cannot delay crisis resources.

**Flow:**
1. User types → `detectCrisis()` runs client-side first
2. If Red → render crisis banner + deterministic response immediately, fire telemetry in background
3. If not Red → first message → `POST /api/checkin` (Gemini assess with Groq fallback)
4. Subsequent messages → `POST /api/converse` (Groq conversation, max 3 turns sent)
5. Every response carries a `tier`; UI reacts accordingly (server can escalate but never de-escalate)
6. Mood selection from widget → local state + `POST /api/mood` (anonymized)
7. Messages and transcripts exist only in React state — nothing persisted server-side
8. On API error → `ErrorState` component renders with crisis resources

**Deliverable:** Full conversational check-in loop working end-to-end. Client-side Red detection verified to render before any network request completes.

---

## Phase 10 — Local Mood Tracking

**Goal:** Client-side-only history (frames 2:2319 / 2:2461).

**Files:**
- `src/lib/moodStorage.ts` — thin wrapper around `localStorage` with typed read/write/clear
- `src/components/MoodHistory.tsx` — timeline view of recent entries, "Clear my data" button
- `src/components/MoodTrendChart.tsx` — minimal 14-entry chart (plain SVG, no chart library). Must include `role="img"` and an `aria-label` summarizing the trend for screen readers.

**Constraint:** Never touches the server. Correct copy: **"Stored only on your device. Never shared. Clear anytime."** (the earlier "clears when you close the tab" wording was wrong — that describes sessionStorage, not localStorage).

**Deliverable:** History panel accessible from chat header.

---

## Phase 11 — Resource Directory & Crisis Escalation

**Goal:** Static directory + triggered crisis UI. Frames 2:1851, 2:1923, 2:1761, 2:2116.

**Files:**
- `src/app/resources/page.tsx` — full directory rendered from `resources.json`, filtered by selected campus
- `src/components/CrisisBanner.tsx` — triggered when tier === 'red'; pins crisis resources above chat
- `src/components/crisis/CallButton.tsx` — `tel:` link for mobile direct-dial

**Critical safety rules:**
- Red tier response is **deterministic** (from `prompts.json`), never LLM-generated
- Crisis banner never auto-dismisses
- Resources stay pinned even if user keeps typing
- 988, NL Crisis Line, Good2Talk, 911 always visible in red tier

**Deliverable:** Crisis flow tested manually with known trigger phrases.

---

## Phase 12 — Session Summary & Non-Safety Polish States

**Goal:** Cover the remaining polish frames. Safety-critical error/fallback components were moved to Phase 6.

**Components (polish only — NOT safety-critical):**
- `SessionSummaryModal` — shown on "End session"; lists mood, topics, resources shared; always includes the reminder that nothing is saved
- `LoadingState` — initial app load, typing indicator, bot response loading animation
- `SessionTimeoutModal` — 30+ min idle nudge
- Offline banner visual (logic already in Phase 6)

**Already delivered in Phase 6 (not repeated here):**
- `ErrorState` component with crisis resources fallback
- `public/fallback.html` no-JS safety net

**Deliverable:** All 28 Figma frames implemented.

---

## Phase 13 — Accessibility, Polish, Verify

**Steps:**
1. Keyboard navigation audit (tab order, focus rings, escape to close modals)
2. WCAG 2.1 AA contrast check on all colors
3. Touch target audit (44px min) via devtools
4. Mobile viewport QA at 320px, 375px, 390px
5. Lighthouse score (target ≥90 all categories)
6. Run `npm test` — all crisis detector tests passing
7. Manual crisis-flow QA using test-case descriptions in `docs/qa-crisis-test-cases.md`. The file uses descriptions like "phrase expressing suicidal ideation with negation" rather than raw trigger strings (since the repo is public).
8. Load the style-guide page, verify it matches Figma 1:2
9. **No-JS verification:** disable JavaScript in browser, confirm `public/fallback.html` loads with crisis resources
10. **Anonymity audit:** run `SELECT column_name FROM information_schema.columns WHERE table_schema='public'` on Supabase — verify no `campus`, `ip`, `user_id`, or message-content columns exist anywhere
11. **SVG a11y:** verify `MoodTrendChart` has `role="img"` and descriptive `aria-label`

**Internal review gate (per CLAUDE.md):** reviews run continuously throughout, not just here. A final `feature-dev:code-reviewer` pass covers the full codebase before calling it done.

---

## Phase 14 — Deployment & Handoff Prep

1. Promote Vercel preview to production
2. Add production env vars in Vercel
3. Update `README.md` with:
   - One-sentence product description
   - Link to PRD and research brief
   - Local dev setup (5 commands max)
   - Deployment instructions
   - Content-update guide (how to edit `resources.json` without touching code)
   - API key rotation guide
4. Add `CONTRIBUTING.md` for future MUN students
5. Create a GitHub Issues template for bug reports

---

## Critical Files Summary

| Path | Purpose |
|---|---|
| `src/config/*.json` | All campus-specific content — editable without touching code |
| `src/lib/crisis-detector.ts` | Deterministic safety — tested, pure function |
| `src/lib/llm/*` | Swappable LLM adapters |
| `src/lib/supabase.ts` | Anonymized-only DB access |
| `src/app/api/*` | Serverless endpoints with crisis-first ordering |
| `src/components/chat/*` | Core UX |
| `src/components/CrisisBanner.tsx` | Red-tier UI |
| `public/fallback.html` | No-JS safety net |

---

## Verification Plan (End-to-End)

1. **Local dev:** `npm run dev` — landing loads, privacy modal appears, campus selector works
2. **Crisis path:** type "I want to end my life" — verify deterministic red response, crisis banner appears, no LLM call fires (check network tab)
3. **Happy path:** type "been stressed about midterms" — verify Gemini assess call, then Groq follow-up, mood widget renders
4. **Mood storage:** complete check-in, refresh page, verify localStorage entry persists; close tab, reopen, verify fresh session
5. **Resources:** open directory, verify St. John's/Grenfell/Marine filters work based on sessionStorage selection
6. **Error state:** kill internet, send message, verify offline banner + crisis numbers shown
7. **Anonymity audit:** open Supabase dashboard, inspect tables — confirm only UUIDs, mood scores, timestamps, resource keys; no text, no IPs
8. **Production:** deploy, verify live URL, re-run crisis path on prod
9. **Review pass:** `feature-dev:code-reviewer` subagent review, address any high-severity findings

---

## Phase 15 — Previously-Stretch Features (REVISED AFTER SECOND REVIEW)

Per user decision, the PRD stretch features were promoted. A second review found critical privacy issues with several. The features below are split into **Ship in v1** and **Deferred with explicit reason**. This honors the user's intent to include stretch features while protecting the true-anonymity legal position from the research brief.

### 15.1 Passphrase Accounts — DEFERRED

**Why deferred:** A server-side `passphrase_hash` is a persistent cross-session identifier. The research brief is explicit: *"Design for true anonymity, not pseudonymity or de-identification. If anonymity is ever broken, all PHIA/PIPEDA obligations retroactively apply."* Shipping this feature structurally breaks the anonymity claim every privacy notice and the PRD depends on.

**Alternative design (for v1.1, requires ATIPP review):**
- **Option A — Client-side export/import:** The passphrase derives an encryption key. User exports an encrypted file containing their mood history; imports it on another device. Nothing touches the server.
- **Option B — Formal privacy position revision:** If sync is essential, the privacy notice, PRD, README, and all user-facing copy must be rewritten to "pseudonymous with disclosure." Requires MUN ATIPP sign-off.

**Decision:** Defer to v1.1. In v1, mood history remains device-local via localStorage.

### 15.2 Journaling / Free-Text Reflection — SHIP (local-only)

**Goal:** Private text area for reflection, tied to mood entries.

- **Hard invariant:** Journal text NEVER leaves the device in v1. Stored only in `localStorage`.
- Vault sync explicitly not implemented (would require client-side AES-GCM encryption with passphrase-derived keys — a v1.1 feature).
- Files: `src/components/JournalEditor.tsx`, `src/lib/journalStorage.ts`
- Entries tied to mood entries by local timestamp
- "Delete all" button always visible
- Plain text only in v1 — markdown can wait
- Copy: "Your journal stays on this device. We never see what you write."

### 15.3 Weekly Summary — SHIP (deterministic only, no LLM in v1)

**Goal:** Short summary of the student's week from local mood data.

**Architecture decision (resolved from review):** Deterministic template rendering from local data. No LLM, no server call.

- Pure client-side function `summarize(entries: MoodEntry[]): string` that produces a 2–3 sentence template-based summary: e.g., "You checked in 5 times this week. Most days were 'okay,' with one 'low' day on Thursday. Thanks for looking after yourself."
- Activates only if ≥5 entries exist in the past 7 days
- User triggers manually
- Files: `src/lib/weeklySummary.ts` (pure function, unit-tested), `src/components/WeeklySummary.tsx`
- LLM-powered summaries (with explicit user consent + disclosure that data is sent to Groq) deferred to v1.1

### 15.4 Admin Dashboard — SHIP (with strict k-anonymity)

**Goal:** Aggregate anonymized dashboard for MUN Student Affairs to justify the tool's value.

- Route: `src/app/admin/page.tsx`, protected by env-var passphrase (`ADMIN_PASSPHRASE`)
- **Demo-grade auth limitation:** README must explicitly note this is a shared-secret approach suitable for hackathon demo only. Production deployment requires proper SSO/token-based auth.
- Shows (all with k-anonymity enforced):
  - Total check-ins per week (weekly totals, suppress if < 15)
  - Tier distribution (green/yellow/red counts, suppress any tier < 15 in the period)
  - After-hours usage share (as a percentage, only shown when total period sessions ≥ 15)
  - Resource click-through by opaque key (rare keys with < 15 clicks show only "< 15")
  - Peak usage hours (bucketed by 4-hour windows, not hourly, to prevent fine-grained identification at small volumes)
- **k-anonymity rule: k ≥ 15** (raised from 10 per review recommendation — MUN's smaller campuses warrant a stricter threshold)
- Suppression enforced per-field in the API route, not just per-query
- Data source: read-only queries via `src/app/api/admin/stats/route.ts` with RLS-bypassing service role key (stored only in Vercel server env, never exposed)
- Files: `src/app/admin/page.tsx`, `src/app/api/admin/stats/route.ts`, `src/components/admin/*`

### 15.5 PWA Support — SHIP (with safe cache invalidation)

**Goal:** "Add to Home Screen" + offline crisis resources.

**Critical safety requirement (from review):** Stale cached crisis resources (old phone numbers) are a patient safety risk. The service worker must be designed for freshness.

- `public/manifest.json` — app name, icons, theme colors, standalone display
- `public/sw.js` — service worker with:
  - **Stale-while-revalidate** for crisis resources (not cache-first): show cached immediately, fetch fresh in background
  - Versioned cache key: `crisis-resources-v{BUILD_ID}` — BUILD_ID injected at build time
  - `activate` event deletes all prior cache versions
  - `install` event calls `skipWaiting()` to force new SW activation immediately
  - Network-first for API routes (no caching of LLM responses)
  - Cache-first only for static assets (CSS, JS, fonts)
- `public/fallback.html`:
  - Displays a visible "Last updated: [build date]" line
  - Includes disclaimer: "Offline information may not be current. Call 911 in an emergency."
- App icon set (from Figma design mark)
- Files: `public/manifest.json`, `public/sw.js`, `src/app/layout.tsx` (register SW)
- Lighthouse PWA score ≥ 90

### 15.6 Multi-Language Support — SHIP (two-phase: infrastructure + English in v1)

**Goal:** i18n infrastructure with English in v1; French content in v1.1 after native reviewer.

**Phase 15.6a (v1) — Infrastructure only:**
- `next-intl` setup
- All UI copy moved from `copy.json` to `messages/en.json`
- Locale detection from `Accept-Language` header + manual toggle
- Crisis keywords remain English-only in `keywords.json`
- If a student selects French locale, UI falls back to English for any untranslated strings, and a banner displays: "Crisis resources are currently in English only. Full French support coming soon."

**Phase 15.6b (v1.1) — French content:**
- French UI translations added to `messages/fr.json`
- French crisis keywords authored by a **native francophone speaker with mental health literacy** (not machine-translated, not translated by a bilingual English-first developer)
- `keywords.json` schema extended to support per-locale arrays; English matching still runs as fallback
- Validation: test coverage in `crisis-detector.test.ts` for French phrases

### 15.7 Streaming LLM Responses — SHIP (with abort handling)

**Goal:** Token streaming for smoother UX.

- Both Gemini and Groq expose streaming via the existing adapter (`converseStream()` method returning an async iterator)
- API routes use `ReadableStream` / `new Response(stream)` to forward tokens
- Chat UI consumes stream, appends tokens as they arrive

**Race condition handling (from review):**
- `useChat` hook holds an `AbortController` reference for any active stream
- If the user submits a new message while a stream is active:
  1. `abort()` is called on the active stream first
  2. `detectCrisis()` runs on the NEW message
  3. If Red → deterministic response, no new LLM call
  4. If not Red → new stream initiated
- Alternative (simpler, equally safe): input is disabled with visual indicator during active stream. **Decision: use this simpler approach in v1** — disabled input during streaming. Full abort-while-typing can be v1.1 polish.

**Safety invariant:** Streaming does NOT bypass crisis detection. Full input runs through `detectCrisis()` before any stream begins, every time.

---

## Expanded Verification Plan

In addition to the checks in Phase 13, verify:
- Passphrase creation → hash stored → log out → log in with same passphrase → history restored
- Journal entry stored locally, survives refresh, cleared on "delete all"
- Weekly summary renders with fake 7-day local data
- Admin dashboard: try to query a bucket with <10 sessions, verify it returns suppressed data
- PWA: install on mobile, go offline, verify crisis resources still load
- French locale: every UI string has a translation, no placeholder `__MISSING__` anywhere
- Streaming: verify crisis keyword in a streamed message still triggers deterministic response

---

## Items Still Out of Scope (Truly Deferred)

- Integration with MUN SSO / student ID systems — contradicts anonymity
- Individual-session clinical notes — not a clinical tool
- Push notifications — conflicts with "zero guilt" design principle
- Social/sharing features — privacy risk

---

## Risks Specific to Build

| Risk | Mitigation |
|---|---|
| Figma token extraction may not give complete design system | Fall back to reading screenshots for values, document discrepancies in `docs/design-gaps.md` |
| Gemini/Groq free tier changes mid-build | Adapter interface lets us swap in 5 min; keep a manual OpenAI-compatible fallback path noted |
| Supabase schema changes after initial migration | Use versioned SQL files in `supabase/migrations/` from day one |
| User has no `gh` CLI configured | Document the manual repo creation path as backup |
| Running out of time before Phase 12 (edge states) | Phases 1–11 are the true MVP; Phase 12 can ship in a v1.1 if needed |
