# Plan Review Findings — 2026-04-04

Both review passes on the MUN MIND implementation plan. Preserved for rationale/audit trail.

---

## Pass 1 — Base Plan Review

**Reviewer:** `feature-dev:code-reviewer` subagent
**Scope:** Phases 1–14 (pre-Phase-15 expansion)

### Critical Issues (2)

**C1. Gemini 100 req/day fallback path undefined.**
At 100 req/day, Gemini exhausts during MUN usage peaks. The router's fallback was a placeholder ("return graceful fallback with resources") with no named, tested code path.
**Resolution:** Phase 4 now specifies: try Gemini → on 429/503/error fall back to Groq `assess()` with simplified prompt from `prompts.json` → on Groq failure return deterministic `assess_degraded_response`. Tested via mocked 429.

**C2. Conversation history depth + message logging discipline.**
The `converse` route passed full history to Groq with no depth cap. Vercel's default error logging could capture message content from failed requests.
**Resolution:** Max 3 turns (6 messages) sent to Groq. Explicit no-logging rule: never log `req.body.message`, `req.body.history`, or responses. Comments at top of every `src/lib/llm/*` file restating this.

### High Priority (4)

**H1. Crisis detector negation handling was too vague.**
"Handles negation where feasible" creates a false-negative risk. The design said "I'm not suicidal" should downgrade Red → Yellow, which fails on "I told my friend I wasn't suicidal."
**Resolution:** Negation NEVER suppresses Red. Only suppresses Yellow → Green in clearly negated moderate-distress phrases. Explicit test cases added.

**H2. Campus column on `sessions` table was a quasi-identifier risk.**
Research brief flagged small-cohort re-identification risk. Campus + timestamp + mood could identify individuals at small campuses like Grenfell.
**Resolution:** Campus removed from server entirely. Stored only in client-side sessionStorage for resource filtering.

**H3. ErrorState component placed in Phase 12 (polish) when it's safety-critical.**
Every error state surfaces crisis resources — if Phase 12 ships in v1.1, v1 has no crisis fallback on API errors.
**Resolution:** ErrorState + `public/fallback.html` moved to Phase 6. Phase 12 is non-safety polish only.

**H4. Crisis detection was server-only in the chat flow.**
A slow or failed server could delay the crisis banner. The hook specification implied the `tier` came from API response.
**Resolution:** `useChat` runs `detectCrisis()` client-side before dispatching API call. If Red, banner renders immediately; API call becomes telemetry, UI doesn't wait.

### Medium Priority (addressed)

- localStorage copy was wrong ("clears when you close the tab" describes sessionStorage, not localStorage)
- 30-day auto-delete was vague → concrete pg_cron SQL in `002_retention_policy.sql`
- `anti-vibe-code.md` reference existed but file location unconfirmed (confirmed exists in `docs/`)
- No CSP/security headers → added to `next.config.js` in Phase 1
- `AssessmentResult` type undefined → pinned explicitly in `types.ts` before either adapter
- `resource_key` format undefined → opaque IDs like `"mun_wellness_stjohns"` defined in Phase 2

---

## Pass 2 — Phase 15 Expansion Review

**Reviewer:** `feature-dev:code-reviewer` subagent
**Scope:** Phase 15 (previously-stretch features promoted to MVP)

### Critical Issues (3)

**C1. Passphrase vault breaks the PHIA/PIPEDA anonymity exemption.**
A server-side `passphrase_hash` is a persistent cross-session identifier. Research brief is explicit: "true anonymity, not pseudonymity." The vault hash is functionally identical to a persistent cookie.
**Resolution:** Passphrase accounts DEFERRED to v1.1. Options for v1.1: (a) client-side encrypted export/import (preserves anonymity), or (b) formal privacy position revision with ATIPP sign-off.

**C2. Weekly summary via LLM had architectural contradiction.**
"Runs client-side ... uses Groq via the existing adapter" — the adapter is server-side. Either mood data leaks through the server, or the Groq API key is exposed in client bundle. Both unacceptable.
**Resolution:** Weekly summary v1 is deterministic template rendering only — no LLM. LLM summaries can be v1.1 with explicit user consent and server-side route.

**C3. Journal text in passphrase vault had no encryption spec.**
"Server never sees journal text" stated as an invariant with no enforcement mechanism. Unencrypted journal text in Supabase would be the most sensitive data in the system.
**Resolution:** Journal text is localStorage-only in v1. Vault sync (with client-side AES-GCM encryption) deferred to v1.1.

### High Priority (3)

**H1. Admin dashboard k-anonymity threshold (k≥10) insufficient.**
Combinations of hourly buckets + resource keys + rare tiers can identify small groups at small campuses. Percentage fields bypass the per-bucket rule.
**Resolution:** Raised to k ≥ 15. Suppression enforced per-field in the API route, not just per-query. Peak hours bucketed by 4-hour windows. Rare resource keys show "< 15" only.

**H2. PWA service worker cache-staleness risk for crisis resources.**
Cached phone numbers could become stale after updates. Disconnected crisis number during a crisis = serious failure.
**Resolution:** Stale-while-revalidate pattern, versioned cache keys with BUILD_ID, `skipWaiting()` on install, `activate` deletes old versions. Fallback HTML shows "last updated" date + emergency disclaimer.

**H3. Streaming race condition — mid-stream user input.**
User typing a crisis message while bot is streaming created an unspecified race condition.
**Resolution:** Simpler, equally safe approach — disable input with visual indicator during active stream. Full abort-while-typing deferred to v1.1 polish.

### Medium Priority (addressed)

- French crisis keyword authorship process undefined → explicit two-phase plan: infrastructure in v1 (English only with banner), French content in v1.1 after native reviewer
- Admin auth was a shared env-var passphrase → acceptable for demo, README must document as "demo-grade only, replace before production"

---

## Scope Reality Check

The reviewer flagged that Phase 15 adds 7 substantial features to a 1-week build. Honest shipping order:

| Feature | Decision |
|---|---|
| 15.4 Admin dashboard | SHIP — clear value, well-scoped |
| 15.2 Journaling | SHIP (localStorage-only) |
| 15.5 PWA | SHIP (with stale-while-revalidate) |
| 15.6 Multi-language | SHIP infrastructure + English only |
| 15.7 Streaming | SHIP last (disable-input-during-stream) |
| 15.1 Passphrase accounts | **DEFER to v1.1** (privacy blocker) |
| 15.3 Weekly summary | SHIP deterministic only (no LLM in v1) |

---

## Outcome

Both review passes surfaced genuine issues that would have caused either safety regressions or privacy violations. The plan was revised incrementally after each pass. No review findings were dismissed.

**Lesson captured for `tasks/lessons.md`:** Stretch features promoted to MVP must be re-reviewed for compatibility with hard architectural invariants (anonymity, safety). What works as "nice-to-have later" may structurally conflict with v1 guarantees.
