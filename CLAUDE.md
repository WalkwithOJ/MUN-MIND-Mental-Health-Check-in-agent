## Workflow Orchestration
### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution
### 3. Self-Improvement Loop
- After ANY correction from the user: update "tasks/lessons.md" with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
### 5. Internal Review Gate
- **EVERY plan MUST be reviewed by a subagent before the user sees it.** No exceptions. If scope expands mid-plan (e.g., stretch features promoted), run a second review pass against hard architectural invariants.
- **EVERY code change/addition MUST be reviewed** — not batched, not deferred to the end. Use `feature-dev:code-reviewer` for implementation; `superpowers:code-reviewer` for milestone verification against the plan.
- Reviews are continuous, not a final gate. Waiting until the end means issues compound.
- Never present work as "done" without a review pass — catch issues before they reach the user.
### 6. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it
### 7. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how
## Task Management
1. **Plan First**: Write plan to "tasks/todo.md" with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to "tasks/todo.md"
6. **Capture Lessons**: Update "tasks/lessons.md" after corrections
## Session Resilience
- Proactively save session state to memory files and tasks/ so a crash or PC death loses minimal progress
- After completing any meaningful step: update tasks/todo.md, and write findings/decisions to the relevant project doc
- At natural milestones (research done, plan written, feature complete): snapshot current status to memory
- On session start: read tasks/todo.md, tasks/lessons.md, and MEMORY.md to resume where we left off
- Prefer writing to disk over holding state in context — disk survives, context doesn't

## Project Context Documents
Read these files on-demand when relevant to the current task — don't load all at once:
- `docs/platform-docs.md` — every feature described in detail (populated during implementation)
- `docs/ICPs.md` — ideal customer profiles / user dossiers
- `docs/styleguide.md` — visual identity, colors, typography, component patterns
- `docs/anti-vibe-code.md` — patterns to avoid (generic AI aesthetics, vibe-coding)
- `docs/roadmap.md` — vision, phases, and non-goals
- `docs/data-reference.md` — domain data relationships and privacy constraints

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **No Co-Author**: NEVER include Claude as a co-author when committing, pushing, or working with git/GitHub.
