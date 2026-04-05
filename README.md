# MUN MIND

> An anonymous, conversational mental health check-in companion for Memorial University students. Live at **[munmind.me](https://munmind.me)**.

MUN MIND is a low-barrier, 24/7 check-in tool that helps MUN students pause, notice how they are actually doing, and — when appropriate — find their way to real support. It operates without accounts, logins, cookies, or any personally identifiable information, and costs the university nothing to run.

**Not a therapist. Not a diagnostic tool. Not a substitute for professional care.**

---

## Table of contents

1. [Documentation](#documentation)
2. [Safety architecture](#safety-architecture)
3. [For MUN staff — updating content without touching code](#for-mun-staff--updating-content-without-touching-code)
4. [Pre-launch requirements](#pre-launch-requirements)
5. [Local development](#local-development)
6. [Deployment](#deployment)
7. [Rotating API keys](#rotating-api-keys)
8. [Tech stack](#tech-stack)
9. [What MUN MIND does *not* store](#what-mun-mind-does-not-store)
10. [Contributing](#contributing)
11. [License](#license)

---

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document
- [`docs/research-brief.md`](docs/research-brief.md) — Research foundation (Canadian student mental health, MUN-specific context, privacy law, tech feasibility)
- [`docs/roadmap.md`](docs/roadmap.md) — Vision, phases, non-goals
- [`docs/anti-vibe-code.md`](docs/anti-vibe-code.md) — Design principles and patterns to avoid
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — For students joining the project

---

## Safety architecture

This is a mental health tool. The safety architecture is non-negotiable. Read this section before modifying anything in `src/lib/crisis-detector.ts`, `src/lib/llm/`, `src/config/keywords.json`, `src/config/prompts.json`, or `src/config/resources.json`.

### 1. Crisis detection is deterministic, never LLM-dependent

Every user message runs through a keyword-based crisis detector at `src/lib/crisis-detector.ts` **before** any LLM call, on the **client side first**. If crisis keywords are detected:

- The "Red" tier is locked in irreversibly (server can escalate but never downgrade)
- A pre-written deterministic response from `src/config/prompts.json` is rendered immediately
- Crisis resource cards (988, NL Crisis Line, Good2Talk, 911) are pinned to the conversation
- The LLM is **never called** for that message

This design means a slow, rate-limited, or completely broken LLM can never delay crisis resources from reaching a student. The crisis detector is tested in `src/lib/__tests__/crisis-detector.test.ts`. False positives are acceptable; false negatives are not.

### 2. Negation never suppresses Red

Phrases like "I'm not suicidal" or "I used to want to die but I'm better now" are still classified Red. This is deliberate. Negation can only downgrade Yellow → Green, never Red. See the inline comment block in `crisis-detector.ts`.

### 3. LLM provider fallback

The app uses two free-tier providers behind a swappable adapter:

- **Gemini 2.5 Pro** (Google AI Studio, 100 req/day) — initial check-in assessment
- **Groq Llama 3.3 70B** (1,000 req/day) — ongoing conversation + Gemini fallback

If Gemini's daily quota is exhausted, the router automatically retries with Groq using a simplified prompt. If both fail, a deterministic degraded response is returned with Yellow-tier resources. The student never sees dead air.

### 4. No message content ever reaches logs

API route logging is centralized in `src/lib/api/http.ts` and only emits `{route, tier, status, event, errorCode}`. There is no `console.log(req.body)` anywhere in the codebase — the review gate catches this.

### 5. Client-side red escalation cannot be downgraded

Once the client detects Red, the server's response is used for telemetry only. The UI never waits on the server to decide whether to show crisis resources.

---

## For MUN staff — updating content without touching code

Several kinds of updates can be made **without any developer involvement** by editing JSON files in the repo and letting Vercel auto-deploy.

### Updating a phone number or adding a new resource

Edit [`src/config/resources.json`](src/config/resources.json).

Every resource has this shape:

```json
{
  "id": "mun_wellness_stjohns",
  "name": "MUN Student Wellness & Counselling Centre",
  "description": "Free counselling and wellness services for MUN students.",
  "phone": "709-864-8874",
  "url": "https://www.mun.ca/studentwellness/",
  "hours": "Mon–Fri, 8:30 AM – 4:30 PM",
  "campuses": ["st_johns"],
  "tiers": ["yellow", "green"],
  "category": "counselling",
  "priority": 10
}
```

Rules:
- `id` must be snake_case lowercase. It is an **opaque identifier** stored in analytics — it must never contain a person's name or a phone number.
- `tiers` controls when the resource appears: `"red"` = crisis, `"yellow"` = elevated distress, `"green"` = routine wellness.
- `campuses` controls campus scoping: `"st_johns"`, `"grenfell"`, `"marine"`, or `"any"` for NL-wide resources.
- `priority` is a sort order (0 = highest).

Commit the change. Vercel deploys automatically within ~90 seconds. No code review required.

### Updating the landing copy, privacy notice, or chat microcopy

Edit [`src/config/copy.json`](src/config/copy.json). Every user-facing string lives here. The file has a `_doc` field at the top with editing guidelines.

### Updating the campus list

Edit [`src/config/campuses.json`](src/config/campuses.json).

### Crisis keywords (requires clinical review)

Crisis keyword lists live in [`src/config/keywords.json`](src/config/keywords.json). **Do not edit this file without a clinical review.** Changes to Red-tier phrases can introduce false negatives that miss real crises. A Zod integrity check at startup also refuses to run the app if any Red-tier category is marked `negatable: true`.

---

## Pre-launch requirements

Before a production launch at Memorial University:

- [ ] **Legal review** — Confirm PHIA/PIPEDA exemption with MUN legal counsel
- [ ] **ATIPP consultation** — Review privacy architecture with MUN's Access to Information and Protection of Privacy office
- [ ] **ICEHR review** — Determine whether ethics board review is required for any aggregate usage reporting
- [ ] **Stakeholder sign-off** — MUN Student Wellness Centre, Students' Union, Student Affairs
- [ ] **Crisis resource verification** — Confirm every phone number in `src/config/resources.json` is still current
- [ ] **Accessibility audit** — WCAG 2.1 AA verification with a real screen reader (the codebase passes a static audit; live testing is still owed)
- [ ] **Soft launch** — Pilot with one residence or student group before campus-wide release

---

## Local development

You need Node.js 18+ and an `.env.local` file with the keys listed in `.env.local.example`.

```bash
# Install
npm install

# Copy env template and fill in your own keys
cp .env.local.example .env.local

# Dev server (http://localhost:3000)
npm run dev

# Run the full test suite
npm test

# Lint
npm run lint

# Production build
npm run build
```

Where to get the keys:
- `GOOGLE_AI_STUDIO_API_KEY` → <https://aistudio.google.com/app/apikey>
- `GROQ_API_KEY` → <https://console.groq.com/keys>
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase project → Settings → API

Restart the dev server after editing `.env.local` — Next.js only reads env vars at process start.

### Dev-only routes

- `/reset` — Clears onboarding state (privacy ack + campus) from sessionStorage and redirects home. 404s in production.
- `/api/diag/llm` — Dumps a provider health check (Gemini + Groq). 404s in production.
- `/style-guide` — Component gallery. Works in production but isn't linked from anywhere.

---

## Deployment

The site is hosted on Vercel. The production domain is `munmind.me`, aliased to the Vercel project `mun-mind`.

### Automatic deploys

Every push to `main` on GitHub triggers a Vercel build. The live site updates within ~90 seconds if the build passes.

### Manual deploy from your machine

```bash
npx vercel --prod
```

This bypasses Git and deploys your current working tree. Useful for emergency fixes.

### Required environment variables on Vercel

In the Vercel dashboard → **Settings → Environment Variables**, these must be set for **Production** and **Preview**:

| Name | Required | Purpose |
|---|---|---|
| `GOOGLE_AI_STUDIO_API_KEY` | yes | Gemini 2.5 Pro (assessment) |
| `GROQ_API_KEY` | yes | Llama 3.3 70B (conversation + fallback) |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon (INSERT-only) key |
| `SUPABASE_SERVICE_ROLE_KEY` | no (Phase 15 admin only) | Service role for aggregate dashboard queries |
| `NEXT_PUBLIC_SITE_URL` | no | Overrides `metadataBase` for preview deployments |

After adding or rotating any of these, you must trigger a fresh deployment (`npx vercel --prod`) — Vercel does not automatically redeploy on env changes.

---

## Rotating API keys

Any of the third-party keys can be rotated without downtime. The process:

1. **Generate the new key** at the provider (Google AI Studio, Groq, or Supabase).
2. **Add it to Vercel** under Settings → Environment Variables. You can add the new value alongside the old one by editing the existing variable and saving the new value — Vercel will redeploy.
3. **Verify** by visiting `/api/diag/llm` on a preview deployment (in production the route 404s) and confirming `status: "ok"` for the rotated provider.
4. **Revoke the old key** at the provider once the new key is confirmed working in production.
5. **Update your local `.env.local`** to match, and restart `npm run dev`.

The Supabase anon key can be rotated from the Supabase dashboard → Settings → API → "Reset anon key". RLS guarantees that even an exposed anon key can only INSERT into the three analytics tables, never SELECT.

---

## Tech stack

- **Frontend / Backend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **LLM:** Gemini 2.5 Pro (primary) + Groq Llama 3.3 70B (conversation + fallback)
- **Database:** Supabase (Postgres, free tier) — anonymized aggregate metrics only
- **Voice input:** Web Speech API (browser-native, no third-party dependency)
- **Testing:** Vitest + happy-dom (167 tests covering safety-critical logic)
- **Hosting:** Vercel (Hobby plan)
- **Total monthly cost:** $0

---

## What MUN MIND does *not* store

The privacy promise students read on the landing page is backed by code, not trust:

- **No accounts.** No sign-up, no email, no student number, no MUN credentials.
- **No conversation persistence.** Messages live in React state inside the browser tab. Closing the tab erases them. Nothing is written to disk, localStorage, or the server.
- **No campus in the database.** The campus a student picks during onboarding lives exclusively in `sessionStorage` and is used client-side to filter the resource directory. It is never transmitted to any API route. (Enforced via Zod schemas that reject `campus` fields on the server.)
- **No IP addresses in application logs.** Our API routes do not read or log `x-forwarded-for`. Zod validation runs on every request body and the raw body is discarded before any log line is written.
- **Opaque resource identifiers in analytics.** Resource clicks are recorded as snake_case IDs (e.g. `mun_wellness_stjohns`) — never human-readable names or phone numbers.
- **30-day retention.** A `pg_cron` job in `supabase/migrations/002_retention_policy.sql` deletes all rows older than 30 days.

### One platform-level caveat

Vercel's edge layer logs request metadata (including client IP) in **their** internal platform logs by default. Application code never reads or persists those IPs — they sit inside Vercel's infrastructure and have their own retention policy. For a full production ATIPP review, this should be documented as a separate system.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). This project is built by MUN students, for MUN students, and new contributors are welcome.

---

## License

MIT — see [`LICENSE`](LICENSE).

This project is deliberately open-source so any Canadian university can fork and adapt it for their campus. If you do, please share what you learn.
