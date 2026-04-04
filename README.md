# MUN MIND

> An anonymous, conversational mental health check-in tool for Memorial University students.

MUN MIND is a low-barrier, 24/7 check-in companion that helps MUN students pause, reflect on how they're doing, and — when appropriate — find their way to real support. It operates without accounts, logins, or any personally identifiable information, and costs the university nothing to run.

**Not a therapist. Not a diagnostic tool. Not a substitute for professional care.**

---

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document
- [`docs/research-brief.md`](docs/research-brief.md) — Research foundation (Canadian student mental health, MUN-specific context, privacy law, tech feasibility)
- [`docs/roadmap.md`](docs/roadmap.md) — Vision, phases, non-goals
- [`tasks/todo.md`](tasks/todo.md) — Approved implementation plan
- [`CLAUDE.md`](CLAUDE.md) — Workflow conventions for AI-assisted development

---

## Safety Architecture

This is a mental health tool. The safety architecture is non-negotiable and should be understood before modifying any code.

### 1. Crisis detection is deterministic, never LLM-dependent

Every user message runs through a keyword-based crisis detector (`src/lib/crisis-detector.ts`) **before** any LLM call. If crisis keywords are detected, the app renders a pre-written Red-tier response with hardcoded crisis resources (988, NL Crisis Line, Good2Talk, 911) — no LLM is invoked. This ensures crisis resources are surfaced even if the LLM is slow, rate-limited, or down.

The crisis detector is tested in `src/__tests__/crisis-detector.test.ts`. False positives are acceptable; false negatives are not.

### 2. The Red-tier response

When the crisis detector returns `'red'`, the app displays:
- A calm but prominent banner
- A deterministic, pre-written bot response (from `src/config/prompts.json`)
- Pinned crisis resource cards for 988, NL Crisis Line, Good2Talk, and 911
- A "Call 988 now" button (direct `tel:` link on mobile)

Crisis banners never auto-dismiss. The chat can continue, but resources stay pinned.

### 3. Updating resource information (without touching code)

All campus resources — phone numbers, hours, URLs, and classifications — live in [`src/config/resources.json`](src/config/resources.json). To update a phone number or add a new resource:

1. Edit `src/config/resources.json`
2. Commit and push to the `main` branch
3. Vercel auto-deploys within 2 minutes

No code changes required. The MUN Student Wellness office can maintain this file with basic Git knowledge.

### 4. LLM provider fallback

The app uses two free-tier LLM providers via a swappable adapter interface:
- **Gemini 2.5 Pro** (Google AI Studio, 100 req/day) — initial check-in assessment
- **Groq Llama 3.3 70B** (1,000 req/day) — ongoing conversation + Gemini fallback

If Gemini's daily quota is exhausted, the router automatically falls back to Groq. If both fail, a deterministic degraded response is returned with Yellow-tier resources. The app never leaves a user stranded.

### 5. No personally identifiable information is stored

- No accounts, no logins, no email, no student numbers
- No IP addresses logged
- No conversation text persisted server-side
- No campus, program, or demographic quasi-identifiers in the database
- Mood history lives only in the browser's `localStorage`

See the PRD §6 (Technical Architecture → Privacy Architecture) for details.

---

## Pre-Launch Requirements

Before production deployment to Memorial University:

- [ ] **Legal review** — Confirm PHIA/PIPEDA exemption with MUN legal counsel
- [ ] **ATIPP consultation** — Review privacy architecture with MUN's Access to Information and Protection of Privacy office
- [ ] **ICEHR review** — Determine whether ethics board review is required for any aggregate usage reporting
- [ ] **Stakeholder sign-off** — MUN Student Wellness Centre, Student Union, Student Affairs
- [ ] **Crisis resource verification** — Confirm all phone numbers in `src/config/resources.json` are current
- [ ] **Accessibility audit** — WCAG 2.1 AA compliance
- [ ] **Soft launch** — Pilot with one residence or student group before campus-wide release

---

## Local Development

```bash
# Install
npm install

# Copy env template and fill in values
cp .env.local.example .env.local

# Dev server
npm run dev

# Run tests
npm test

# Build
npm run build
```

Required env vars are documented in `.env.local.example`.

---

## Tech Stack

- **Frontend/Backend:** Next.js 16 (App Router) + Tailwind CSS
- **Database:** Supabase (Postgres, free tier) — anonymized aggregate metrics only
- **LLM:** Gemini 2.5 Pro (primary assessment) + Groq Llama 3.3 70B (conversation + fallback)
- **Hosting:** Vercel (Hobby plan)
- **Total monthly cost:** $0

---

## License

MIT — see [LICENSE](LICENSE).

This project is open-source so any Canadian university can fork and adapt it for their campus. Contributions welcome.
