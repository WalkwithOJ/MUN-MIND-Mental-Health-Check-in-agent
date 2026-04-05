# Contributing to MUN MIND

Thanks for your interest. This project is deliberately built so future MUN students can pick it up, improve it, and ship changes confidently — even if they're new to web development. This guide explains what you need to know before making changes.

## Start here

1. Read [`README.md`](README.md) — especially the **Safety architecture** section.
2. Read [`docs/PRD.md`](docs/PRD.md) — understand *why* the app exists and what it refuses to be.
3. Read [`docs/anti-vibe-code.md`](docs/anti-vibe-code.md) — the visual and tone principles this project holds to.
4. Clone the repo, copy `.env.local.example` → `.env.local`, fill in your own keys, then run `npm install && npm run dev`.
5. Skim the `src/` tree to get your bearings. Start with `src/components/chat/ChatContainer.tsx` — that's the heart of the app.

## The safety-critical code

Some files control whether students in crisis see the right resources. **Changes to these files require extra care and a review from someone who has read the PRD.**

| File | Why it's sensitive |
|---|---|
| `src/lib/crisis-detector.ts` | The deterministic crisis detector. Every test case in `src/lib/__tests__/crisis-detector.test.ts` exists because it matters. Add cases, don't remove them. |
| `src/config/keywords.json` | Crisis keyword lists. **Do not edit without clinical input.** The Zod integrity check at load time will refuse to start the app if a Red-tier category is marked `negatable: true`. |
| `src/config/prompts.json` | LLM system prompts. Changes here can drift the model off-tone or off-safety. Test manually before merging. |
| `src/config/resources.json` | Phone numbers, hours, URLs. Verify every change with the provider before merging. A stale phone number on a crisis line is a patient-safety issue. |
| `src/lib/llm/router.ts` | The fallback path between Gemini and Groq. If this breaks, students hit "service unavailable" screens instead of getting a degraded response with resources. |
| `src/app/api/checkin/route.ts` and `src/app/api/converse/route.ts` | Crisis detection runs here before any LLM call. Do not reorder. |

**Golden rule:** false positives (the detector flags a benign message as Red) are acceptable. False negatives (a real crisis message gets through as Green) are not.

## Running the tests

```bash
npm test              # full suite, watch mode
npm test -- --run     # full suite, one pass
```

All 167 tests must pass before a PR can merge. The safety tests (`crisis-detector.test.ts`, `escalation.test.ts`, `router.test.ts`) are non-negotiable.

## Commit conventions

- Short, imperative subject line (72 chars max): `fix: mic button was blocked by Permissions-Policy`.
- Body explains **why**, not **what** — the diff already shows the what.
- Use conventional prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Never include "Claude" or any AI assistant as a co-author.

## Proposing changes

### I found a bug
Open a GitHub issue with: steps to reproduce, what you expected, what actually happened, and (if possible) a browser/device. If it's a safety-critical bug (crisis detector false negative, resource not showing up when it should), mark it `priority: safety` and ping the maintainers directly.

### I want to update a crisis resource
Edit `src/config/resources.json` directly and open a PR. Include a link or screenshot from the resource provider confirming the new info is correct.

### I want to add a new crisis keyword or phrase
Open an issue first. This requires clinical review. Include the proposed phrase, the tier you believe it belongs in, and reasoning (e.g. a research citation, a counsellor's recommendation).

### I want to add a feature
Open an issue with a short proposal before writing code. Most feature ideas run into the anonymity model or the privacy promise in non-obvious ways — a brief design discussion saves weeks of wasted work. Read [`docs/roadmap.md`](docs/roadmap.md) to see what's already planned.

### I want to change visual design
Read [`docs/anti-vibe-code.md`](docs/anti-vibe-code.md) first. The design language is intentionally warm, grounded, and unfashionable. Sparkles, purple gradients, AI-generated aesthetics, and "build your dreams" copy are explicitly out of scope — mental health tools carry weight and cannot feel like a consumer chatbot.

## The review gate

Every change — bugfix, feature, design, copy — gets a review before it reaches `main`. The reviewer's job is to ask:

1. **Does it break the safety architecture?** (Crisis detection still runs first? Resources still show up on errors?)
2. **Does it leak identifying information?** (Campus, IP, message content, user agent?)
3. **Does it match the tone?** (Warm, not clinical. Grounded, not cheery.)
4. **Does it pass `npm test`, `npm run lint`, and `npm run build`?**

A PR that can't answer all four "yes" won't get merged, even if the code is clever.

## Code style

- TypeScript strict mode. No `any` without a justifying comment.
- Functional React (hooks, not classes).
- Tailwind utility classes for styling. Design tokens live in `src/app/globals.css` under `@theme`.
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for everything else.
- Keep components under ~200 lines. Split when they grow.

## Questions?

Open a GitHub discussion. This project has no Slack, no Discord, no mailing list — everything happens on the repo in the open, so future contributors can read the reasoning behind decisions.
