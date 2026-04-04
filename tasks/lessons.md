# Lessons — MUN MIND

> Patterns, corrections, and rules captured during the project. Review at session start for relevant context.
> Each entry has a rule, **Why** (the incident or reasoning), and **How to apply** (when the rule kicks in).

---

## 2026-04-04 — Stretch features must be re-reviewed against hard invariants when promoted to MVP

**Rule:** When previously-deferred "stretch" features get promoted into MVP scope, run them through the review subagent again against the project's hard architectural invariants (in this project: anonymity and safety).

**Why:** During planning, the user requested that stretch features be moved into v1. The expanded plan initially included passphrase accounts, LLM-powered weekly summaries, and journal-in-vault. A second review pass found that all three structurally broke the "true anonymity" legal position from the research brief — `passphrase_hash` is a persistent cross-session identifier, and journal text in a server vault without client-side encryption is exactly the kind of free-text PHI the PRD promised to never store. None of these issues were obvious until the features were re-examined against the non-negotiables.

**How to apply:** Any time scope expands — stretch-to-MVP, post-review additions, "just one more thing" — re-run the review agent specifically against the project's hard invariants (documented in the PRD, research brief, or CLAUDE.md). Do not treat a feature that "would have been fine later" as automatically fine now. Earlier deferral may have been the very thing protecting the invariant.

---

## 2026-04-04 — Reviews happen continuously, not only at the end

**Rule:** Review subagents run after every plan and every meaningful code addition — not only as a final gate.

**Why:** Early in the session, the plan said to run reviews during Phase 13 (final polish). The user corrected this: "we dont wait till end of entire development before spawning review agents. every single code change/addition/plan must get reviewed first." Waiting until the end means issues compound; fixing a wrong-from-Phase-3 assumption in Phase 13 is expensive.

**How to apply:** After writing a plan → review before presenting to user. After writing/modifying code in a phase → review before marking the phase complete. The continuous gate is the default; "review at the end" is a bug.

---

## 2026-04-04 — Plan files must live in the repo, not just in Claude's plan cache

**Rule:** Once a plan is approved, copy it from `~/.claude/plans/*.md` to `tasks/todo.md` in the project immediately.

**Why:** Claude's plan directory is ephemeral and not tied to the project. If the session ends, the next session has no structured view of what was decided. The user explicitly asked where the final plan would be stored — the answer must be "in the repo, versioned with the code."

**How to apply:** Phase 0 of any approved plan: copy to `tasks/todo.md`. Commit it with the first real commit to the repo so it survives in git history.
