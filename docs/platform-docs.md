# Platform Documentation — MUN MIND

> A feature-by-feature tour of what ships in production. For the *why*, see [`PRD.md`](PRD.md). For the *how*, see [`architecture.md`](architecture.md).

Every entry below follows this shape: **screen**, **purpose**, **functionality**, **edge cases**, **dependencies**.

---

## Onboarding flow

### Landing hero

**Screen:** `/`
**Purpose:** Set the tone and deliver the single most important CTA — "Start a Check-In" — without any friction.
**Functionality:**
- Full-bleed editorial hero with the tagline from `copy.json → landing.heading`
- Three trust-signal cards (anonymity, not-a-therapist, built-for-MUN)
- Single primary CTA button
- No form fields, no account creation, no privacy wall at this stage — the wall comes after the student has committed to starting

**Edge cases:**
- On a return visit within the same tab, the student still sees the full hero (no "welcome back" heading swap — that was removed after it felt like stale state).

**Dependencies:** `copy.json`, `OnboardingFlow.tsx`, design tokens in `globals.css`

---

### Privacy notice modal

**Screen:** `/` (triggered by clicking "Start a Check-In")
**Purpose:** Tell the student exactly what happens with their data, in plain language, before they type anything.
**Functionality:**
- Bulleted list of privacy promises from `copy.json → privacy.points`
- Required "I understand this is not counselling or therapy" acknowledgment checkbox
- Acknowledgment is stored in `sessionStorage: mun-mind:privacy-ack` and persists for the tab lifetime
- Skippable on subsequent check-ins within the same tab

**Edge cases:**
- Cancelling closes the modal without advancing; the student can re-open it at any time
- Clicking outside the modal doesn't dismiss it (intentional — this is a consent gate)
- Escape key closes the modal (accessibility requirement)

**Dependencies:** `onboarding-storage.ts`, `Modal.tsx`

---

### Campus selector

**Screen:** `/` (triggered after privacy acknowledgment)
**Purpose:** Let the student pick their campus so the resource directory filters to the right locations.
**Functionality:**
- Three campus cards: St. John's, Grenfell, Marine Institute
- Fourth option: "I'd rather not say" — maps to campus id `any`, filters to NL-wide resources only
- Selection is stored in `sessionStorage: mun-mind:campus` — **never transmitted to any API route**
- Navigates to `/chat` on selection

**Edge cases:**
- Campus is **the only piece of semi-identifying information** collected. It lives in sessionStorage only, so it's wiped when the tab closes.
- A student who arrives at `/chat` without a campus pick is bounced back to `/`.

**Dependencies:** `campuses.json`, `onboarding-storage.ts`

---

## Chat experience

### Chat shell

**Screen:** `/chat`
**Purpose:** The 90% use case. A scrolling conversation with the bot, a mood widget, and easy access to crisis resources.
**Functionality:**
- Bot greeting card at the top (fades away once messages start flowing)
- Message list with live region for screen-reader announcements
- Sticky bottom bar containing: disclaimer + "End session" link, text input, voice mic button, send button
- Messages are kept in React state only (wiped on unmount), capped at 6 messages (3 turns) sent to the LLM
- The session lives entirely in-memory — refreshing the page starts a new session

**Edge cases:**
- If the student deep-links to `/chat` without completing onboarding, they're redirected to `/`
- If the LLM fails, a degraded fallback reply ships with yellow-tier resources so the student never sees a dead chat
- If Supabase fails to create a session row, the LLM call still runs — session ID is `null` and mood entries are skipped

**Dependencies:** `useChat.ts`, `ChatContainer.tsx`, `MessageList.tsx`, API routes `/api/checkin`, `/api/converse`, `/api/mood`

---

### Text input

**Screen:** `/chat` (sticky bottom bar)
**Purpose:** The primary way students compose and send messages.
**Functionality:**
- Auto-growing textarea, caps at ~160px before scrolling internally
- Desktop: **Enter** sends, **Shift+Enter** inserts a newline
- Touch devices: **Enter inserts a newline always** — the send button is the only way to send
- Touch detection uses `matchMedia('(pointer: coarse)')` via `useIsTouchDevice.ts`
- Disabled while an API call is in flight

**Edge cases:**
- iPads with an external keyboard report a fine pointer, so they get desktop behavior
- Touchscreen laptops report a fine primary pointer, also desktop behavior
- The voice button streams interim transcripts *into* the textarea — nothing auto-sends

**Dependencies:** `useIsTouchDevice.ts`, `VoiceButton.tsx`, `useChat.ts`

---

### Voice input

**Screen:** `/chat` (mic button in the sticky bottom bar)
**Purpose:** Low-friction dictation for students who'd rather speak than type.
**Functionality:**
- Uses the browser-native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- First use triggers a privacy disclosure modal explaining that the browser vendor (Google on Chrome, Apple on Safari) processes the audio
- Acknowledgment is stored in `sessionStorage: mun-mind:voice-ack`
- While listening, the button pulses red and shows a `stop_circle` icon
- Interim transcripts stream into the textarea live; the student can edit before sending
- On the final transcript, the textarea has the full dictation — still not sent until the student taps send

**Edge cases:**
- Firefox doesn't implement `SpeechRecognition` — the mic button is hidden entirely, text input still works
- Permission denied → error status with a helpful explanation
- No mic hardware → error status
- `Permissions-Policy: microphone=(self)` in `next.config.ts` is required for this to work on production

**Dependencies:** `useSpeechRecognition.ts`, `voice-storage.ts`, `VoiceButton.tsx`, `next.config.ts` Permissions-Policy

---

### Mood widget

**Screen:** `/chat` (inline, after first bot reply)
**Purpose:** Structured "how are you feeling right now" capture for analytics + conversational branching.
**Functionality:**
- Five options: Great (5) / Good (4) / Okay (3) / Low (2) / Struggling (1)
- Each option has an abstract SVG glyph and a label — no emoji (per anti-vibe principles)
- Selection fires two things in parallel:
  1. Anonymized telemetry to `/api/mood` (session_id + 1–5 score + timestamp)
  2. A contextual LLM acknowledgment via `/api/converse` with the mood phrased as a message
- If the LLM fails, a canned acknowledgment from `copy.json → chat.moodAcknowledgments` is used as fallback

**Edge cases:**
- Selection is one-shot — once picked, the widget locks to prevent accidental re-clicks
- Pressing the same mood twice does nothing
- The widget only appears after the first bot reply, never during a deterministic red response (would feel wrong mid-crisis)

**Dependencies:** `MoodWidget.tsx`, `/api/mood`, `/api/converse`, `copy.json`

---

### Crisis banner

**Screen:** `/chat` (pinned above the conversation when tier = red)
**Purpose:** Make crisis resources impossible to miss when they're needed most.
**Functionality:**
- `role="alert"` with `aria-live="assertive"` — announced immediately by screen readers
- Contains a short headline, a brief explanation, and the full set of red-tier resource cards
- **Never auto-dismisses.** Once shown, it stays until the student navigates away or closes the tab
- Resources are sorted by priority: 911, 988, NL Crisis Line, Good2Talk, etc.

**Edge cases:**
- Triggered **client-side** before any network call, so slow servers can't delay crisis resources
- Triggered by the LLM server-side confirmation path as a backup
- Once shown, it can never be hidden by a server response — tier is escalate-only

**Dependencies:** `crisis-detector.ts`, `escalation.ts`, `CrisisBanner.tsx`, `resources.json`

---

### Session summary modal

**Screen:** `/chat` (triggered by clicking "End session")
**Purpose:** Give the student a graceful exit with a short recap of what happened during their check-in.
**Functionality:**
- Shows: the mood they picked (if any), topic tags surfaced by the LLM, up to 3 resources that were shared during the session
- Two buttons: "Keep talking" (dismiss, stay on chat) and "Close session" (navigate home, clear sessionStorage)
- Explicit "This summary won't be saved after you close the tab" note so no student wonders about hidden persistence

**Edge cases:**
- Empty-state summary ("A short check-in. That counts too.") if the student ended the session before picking a mood or hitting any topic tags
- "Close session" wipes all sessionStorage (privacy ack, campus, voice ack) so the next check-in starts fresh — visibly demonstrating that nothing carried over

**Dependencies:** `SessionSummaryModal.tsx`, `useChat.ts` sessionSummary, `onboarding-storage.ts`

---

### Session timeout modal

**Screen:** `/chat` (triggered after 30 min of idle)
**Purpose:** Gentle nudge for students who walked away mid-conversation.
**Functionality:**
- Fires after 30 minutes with no keyboard, mouse, touch, scroll, or visibility-change activity
- Copy: *"Still there? Your session is still private."*
- One button: "I'm here" — dismisses the modal and resets the idle timer
- Does **not** auto-end the session or show a forced summary

**Edge cases:**
- Auto-pauses while the session summary modal is already open (don't stack nudges)
- Using the voice input or sending a message also resets the timer
- Tab close is unaffected — everything is wiped on close regardless

**Dependencies:** `useIdleTimer.ts`, `SessionTimeoutModal.tsx`

---

## Resource directory

### Resources page

**Screen:** `/resources`
**Purpose:** Standalone, always-available directory of crisis lines, counselling, peer support, and self-help tools.
**Functionality:**
- Three sections: Crisis — call now, Counselling & peer support, Self-help tools
- Each section renders resources filtered by the student's campus selection (if any)
- Campus filter dropdown at the top lets the student switch campuses or see all of NL
- Resource cards have tel: links (direct dial on mobile) and url links (open in new tab)

**Edge cases:**
- A student who arrives without completing onboarding sees the "all of NL" view by default
- Campus lives in sessionStorage only; the route filters client-side

**Dependencies:** `resources.json`, `escalation.ts`, `ResourcesDirectory.tsx`, `ResourceCard.tsx`

---

### "Our Mission" page

**Screen:** `/about`
**Purpose:** Explain why the tool exists, how the privacy model works, and what the safety architecture looks like — in plain language.
**Functionality:**
- Static content rendered from a server component
- Four sections: why this exists, how privacy works, safety not sparkle, built for MUN
- Two CTAs at the bottom: Start a check-in, See all resources

**Edge cases:** none — pure content.

**Dependencies:** none beyond the root layout

---

## Header and footer

### App header

**Screen:** every page
**Purpose:** Persistent navigation with a prominent "Get Help" crisis CTA.
**Functionality:**
- Logo (leaf icon + "MUN MIND" wordmark) links home
- Nav links: Home, Our Mission, Resources (only visible on desktop — mobile is a focused single-column view)
- "Get Help" button always visible, links to `/resources`
- Dev-only "Reset" link visible on `/chat` when `NODE_ENV !== "production"`

**Edge cases:**
- Sticky with backdrop blur so the underlying content gently slides behind it on scroll
- Nav underline follows the active route

**Dependencies:** `AppHeader.tsx`, `Icon.tsx`

---

### App footer

**Screen:** every page
**Purpose:** Final safety net — a crisis link that's always reachable regardless of where the student is on the site.
**Functionality:**
- Copyright line
- "Crisis Help Now" link (highlighted in crisis red) → `/resources`
- Direct "Call 988" link (tel: on mobile) — phone number pulled from `resources.json` not hardcoded
- Generic "Resources" link → `/resources`

**Edge cases:** none.

**Dependencies:** `AppFooter.tsx`, `resources.json`

---

## Anonymity-preserving telemetry

### What gets recorded

**What:** three anonymized tables in Supabase — `sessions`, `mood_entries`, `resource_clicks`.
**Purpose:** Give MUN Student Affairs aggregate evidence that the tool is being used and has impact, without ever identifying a student.

**Functionality:**
- A session row is created on the first `/api/checkin` call (opaque UUID only)
- Mood widget selections insert a `mood_entries` row
- Resource card clicks insert a `resource_clicks` row with an opaque resource key
- Nothing else is ever written

**Edge cases:**
- Client-side red detection does NOT create a session row (would inflate crisis counts per message instead of per student)
- Supabase failure never blocks the LLM response — students always get a reply even if telemetry is down
- The `mood_score` is null in the degraded path (both LLMs failed), and the insert is skipped — no fabricated data in aggregate metrics

**Dependencies:** `supabase.ts`, `supabase/migrations/001_init.sql`, API routes

---

## Dev-only routes

### `/reset`

**Screen:** `/reset`
**Purpose:** Developer shortcut to clear `sessionStorage` and restart onboarding from scratch.
**Functionality:**
- Clears `mun-mind:privacy-ack`, `mun-mind:campus`, `mun-mind:has-visited`, `mun-mind:voice-ack`
- Redirects to `/`
- **404s in production**

**Dependencies:** `onboarding-storage.ts`

---

### `/style-guide`

**Screen:** `/style-guide`
**Purpose:** Component gallery for visual QA and design regression checking.
**Functionality:**
- Renders every UI primitive in every state (Button variants, ChatBubble roles, Badge tones, color swatches, etc.)
- Works in production but isn't linked from anywhere

**Dependencies:** `src/components/ui/*`

---

### `/api/diag/llm`

**Screen:** JSON endpoint
**Purpose:** Diagnose LLM provider issues without exposing internals.
**Functionality:**
- Calls `assess("I had a good day today.")` against both Gemini and Groq
- Returns per-provider status (`ok`, `auth`, `rate_limit`, `network`, `parse`, `unknown`)
- Never returns user message content, never exposes API keys
- **404s in production**

**Dependencies:** `gemini.ts`, `groq.ts`, `LLMError`
