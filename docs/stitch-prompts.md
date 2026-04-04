# Google Stitch Design Prompts — MUN MIND

> Work through these prompts in order. Each builds on the previous.
> Copy-paste each prompt block into Stitch as a separate generation.

---

## Prompt 1: Design System Foundation

```
Design a complete design system for "MUN MIND" — an anonymous mental health check-in web app for university students at Memorial University of Newfoundland (MUN).

BRAND PERSONALITY:
- Warm but not childish. Calm but not clinical. Trustworthy and approachable.
- Think "a quiet, well-lit room where you feel safe talking" — not a hospital, not a therapy app ad.
- The app must feel like a peer, not an authority figure. Students should feel like they chose to be here, not that they were sent here.

DESIGN SYSTEM SPECS:
- Color palette: Calming, nature-inspired tones. Consider deep teal or soft sage as primary. Warm neutral backgrounds (not stark white). Avoid: purple gradients, neon accents, anything that looks like a generic AI product.
- Typography: Clean sans-serif. Two fonts max — one for headings, one for body. Comfortable reading size (16px+ body). Good weight hierarchy without extremes.
- Spacing scale: 4px base unit. Define a consistent scale (4, 8, 12, 16, 24, 32, 48, 64).
- Border radius: Only 2 values — small (8px for inputs/buttons) and large (16px for cards/containers). No mixing.
- Shadows: Subtle. One elevation level for cards, one for modals/overlays. No glowing effects.
- Component library: Button (primary, secondary, ghost, crisis/danger), Input field, Chat bubble (user + bot), Card, Modal/overlay, Badge/tag, Icon button.

ACCESSIBILITY:
- WCAG 2.1 AA minimum contrast ratios
- Clear focus indicators (visible ring, not just color change)
- Touch targets 44px minimum

Show: color swatches with hex codes, type scale samples, spacing visualization, all button states (default, hover, focus, disabled), and the component set laid out as a reference sheet.
```

---

## Prompt 2: Welcome & Onboarding Flow

```
Design the welcome and onboarding screens for "MUN MIND" — an anonymous mental health check-in app for MUN university students. Use the design system from the previous generation.

SCREEN 1 — LANDING PAGE:
- App name "MUN MIND" with a subtle, non-clipart logo mark
- Tagline: something like "A private space to check in with yourself" (warm, not clinical)
- Three trust signals displayed prominently:
  1. "Completely anonymous — no login, no tracking"
  2. "Not a replacement for professional support"
  3. "Built by MUN students, for MUN students"
- Single CTA button: "Start a Check-In"
- Small footer link: "Crisis? Get help now →" (always visible, every screen)
- Clean, generous whitespace. No stock photos. No illustrations of sad people. Consider abstract organic shapes or gentle gradients as visual interest.

SCREEN 2 — PRIVACY NOTICE (overlay/modal that appears on first visit):
- Header: "Before we begin"
- Plain-language privacy explanation in 4-5 bullet points:
  • No account needed, nothing to sign up for
  • Your conversation isn't saved after you close this tab
  • We don't collect your name, email, or student number
  • No one at MUN can see what you share here
  • If you're in crisis, we'll show you real support resources
- Checkbox: "I understand this is not counselling or therapy"
- Button: "I understand, let's go"
- The tone should feel like a friend explaining the rules, not a legal document

SCREEN 3 — CAMPUS SELECTOR (simple, one-time per session):
- "Which campus are you on?" (so we show the right resources)
- Three large tap-friendly cards:
  1. St. John's Campus
  2. Grenfell Campus (Corner Brook)
  3. Marine Institute
- Option: "I'd rather not say" (defaults to general NL resources)
- This is the ONLY quasi-identifier collected. No other demographic questions.

Design all three screens for both desktop (1440px) and mobile (390px) viewports.
```

---

## Prompt 3: Core Chat Interface

```
Design the main chat check-in interface for "MUN MIND." This is where students spend 90% of their time. Use the design system from prompt 1.

THE CHAT SCREEN:
- Full-height conversational interface. Messages flow vertically.
- Bot messages: left-aligned, rounded bubble, slightly tinted background. Small "MIND" label or avatar (abstract, not a face — maybe a small leaf or circle mark).
- User messages: right-aligned, primary color bubble, white text.
- Typing indicator: three animated dots in a bot bubble (subtle pulse, not bouncing).
- Input area at bottom: text input with placeholder "Type your response..." and send button. The input should feel spacious and inviting, not cramped.
- Persistent header bar: "MUN MIND" left-aligned, small "End session" link right-aligned, and a subtle "Crisis resources" link/icon always accessible.
- No sidebar, no navigation drawer. The chat IS the interface.

EXAMPLE CONVERSATION FLOW (show these as real messages):
- BOT: "Hey. Welcome to MUN MIND. This is a private check-in — nothing here is saved or shared. How are you feeling today?"
- USER: "honestly not great, been really stressed"
- BOT: "I hear you. Stress can really pile up, especially mid-semester. Would you like to tell me more about what's going on, or would you prefer to start with a quick mood check-in?"
- [Show a "Quick check-in" chip/button and a "Let me talk" chip/button as inline response options]

MOOD CHECK-IN WIDGET (inline in chat, not a separate screen):
- Appears as a special bot message when the check-in portion begins
- Five mood options displayed as large, tappable cards in a horizontal row:
  • Great (subtle upward icon, warm green)
  • Good (gentle positive icon, soft teal)
  • Okay (neutral icon, muted gray-blue)
  • Low (gentle downward icon, muted amber)
  • Struggling (gentle icon, soft warm red — NOT alarming red)
- After selection, a brief follow-up appears inline: "What's on your mind?" or "Want to share more?"
- These are NOT emoji. Use simple, abstract geometric shapes or minimal line icons.

QUICK-REPLY CHIPS:
- Show how the bot can offer structured response options as tappable chips below a message
- Example chips: "Academic stress", "Loneliness", "Sleep issues", "Relationship stuff", "Just need to vent"
- Chips are pill-shaped, outlined style, wrap to multiple lines on mobile

Design for desktop (1440px) and mobile (390px). The mobile version is the PRIMARY design — most students will use this on their phones.
```

---

## Prompt 4: Resource Cards & Crisis Escalation

```
Design the resource surfacing and crisis escalation screens for "MUN MIND." These are safety-critical — they must be clear, calm, and unmissable. Use the established design system.

RESOURCE CARD (appears inline in chat):
- When the conversation naturally surfaces a need, the bot shows a resource card
- Card design: slightly elevated, distinct from regular chat bubbles, with a colored left border indicating type
- Card contains: Resource name, one-line description, contact method (phone/text/web), hours of availability
- Tap/click on card expands to show more detail or opens external link
- Example cards:
  1. "MUN Student Wellness Centre" — 709-864-8874 — Mon-Fri 8:30-4:30 — Book or walk in
  2. "Good2Talk NL" — 1-833-292-3698 — 24/7 student helpline
  3. "988 Suicide Crisis Helpline" — Call or text 988 — 24/7

RESOURCE DIRECTORY (accessible via header icon, not just in chat):
- Full-page overlay or slide-in panel
- Three sections with clear headers:
  1. "On Campus" — Wellness Centre, Campus Enforcement, Grenfell Wellness (show campus-appropriate ones based on session selection)
  2. "Crisis Lines (24/7)" — 988, NL Crisis Line, Good2Talk, 811, Crisis Text Line, Trans Lifeline
  3. "Emergency" — 911, Waterford Hospital, HSC Emergency
- Each entry: name, phone number (tappable on mobile), brief description, hours
- Search/filter: none needed — the list is short enough to scan

CRISIS ESCALATION STATE:
- Triggered when crisis keywords are detected (e.g., "I want to die", "suicide", "hurt myself")
- The ENTIRE chat interface shifts tone:
  • A calm but prominent banner appears at the top: "It sounds like you might be going through something really serious. You don't have to handle this alone."
  • Bot response is deterministic (not AI-generated), warm but direct: "I want to make sure you're safe. Here are people who can help right now:"
  • Three priority resource cards appear stacked: 988, NL Crisis Line, 911
  • A large, primary-colored button: "Call 988 now" (tappable, initiates phone call on mobile)
  • The regular chat input remains available but the resources stay pinned at the top
- This state must NOT feel like a punishment or alarm. No red warnings, no sirens, no "DANGER" language. It should feel like a gentle hand on the shoulder.
- Secondary text: "You can still keep talking here, or reach out to any of these resources whenever you're ready."

"I'M NOT A THERAPIST" PERSISTENT DISCLAIMER:
- Subtle but always visible — a small text line above the input or in the header
- "MUN MIND is not counselling or therapy. If you need support, help is available."
- On first bot message, a one-time expanded version appears as a system message (not from the bot character)

Design all states for mobile (390px) primary and desktop (1440px) secondary.
```

---

## Prompt 5: Mood History & Session Summary

```
Design the mood tracking and session summary views for "MUN MIND." These help students see patterns in how they're feeling. Use the established design system.

IMPORTANT CONSTRAINT: All data is session-scoped and stored only in the browser. There are no accounts. When the tab closes, data is gone. The UI must make this clear.

MOOD HISTORY VIEW (accessible via a small icon in the chat header):
- Slides in as a right panel on desktop, full-screen overlay on mobile
- Header: "Your Check-Ins" with subtitle "Stored on this device only — clears when you close the tab"
- Timeline visualization: vertical timeline showing mood entries from the current session
  • Each entry: mood icon + label, timestamp ("Today, 2:14 PM"), optional brief note/tag the student added
  • If multiple check-ins in one session, they stack chronologically
- If no history: empty state with friendly message: "Nothing here yet. Start a check-in to track how you're feeling."
- No charts or graphs for a single session — a simple list is more honest and useful
- If we implement localStorage persistence (optional, future): show a "Clear my data" button prominently

SESSION SUMMARY (appears when user clicks "End session"):
- Modal/overlay that summarizes the session before closing
- Content:
  • "Session Summary" header
  • Mood recorded: [icon + label]
  • Topics discussed: [tags derived from conversation, e.g., "Academic stress", "Sleep"]
  • Resources shared: [list of any resource cards shown during the session]
  • A warm closing message: "Thanks for checking in. Remember, it's okay to come back anytime."
- Two buttons:
  • "Close session" (clears everything)
  • "Keep talking" (returns to chat)
- Below the buttons: reminder text — "This summary won't be saved after you close the tab."

END-OF-SESSION NUDGE:
- If the conversation has been going for 15+ minutes or 20+ messages, the bot gently offers:
  • "We've been talking for a bit. Would you like to wrap up with a summary, or keep going?"
  • This appears as a system message, not a bot message

RETURN VISIT (new session, same device):
- Landing page with a subtle difference: "Welcome back" instead of generic greeting
- No data from previous sessions — completely fresh
- Small text: "Each visit is a fresh start. Nothing from before is stored."

Design for mobile (390px) primary and desktop (1440px) secondary.
```

---

## Prompt 6: Error States, Loading, & Edge Cases

```
Design all error states, loading states, and edge case screens for "MUN MIND." These are the moments most apps neglect — they matter here because a student in distress encountering a broken screen is a safety issue. Use the established design system.

LOADING STATES:
1. Initial app load: centered logo with a gentle fade-in animation, then transition to landing page. No spinner — use a calm breathing-pace pulse on the logo.
2. Waiting for bot response: typing indicator (three dots pulsing) in a bot bubble. If response takes >5 seconds, add subtle text below: "Still thinking..."
3. Sending message: user bubble appears immediately with a subtle "sending" state (slightly faded), then solidifies on confirmation. Optimistic UI.

ERROR STATES:
1. LLM API failure (bot can't respond):
   - Replace typing indicator with a system message: "I'm having trouble connecting right now. This sometimes happens."
   - Show a "Try again" button
   - ALWAYS show: "If you need support right now, these resources are available 24/7:" followed by crisis resource cards (988, NL Crisis Line)
   - The error must NEVER leave a student stranded without resources

2. Network offline:
   - Banner at top of chat: "You're offline. Your messages will send when you reconnect."
   - Crisis resources shown with phone numbers (which work offline on mobile): "You can still call these numbers:"
   - Chat input remains functional (queues messages locally)

3. Rate limited (free API tier exceeded):
   - Bot message: "I've reached my limit for today. I'll be back tomorrow."
   - Show all resource cards as a fallback
   - "In the meantime, here are people you can talk to right now:"

EDGE CASES:
1. Empty message submitted: input shakes gently, no error text needed
2. Very long message (1000+ chars): allow it, no truncation. Students venting shouldn't be cut off.
3. Session timeout (idle 30+ min): gentle modal — "Still there? Your session is still private." with "I'm here" button
4. JavaScript disabled: static HTML fallback page with just the crisis resource list and phone numbers. No chat functionality, but safety resources are always accessible.
5. Unsupported browser: similar static fallback with resources

MOBILE-SPECIFIC:
- Keyboard open state: chat input stays above keyboard, messages scroll up. Show how the layout adapts.
- Notch/safe area handling on modern phones
- Pull-to-refresh: disabled (no server data to refresh)

Design each state as a screen. Mobile (390px) primary, desktop (1440px) secondary.
```

---

## Prompt 7: Complete User Flow Diagram

```
Design a comprehensive user flow diagram for "MUN MIND" — showing every path a student can take through the app, from first visit to session end.

This is a FLOWCHART / JOURNEY MAP, not a screen design. Use clean boxes, arrows, and decision diamonds.

FLOWS TO INCLUDE:

FLOW 1 — HAPPY PATH (first-time check-in):
Landing page → Privacy notice (accept) → Campus selector → Chat begins → Bot greeting → Mood check-in widget → Student selects mood → Follow-up conversation → Bot surfaces relevant resource card → Student continues or ends → Session summary → Close

FLOW 2 — CRISIS PATH:
Any point in conversation → Crisis keyword detected → Deterministic crisis response (NOT AI) → Priority resource cards pinned → Student can call 988 / continue talking / close → If "End session" → Session summary with crisis resources repeated

FLOW 3 — QUICK CHECK-IN:
Landing → Privacy notice → Campus → Chat → Mood selection → Student says "that's it, just wanted to log it" → Bot acknowledges warmly → Offers session summary → Close

FLOW 4 — RETURN VISIT:
Landing (shows "Welcome back") → Privacy notice skipped (already accepted in previous session via sessionStorage) → Campus selector skipped (remembered in sessionStorage) → Chat begins fresh → Same flows as above

FLOW 5 — ERROR/FALLBACK:
Bot fails to respond → Error message + crisis resources shown → Student can retry or call a resource → If persistent failure → Static resource page

FLOW 6 — RESOURCE BROWSING:
Any screen → Tap "Crisis resources" icon in header → Resource directory opens → Student browses/taps phone number → Returns to chat

DECISION POINTS TO MARK:
- Privacy notice: Accept or Leave
- Campus: Select one or "Rather not say"
- Mood: Select one of five levels
- Crisis keywords: Detected or not (system, not student choice)
- Session end: Summary → Close or Keep talking
- API error: Retry or view resources

Use a clean, professional diagramming style. Color-code the paths: green for happy path, amber for crisis path, gray for error path. Include screen names that map to the designs from previous prompts.
```

---

## Prompt 8: Responsive Layout & Interaction Specs

```
Design a responsive behavior and interaction specification sheet for "MUN MIND." This is for the development team — showing exactly how the UI adapts and moves.

BREAKPOINTS:
- Mobile: 390px (primary design target)
- Tablet: 768px
- Desktop: 1440px

LAYOUT BEHAVIOR:
1. Chat interface:
   - Mobile: full-width, input fixed to bottom, messages fill viewport height minus header (64px) and input (72px)
   - Tablet: centered container max-width 640px, same vertical layout
   - Desktop: centered container max-width 720px, generous side margins, chat feels like a focused column

2. Resource directory:
   - Mobile: full-screen overlay sliding up from bottom
   - Tablet: right-side slide-in panel, 400px wide
   - Desktop: right-side panel, 480px wide, chat dims behind it

3. Session summary modal:
   - Mobile: full-screen
   - Tablet/Desktop: centered modal, max-width 520px, backdrop blur

INTERACTION SPECS:
1. Chat bubble entrance: fade-in + slide-up (200ms, ease-out). Bot bubbles have 300ms delay after typing indicator.
2. Mood card selection: scale to 1.05 on hover/focus, selected state has filled background + checkmark. Unselected cards fade to 60% opacity after selection.
3. Quick-reply chips: appear with staggered fade-in (50ms between each). On tap: chip fills with primary color, other chips fade out, selected chip animates into a user message bubble.
4. Crisis banner: slides down from top (300ms, ease-out). Does NOT auto-dismiss. Student must scroll past or close.
5. Resource card expand: smooth height animation (200ms). Chevron rotates.
6. Send button: icon rotates 45° on send, returns on message delivered.
7. Session end: chat messages fade out sequentially from bottom to top (50ms stagger), then summary fades in.

GESTURE SUPPORT (mobile):
- Swipe down on chat: scroll up through history (native scroll)
- Long-press on bot message: "Copy text" option (accessibility)
- Swipe right on resource directory: close panel
- No pull-to-refresh, no swipe-to-delete

Show annotated mockups with arrows indicating animation direction, timing values, and easing curves. Use the actual screen designs from previous prompts as the base.
```

---

## Usage Notes

**Order matters:** Prompts 1-6 are screen designs. Prompt 7 is the flow diagram. Prompt 8 is the spec sheet. Generate them in this order so each builds on the previous context.

**If Stitch loses context between prompts:** Re-include the design system summary (colors, fonts, radius values) at the top of each prompt.

**What you'll have when done:**
- Design system / component library (Prompt 1)
- 3 onboarding screens, desktop + mobile (Prompt 2)
- Chat interface with mood widget + chips, desktop + mobile (Prompt 3)
- Resource cards, directory, and crisis state, desktop + mobile (Prompt 4)
- Mood history + session summary, desktop + mobile (Prompt 5)
- All error/loading/edge case screens (Prompt 6)
- Complete user flow diagram (Prompt 7)
- Responsive + interaction spec sheet (Prompt 8)

This is everything a dev team needs to build without guessing.
