# MUN MindCheck — Product Requirements Document

**Version:** 1.0
**Date:** April 4, 2026
**Status:** Draft for Review — MUN Student Affairs
**Author:** MUN MindCheck Team
**License:** Open Source (MIT or Apache 2.0)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Core Features (MVP)](#4-core-features-mvp)
5. [Stretch Features (Post-Hackathon)](#5-stretch-features-post-hackathon)
6. [Technical Architecture](#6-technical-architecture)
7. [Escalation Logic](#7-escalation-logic)
8. [Design Principles](#8-design-principles)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Handoff & Sustainability Plan](#10-handoff--sustainability-plan)

---

## 1. Overview

### Problem Statement

Mental health demand among post-secondary students in Canada has outpaced institutional capacity. According to the ACHA-NCHA III (2022), approximately 37% of Canadian post-secondary students report overwhelming anxiety, 28% experience depression severe enough to impair daily functioning, and 13% have seriously considered suicide. Newfoundland and Labrador carries a disproportionate burden, with the highest rates of mood and anxiety disorders in Atlantic Canada (14–15% vs. the national average of 8–9%).

At Memorial University, counselling wait times stretch to 3–5 weeks during peak periods, and the Student Wellness Centre operates exclusively during business hours (Monday–Friday, 8:30 AM – 4:30 PM). There is no MUN-specific digital tool available at 2 AM when a student is struggling alone in residence. Demand for counselling has doubled since 2019; capacity has not kept pace. Meanwhile, roughly 40% of students who recognize they need help never seek it — citing stigma, fear of judgment, or the belief that their problems aren't "serious enough." Only 25–30% of students who screen positive for a mental health concern ever access campus counselling.

### Vision

MUN MindCheck is an anonymous, conversational mood-tracking web app that helps Memorial University students pause, reflect on how they're doing, and — when appropriate — find their way to real support. It operates 24/7, requires no login, and costs the university nothing to run.

**What MUN MindCheck is:**
- A low-barrier check-in tool that meets students where they are
- A bridge to existing MUN and Newfoundland and Labrador mental health resources
- A "Level 0.5" intervention within MUN's Stepped Care 2.0 framework
- A complement to — never a replacement for — professional counselling

**What MUN MindCheck is not:**
- A therapist, counsellor, or diagnostic tool
- A substitute for crisis intervention or clinical care
- A data collection instrument for identifying individual students

### Target Users

MUN MindCheck serves the approximately 19,000 students across Memorial's three campuses: St. John's, Grenfell (Corner Brook), and the Marine Institute. This includes undergraduate students, graduate students, and international students — with particular attention to those who face additional barriers to accessing traditional support (cultural stigma, unfamiliarity with the Canadian healthcare system, reluctance to self-identify as needing help).

---

## 2. Goals & Success Metrics

### Primary Goal

Reduce friction for students to reflect on their mental state and connect to real, appropriate help — especially outside business hours and for those who would not otherwise seek support.

### Success Metrics (Campus Pilot — First Semester)

| Metric | Target | Measurement Method |
|---|---|---|
| **Weekly active check-ins** | 200+ unique sessions/week within 8 weeks of launch | Supabase anonymised session count (no user identification) |
| **Resource link click-through rate** | ≥ 15% of sessions where resources are surfaced result in a click | Client-side event logged to Supabase (anonymised) |
| **Repeat usage rate** | ≥ 30% of local-storage users return within 14 days | Client-side local storage check (no server-side tracking of individuals) |
| **After-hours usage share** | ≥ 40% of check-ins occur outside Mon–Fri 8:30 AM – 4:30 PM | Timestamp analysis on anonymised session data |
| **Crisis escalation accuracy** | 100% of sessions containing crisis keywords surface crisis resources | Automated test suite + manual QA review |

These metrics are designed to be measurable without compromising user anonymity. No metric requires identifying or re-identifying an individual student.

---

## 3. User Personas

### Persona 1 — Ritu, 2nd-Year International Graduate Student (Biochemistry)

**Background:** Ritu moved to St. John's from Hyderabad 14 months ago for her MSc. She has a strong academic record but finds the long winters isolating. She video-calls family weekly but doesn't discuss mental health — in her family, that's handled privately. She's heard of the Counselling Centre but the idea of sitting across from a stranger and explaining her feelings in her second language feels more stressful than the stress itself.

**Needs:** A private, low-pressure way to process how she's feeling without making an appointment, giving her name, or talking to anyone face-to-face. She would use something on her phone late at night. If something ever pointed her toward a resource that felt approachable, she might follow through.

**Quote:** *"I don't need a therapist. I just need to not feel like this at 1 AM with no one to talk to."*

### Persona 2 — Tyler, 3rd-Year Undergraduate (Business)

**Background:** Tyler is from Mount Pearl and lives off-campus. He did well in first year but has been struggling with motivation since a bad breakup and a course failure last semester. His friends would describe him as "fine" — he's good at performing normalcy. He looked up the Counselling Centre once but closed the tab when he saw the intake form. He doesn't think he's "sick enough" to take a spot from someone who really needs it.

**Needs:** Something that doesn't feel like a Big Deal. He'd use a quick check-in if it was anonymous and didn't make him feel like a patient. He doesn't want a diagnosis — he wants to know if what he's feeling is something he should pay attention to. If the tool told him "hey, this is worth talking to someone about" in a non-alarming way, he might actually book an appointment.

**Quote:** *"I'm not depressed. I'm just... not great. But who is?"*

### Persona 3 — Megan, 1st-Year Undergraduate (Nursing, Grenfell Campus)

**Background:** Megan is from a small town on the Northern Peninsula and is living away from home for the first time in Corner Brook. She's in a demanding program and finding the transition overwhelming. She's anxious most days but doesn't have a frame of reference — she doesn't know if this is "normal first-year stuff" or something more. She has the Grenfell counselling number but hasn't called because she doesn't know what she'd say.

**Needs:** A way to track whether what she's feeling is getting better or worse over time. She wants to see a pattern before deciding if she should do something about it. She'd appreciate being told what resources exist at Grenfell specifically — she didn't know about half of them.

**Quote:** *"I keep telling myself it'll get better next week. It's been eight weeks."*

---

## 4. Core Features (MVP)

All MVP features are scoped to be buildable by a solo developer in one week.

### 4.1 Anonymous Conversational Check-In

- No login, no account creation, no email required
- Student opens the app and is greeted with a warm, brief prompt (e.g., "Hey — how are you actually doing today?")
- Gemini 2.5 Pro processes the initial check-in response to assess mood and severity
- Groq Llama 3.3 70B handles follow-up conversation turns (2–4 turns maximum per session)
- Conversation is empathetic, reflective, and non-directive — it mirrors back what the student said, validates feelings, and gently surfaces relevant resources when appropriate
- Session data is ephemeral on the server; no conversation transcripts are persisted

### 4.2 Mood Tracking with Local Visualisation

- After each check-in, the student is shown a simple mood indicator (e.g., a 1–5 scale derived from the conversation)
- Mood history is stored in the browser's `localStorage` — never sent to the server
- A minimal trend chart (last 14 entries) lets the student see their pattern over time
- The student can clear their local history at any time with one tap

### 4.3 Escalation Flow

- Based on check-in severity (determined by both keyword matching and LLM assessment), the app surfaces tiered resources
- **Crisis keywords are matched deterministically (regex/keyword list), not by LLM judgment** — this is a hard safety requirement
- Three tiers: Green (general wellness tips + optional resources), Yellow (direct links to MUN counselling and peer support), Red (crisis lines displayed immediately and prominently)
- See [Section 7: Escalation Logic](#7-escalation-logic) for full specification

### 4.4 Resource Directory

- Static page listing all MUN Student Wellness resources, crisis lines, and community supports
- Organised by campus (St. John's, Grenfell, Marine Institute) and by type (counselling, crisis, peer support, self-help)
- Includes hours of operation, phone numbers, and links
- Content stored in a configuration file (JSON/YAML), not hardcoded in components

### 4.5 Mobile-Responsive Design

- Designed mobile-first — the primary use case is a student on their phone
- Fully functional on screens 320px and wider
- No app store download required; works in any modern mobile browser
- Touch-friendly interaction targets (minimum 44px)

---

## 5. Stretch Features (Post-Hackathon)

These features are explicitly out of scope for the hackathon MVP but represent a natural evolution if the tool gains traction.

| Feature | Description | Complexity |
|---|---|---|
| **Optional anonymous account** | Allow users to create a passphrase-based anonymous account (no email) to persist mood history across devices | Medium |
| **Journaling / free-text reflection** | After a check-in, offer a freeform text box for private journaling — stored locally or in an anonymous account | Low |
| **Weekly mood summary** | Generate a short natural-language summary of the student's week based on local mood data | Low |
| **Admin dashboard** | Aggregate, anonymised usage statistics (check-in volume, peak hours, resource click-through) presented in a dashboard for MUN Student Affairs | Medium |
| **PWA support** | Service worker + manifest for "Add to Home Screen" — feels like a native app without an app store | Low |
| **Multi-language support** | French and other languages for international students | Medium |
| **Grenfell / Marine Institute customisation** | Campus-specific resource sets and branding | Low |

---

## 6. Technical Architecture

### Stack Summary

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + Tailwind CSS | $0 |
| Backend | Next.js API Routes (serverless) | $0 |
| LLM — Initial Assessment | Gemini 2.5 Pro via Google AI Studio (free tier, ~100 req/day) | $0 |
| LLM — Conversation | Groq Llama 3.3 70B (free tier, ~1,000 req/day) | $0 |
| Database | Supabase Postgres (free tier, 500 MB) | $0 |
| Hosting | Vercel Hobby plan | $0 |
| **Total** | | **$0/month** |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Student's Browser                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Check-In UI  │  │  Mood Chart       │  │  Resources   │  │
│  │  (React)      │  │  (localStorage)   │  │  (Static)    │  │
│  └──────┬───────┘  └──────────────────┘  └──────────────┘  │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │ HTTPS (no cookies, no auth tokens)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Vercel (Serverless)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js API Routes                       │   │
│  │                                                       │   │
│  │  ┌─────────────┐    ┌──────────────────────────┐     │   │
│  │  │  /api/       │    │  LLM Adapter (Interface)  │     │   │
│  │  │  checkin     │───▶│                           │     │   │
│  │  └─────────────┘    │  ┌─────────┐ ┌─────────┐ │     │   │
│  │                      │  │ Gemini  │ │  Groq   │ │     │   │
│  │  ┌─────────────┐    │  │ 2.5 Pro │ │ Llama   │ │     │   │
│  │  │  /api/       │    │  │(Assess) │ │ 3.3 70B │ │     │   │
│  │  │  converse   │───▶│  └─────────┘ │(Converse)│ │     │   │
│  │  └─────────────┘    │              └─────────┘ │     │   │
│  │                      └──────────────────────────┘     │   │
│  │  ┌─────────────┐                                      │   │
│  │  │  Crisis      │ ◄── Deterministic keyword matching   │   │
│  │  │  Detector    │     (runs BEFORE LLM call)           │   │
│  │  └──────┬──────┘                                      │   │
│  └─────────┼────────────────────────────────────────────┘   │
│            │                                                 │
└────────────┼─────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│   Supabase Postgres      │
│   (Free Tier, 500 MB)    │
│                          │
│   • Anonymised session   │
│     metadata only        │
│   • Mood score (1–5)     │
│   • Timestamp            │
│   • Resource clicks      │
│   • NO conversation text │
│   • NO IP addresses      │
│   • NO user identifiers  │
└─────────────────────────┘
```

### LLM Abstraction

Both LLM providers are accessed through a common adapter interface, allowing the team to swap providers without changing application logic. This is critical given reliance on free tiers.

```
interface LLMProvider {
  assess(input: string): Promise<AssessmentResult>
  converse(history: Message[], input: string): Promise<ConversationResult>
}
```

- **Gemini 2.5 Pro** handles the initial check-in: it receives the student's first message, returns a mood assessment (severity tier + mood score) and a suggested opening response.
- **Groq Llama 3.3 70B** handles subsequent conversation turns: it receives the conversation so far and generates empathetic, resource-aware follow-ups.
- Conversation context is held in-memory for the duration of the session only. Nothing is persisted to the database.

### Privacy Architecture

**What is stored (server-side, in Supabase):**
- Anonymised session metadata: a random session ID (UUID, generated fresh each visit), mood score (1–5), timestamp, campus selection (if provided), and resource link clicks
- Aggregate counters for usage dashboards

**What is stored (client-side, in localStorage):**
- Mood history entries (score + timestamp) for the local trend chart
- User preference for clearing history

**What is never stored, anywhere:**
- Names, email addresses, student numbers, or MUN credentials
- IP addresses, device IDs, persistent cookies, or browser fingerprints
- Conversation transcripts or free-text input
- Any data that could identify or re-identify an individual

**The strongest legal position is genuinely not having the data.** MUN MindCheck is architected so that even a database breach reveals nothing about individual students.

---

## 7. Escalation Logic

### Severity Tiers

| Tier | Colour | Trigger | User Experience |
|---|---|---|---|
| **Tier 1 — Routine** | 🟢 Green | General check-in; no distress indicators | Empathetic reflection. Optional link to wellness resources. "Glad you checked in." |
| **Tier 2 — Elevated** | 🟡 Yellow | Moderate distress language; sadness, anxiety, overwhelm, academic stress, loneliness | Validation + direct links to MUN Counselling Centre, Togetherall, Good2Talk NL, peer support. "You don't have to figure this out alone." |
| **Tier 3 — Crisis** | 🔴 Red | Crisis keywords detected (see below) | Immediate, prominent display of crisis resources. Conversation pauses. Clear, directive language. "Please reach out now — people are ready to help you." |

### Crisis Keyword Detection (Deterministic)

Crisis detection is **not delegated to the LLM**. A deterministic keyword/phrase matcher runs on every student message **before** any LLM call is made. This ensures crisis resources are surfaced even if the LLM is down, slow, or produces an inadequate response.

**Keyword categories** (representative, not exhaustive — full list maintained in config):
- Suicidal ideation: "kill myself", "end my life", "want to die", "suicidal", "no reason to live", "better off dead", "don't want to be here anymore"
- Self-harm: "cut myself", "hurt myself", "self-harm", "burning myself"
- Harm to others: "hurt someone", "kill someone"
- Acute crisis: "can't go on", "no way out", "plan to end it"

The matcher uses normalised text (lowercased, common abbreviations expanded) and accounts for negation where feasible (e.g., "I'm not suicidal" should not trigger a false positive at the Red tier, but should still elevate to Yellow for safety).

### Resource Mapping by Tier

#### Tier 3 — Crisis (Red) — Always Displayed

| Resource | Contact | Availability |
|---|---|---|
| **988 Suicide Crisis Helpline** | Call or text **988** | 24/7 |
| **NL Provincial Crisis Line** | **709-737-4668** | 24/7 |
| **Good2Talk NL** | **1-833-292-3698** | 24/7 |
| **Crisis Text Line** | Text **CONNECT** to **686868** | 24/7 |
| **911 (Emergency)** | **911** | 24/7 |
| **MUN Campus Enforcement** | **709-864-8561** | 24/7 |
| **Waterford Hospital (Psychiatric Emergency)** | **709-777-3591** | 24/7 |
| **HealthLine 811** | **811** | 24/7 |

#### Tier 2 — Elevated (Yellow)

| Resource | Contact | Availability |
|---|---|---|
| **MUN Student Wellness Centre** | **709-864-8874** (UC-5000) | Mon–Fri 8:30 AM – 4:30 PM |
| **Grenfell Student Support** | **709-637-6246** | Mon–Fri |
| **Good2Talk NL** | **1-833-292-3698** | 24/7 |
| **Togetherall** | [togetherall.com](https://togetherall.com) (MUN licensed) | 24/7 |
| **Bridge the gApp** | [bridgethegapp.ca](https://bridgethegapp.ca) | 24/7 |

#### Tier 1 — Routine (Green)

| Resource | Contact | Availability |
|---|---|---|
| **MUN Student Wellness Centre** (optional link) | **709-864-8874** | Mon–Fri 8:30 AM – 4:30 PM |
| **Bridge the gApp** | [bridgethegapp.ca](https://bridgethegapp.ca) | 24/7 |
| **MindShift CBT App** | App Store / Google Play | 24/7 |

### Safety Considerations

1. **If a student expresses suicidal ideation**, the app must **always** surface the 988 helpline, the NL crisis line (709-737-4668), and encourage the student to speak with someone in person. This is non-negotiable and is never suppressed by any other logic.
2. **The LLM is never the sole arbiter of crisis detection.** Keyword matching is the first line of defence. The LLM may additionally flag concern, but keyword matching alone is sufficient to trigger Red tier.
3. **The app never attempts to "talk someone down."** In a Red-tier situation, the conversational agent defers to human services. The response is directive, not exploratory.
4. **The app never tells a student they are "fine."** Even in Green-tier responses, language is framed as "it sounds like things are going okay — and it's great that you checked in" rather than diagnostic reassurance.
5. **False positives are acceptable; false negatives are not.** If keyword matching is uncertain, the system errs toward the higher severity tier.

---

## 8. Design Principles

### Warm, Not Clinical

The tone of MUN MindCheck should feel like a thoughtful friend checking in — not a medical intake form. Language is conversational, validating, and human. We say "How are you actually doing?" not "Please rate your current affect on a scale of 1 to 10."

### Anonymity-First

The core experience requires zero personal information. No accounts, no logins, no emails, no cookies that track across sessions. A student should feel confident that using this tool cannot come back to identify them. This is not just a feature — it is the foundation of trust.

### Zero Guilt

Missing a check-in carries no consequence and generates no notification. There are no streaks, no "you missed yesterday!" prompts, no gamification of emotional labour. The app is there when the student wants it, and invisible when they don't.

### Transparency

The app clearly communicates:
- What data is stored (anonymised mood scores and timestamps) and what is not (conversations, identity)
- That it is not a counselling service and does not replace professional help
- That it uses AI to generate responses, and that AI can be imperfect
- How to clear any locally stored data

This information is available on a dedicated "About & Privacy" page, not hidden in a terms-of-service document.

### Anti-Vibe-Code Visual Identity

MUN MindCheck rejects the generic "AI wellness app" aesthetic. Specifically:
- **No purple-to-blue gradients.** The colour palette draws from MUN's institutional identity and Newfoundland's natural landscape — deep blues, warm grays, muted greens.
- **No sparkle or glitter animations.** Interactions are calm and intentional.
- **No generic AI assistant iconography** (no robot faces, no floating chat bubbles with sparkles).
- **No dark patterns.** No nudges to use the app more frequently, no "engagement" tricks.
- The design should feel like a well-built university tool — trustworthy, understated, and accessible.

---

## 9. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **Liability — student harm after using the app** | High | Low | Prominent disclaimers on every screen: "This is not a crisis service. If you are in danger, call 911 or 988." MUN MindCheck is not a medical device and makes no diagnostic claims. Legal review recommended before launch. |
| **LLM generates harmful, inaccurate, or inappropriate advice** | High | Medium | System prompts are tightly scoped (reflect, validate, surface resources — never diagnose, prescribe, or give clinical advice). Crisis detection is deterministic, not LLM-dependent. Output is reviewed during QA. Consider a response-filtering layer. |
| **Adoption — students don't use it** | Medium | Medium | Requires a campus champion (Student Wellness, Student Union, or faculty sponsor) for promotion. Launch during high-stress periods (midterms, finals). QR codes in residence, library, and student centre. Social media presence. |
| **Maintenance post-handoff** | Medium | High | Open-source codebase with clear documentation. Resources stored in config files, not code. Minimal infrastructure (Vercel + Supabase auto-manage). A single developer with intermediate Next.js skills can maintain it. |
| **Free-tier rate limits exceeded** | Medium | Medium | Gemini: ~100 requests/day. Groq: ~1,000 requests/day. At scale, this limits to ~200–300 full sessions/day. Mitigation: implement client-side rate awareness, queue during peak, and budget for paid tier ($20–50/month) if usage exceeds free limits. The LLM adapter interface makes provider swaps straightforward. |
| **Privacy / re-identification risk** | High | Low | No personally identifiable information is collected. Aggregated stats use sufficiently large time windows to prevent re-identification in small cohorts (e.g., don't report stats for fewer than 10 sessions in a bucket). Before launch, consult MUN ATIPP office and consider ICEHR ethics review. |
| **PHIA / PIPEDA regulatory exposure** | Medium | Low | The strongest legal position is not having the data. MUN MindCheck is designed to fall outside the scope of health information legislation by not collecting health information attributable to an individual. Legal confirmation should be obtained. |

---

## 10. Handoff & Sustainability Plan

### What MUN Needs to Maintain This

| Requirement | Details |
|---|---|
| **Hosting cost** | $0/month on current free tiers. If usage scales significantly: Vercel Pro ($20/month), Supabase Pro ($25/month), LLM API budget ($20–50/month). Total at scale: ~$65–95/month. |
| **Technical skill** | One developer with intermediate Next.js and basic SQL experience. No ML or AI expertise required — the LLMs are accessed via API. |
| **Content updates** | Resource directory (phone numbers, hours, URLs) is stored in a JSON config file. Updates require editing one file and pushing to git — Vercel auto-deploys. No code changes needed. |
| **LLM key rotation** | One Google AI Studio key and one Groq key, stored as Vercel environment variables. Rotation takes 5 minutes. |
| **Monitoring** | Vercel provides deployment logs and basic analytics. Supabase provides database monitoring. No additional observability stack needed for a campus tool. |

### Licensing

MUN MindCheck will be released under an open-source license — **MIT** or **Apache 2.0** — to be finalised before launch. This ensures:
- Any Canadian university can fork and adapt the tool for their campus
- MUN retains no proprietary obligation to maintain it
- The community can contribute improvements
- Transparency: anyone can verify what the code does

### Content Separation

All campus-specific content is separated from application logic:

- **`/config/resources.json`** — Crisis lines, counselling contacts, hours, URLs
- **`/config/prompts.json`** — LLM system prompts and conversation templates
- **`/config/keywords.json`** — Crisis keyword lists and escalation rules
- **`/config/copy.json`** — UI text, disclaimers, and tone-setting language

This means a non-developer staff member (with basic git training or a simple CMS layer) can update resource information without touching application code.

### Stepped Care 2.0 Alignment

MUN MindCheck is designed to sit at **Level 0.5** within the Stepped Care 2.0 framework developed at Memorial University by Dr. Peter Cornish. This positioning is deliberate:

- **Level 0 (Self-Management):** Students managing independently — no system contact
- **Level 0.5 (MUN MindCheck):** Guided self-reflection with anonymous AI-assisted check-ins and automated resource navigation. No clinical relationship. No human clinician involved.
- **Level 1 (Self-Directed Tools):** Structured tools like Togetherall, MindShift CBT, Bridge the gApp
- **Level 2+ (Professional Care):** MUN Counselling Centre, community therapists, psychiatric services

MUN MindCheck's role is to help students move from Level 0 (doing nothing) to Level 0.5 (reflecting and connecting), and to lower the perceived barrier to Level 1+ services. It does not attempt to deliver therapy, and it actively routes students toward higher levels of care when their needs warrant it.

This alignment makes MUN MindCheck a natural fit within Memorial's existing mental health infrastructure — not a competing service, but a front door.

### Pre-Launch Checklist

- [ ] Legal review: Confirm PHIA/PIPEDA exemption with MUN legal counsel
- [ ] Ethics review: Determine whether ICEHR review is required or advisable
- [ ] ATIPP consultation: Confirm privacy architecture meets MUN's ATIPP obligations
- [ ] Stakeholder sign-off: Student Wellness Centre, Student Union, Student Affairs
- [ ] Content review: Verify all resource contact information is current
- [ ] Accessibility audit: WCAG 2.1 AA compliance check
- [ ] Safety testing: Confirm crisis keyword detection covers edge cases
- [ ] Soft launch: Limited pilot (e.g., one residence or one student group) before campus-wide release

---

*This document is a living specification. It will be updated as the project evolves through development, testing, and stakeholder feedback.*
