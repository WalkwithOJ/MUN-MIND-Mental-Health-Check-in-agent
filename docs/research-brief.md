# MUN MIND — Research Brief

> **Date:** April 4, 2026
> **Purpose:** Inform PRD for a Mental Health Check-In Bot for MUN students
> **Note:** Research based on training data through May 2025. Items flagged [VERIFY] should be checked against live sources.

---

## 1. Problem Space

### 1.1 Student Mental Health in Canada

| Metric | Finding | Source |
|---|---|---|
| Overwhelming anxiety (past 12 mo.) | ~37% of Canadian post-secondary students | ACHA-NCHA III, Spring 2022 |
| So depressed difficult to function | ~28% | ACHA-NCHA III, Spring 2022 |
| Seriously considered suicide (past 12 mo.) | ~13% | ACHA-NCHA III, Spring 2022 |
| Self-reported mental health "poor"/"very poor" | ~23%, up from ~11% in 2016 | ACHA-NCHA trend data |
| Accessed campus counselling (of those who screened positive) | Only ~25-30% | CCMHS reports |
| Moderate-to-severe loneliness | ~66% | Canadian Campus Wellbeing Survey |

- Demand for campus services has roughly doubled since 2019; counselling capacity has not kept pace (CASA)
- MHCC National Standard for Post-Secondary Student Mental Health (2020) found most institutions lack systemic, data-informed approaches

### 1.2 Newfoundland & Labrador / Atlantic Canada

- MUN serves ~19,000 students across St. John's, Grenfell (Corner Brook), and Marine Institute
- NL has among the **highest rates of mood and anxiety disorders** in Atlantic Canada (~14-15% of adults vs ~8-9% national average)
- Atlantic campuses face **geographic isolation** — students at Grenfell or rural placements have even fewer off-campus options
- Provincial resources (811 option 2, Bridge the gApp) exist but awareness among students is low
- **Wait times for a psychiatrist** in NL: 6-12 months; community counselling: 3-6 months

### 1.3 Gaps in Current Campus Support

**Wait Times:**
- Canadian campus counselling averages 2-6 weeks for a first appointment
- MUN specifically: 3-5 weeks during peak periods (midterms, winter semester)
- "Worried but not in crisis" cohort — the largest group — falls through the cracks

**Stigma:**
- ~40% of students who recognize they need help do not seek it
- Top barriers: fear of judgment, belief problems "aren't serious enough," not knowing where to go
- Walking into a counselling centre is a visible act, especially at small campuses like Grenfell

**After-Hours:**
- MUN Counselling operates 9-5, Monday-Friday
- Crises disproportionately happen evenings, weekends, exam periods
- No MUN-specific digital tool available at 2 AM

**Other Gaps:**
- No structured self-monitoring for students
- First-year and international students most vulnerable but least connected
- No structured support between counselling sessions

---

## 2. Competitive Landscape

### Woebot
- AI chatbot grounded in CBT, DBT, IPT. Clinically validated (multiple RCTs)
- **Pivoted to prescription digital therapeutic (Woebot Rx)** — free app deprecated late 2023
- Not customizable to a specific campus; defaults to US crisis resources
- Institutional licensing opaque and likely expensive; not marketed to Canadian universities

### Wysa
- AI chatbot + optional human coaching ($99+ USD/mo for coaching tier)
- Warm empathetic tone, multi-technique approach, strong evidence base
- Generic, not campus-specific; data stored outside Canada (privacy concern)
- **Institutional licensing: $3-8 USD/user/month** — expensive at scale

### MindShift CBT (Anxiety Canada)
- **Free, Canadian-made.** CBT tools for anxiety: thought journals, coping cards, relaxation
- Tool-based, not conversational — requires self-direction
- No mood tracking over time, no campus integration, no crisis routing

### Togetherall (formerly Big White Wall)
- Online peer support community + self-guided courses, moderated 24/7 by clinicians
- **Already licensed by many Canadian universities** — MUN may have this [VERIFY]
- Students describe UX as "clunky" or "dated"; not AI-powered; needs critical mass
- **Institutional license: ~$1-3 CAD/student/year**

### Stepped Care 2.0 (SC2.0)
- **Developed at Memorial University** by Dr. Peter Cornish
- Not an app but a service delivery model — matched-care approach routing students to the right level
- **Any tool built for MUN should align with SC2.0**
- Source: https://steppedcaresolutions.com/

### The Gap

> **There is no free, 24/7, conversational mental health check-in tool that is (a) tailored to MUN students, (b) integrated with MUN/NL-specific crisis resources, (c) aligned with Stepped Care 2.0, and (d) owned and operated by MUN with zero ongoing licensing costs.**

---

## 3. MUN-Specific Context

### 3.1 Student Wellness Services

MUN's Student Wellness and Counselling Centre (UC-5000, University Centre, St. John's):
- Mental Health & Counselling
- Health Promotion & Wellness Education
- Crisis Support & Emergency Resources
- Peer Support Programs
- Self-Help & Digital Tools

**Counselling:** 709-864-8874, Mon-Fri 8:30 AM - 4:30 PM. Same-day "Let's Talk" drop-in options during academic year. Grenfell campus: 709-637-6246.

### 3.2 Escalation Paths

**Tier 1 — On-Campus (Business Hours):**
| Resource | Contact | Hours |
|----------|---------|-------|
| Student Wellness Centre | 709-864-8874 | Mon-Fri 8:30 AM - 4:30 PM |
| Campus Enforcement & Patrol | 709-864-8561 | 24/7 |
| Grenfell Student Wellness | 709-637-6246 | Business hours |

**Tier 2 — Crisis Lines (24/7):**
| Resource | Contact | Notes |
|----------|---------|-------|
| 988 Suicide Crisis Helpline | Call or text **988** | National, 24/7 |
| NL Crisis Line | 709-737-4668 | Provincial 24/7 |
| Good2Talk NL | 1-833-292-3698 | Post-secondary student helpline, 24/7 |
| 811 HealthLine | **811** | Mental health triage and referrals |
| Crisis Text Line / Kids Help Phone | Text CONNECT to 686868 | Youth and young adults |
| Trans Lifeline | 1-877-330-6366 | Trans and gender-diverse |

**Tier 3 — Emergency:**
| Resource | Contact |
|----------|---------|
| Emergency Services | **911** |
| Waterford Hospital (Psychiatric Emergency) | 709-777-3591 |
| Health Sciences Centre Emergency | 709-777-6300 |

### 3.3 Existing Digital Tools at MUN

- **Togetherall:** Free for MUN students via @mun.ca email. Anonymous peer support, mood tracking, self-guided courses [VERIFY if still active]
- **Good2Talk NL:** 24/7 professional counselling for post-secondary students
- **Bridge the gApp:** NL provincial mental health self-help platform (https://bridgethegapp.ca/)
- **Peer Support Programs:** Trained peer volunteers, Peer Health Educators, RAs trained in mental health first aid

### 3.4 Student Escalation Journey

```
Student feels distressed
        |
        v
[Self-Help Layer]
  - Togetherall (24/7, anonymous, online)
  - Bridge the gApp (self-guided, NL-specific)
  - MUN website self-help resources
        |
        v (needs more support)
[Peer Support Layer]
  - MUN Peer Support drop-in
  - Peer Health Educators
  - RA in residence
        |
        v (needs professional help)
[Professional Support - Business Hours]
  - Student Wellness Centre: 709-864-8874
  - Book appointment or walk-in/same-day
        |
        v (after hours OR crisis)
[Crisis Layer - 24/7]
  - 988 Suicide Crisis Helpline
  - NL Crisis Line: 709-737-4668
  - Good2Talk NL: 1-833-292-3698
  - 811 HealthLine
        |
        v (immediate danger)
[Emergency]
  - 911
  - Campus Enforcement: 709-864-8561
  - Waterford Hospital / HSC Emergency
```

---

## 4. Privacy & Compliance

### 4.1 Applicable Laws

| Law | Applies When |
|-----|-------------|
| **PHIA** (Personal Health Information Act, NL) | Collection/use of personal health information about an identifiable individual |
| **PIPEDA** (Federal) | Commercial collection of personal information |

### 4.2 Does PHIA/PIPEDA Apply to an Anonymous Tool?

**If truly anonymous (no PII, no login, no identifiers): likely exempt from both.**

PHIA requires information to be about an "identifiable individual." PIPEDA governs "personal information" about an identifiable individual. If there is no identifiable individual, neither law applies.

### 4.3 What "Anonymous" Means Legally

**Cannot store:**
- Names, emails, student numbers
- IP addresses (even hashed, if reversible)
- Device identifiers, persistent cookies/tokens
- Location data precise enough to identify
- Combinations of quasi-identifiers that could re-identify (age + program + gender + campus in small cohorts)
- Browser fingerprints

**Can store:**
- Individual mood entries with no user identifier linking across sessions
- Aggregated/statistical data
- Session-scoped data discarded when browser closes
- Broad demographic categories only if population large enough (k-anonymity >= 10)

**NL's small population and MUN's small program cohorts increase re-identification risk.**

### 4.4 Privacy-by-Design Recommendations

1. **No accounts, no login, no authentication** — no persistent cookies or localStorage pseudo-identifiers
2. **Session-scoped data only** — if offering "view past entries," use client-side-only storage
3. **No IP logging** — configure server and CDN to not log IPs; use privacy-preserving analytics (Plausible)
4. **Aggregation before storage** — never store individual entries with precise timestamps
5. **Minimize quasi-identifiers** — don't collect campus/program/year/age alongside mood data
6. **Transparent privacy notice** — plain-language, displayed before first use
7. **No third-party trackers** — self-host all assets (fonts, scripts)
8. **Data retention policy** — define and publish; implement automatic deletion
9. **HTTPS everywhere, encrypt at rest**
10. **ICEHR review** — if aggregate data used for research, MUN's ethics board may need to review

### 4.5 Key Legal Position

> **The strongest legal position is genuinely not having the data in the first place.** Design for true anonymity, not pseudonymity or de-identification.

If anonymity is ever broken (by design flaw or data combination), all PHIA/PIPEDA obligations retroactively apply.

**Before launch:** Consult MUN's ATIPP (Access to Information and Protection of Privacy) office.

---

## 5. Technical Feasibility

### 5.1 LLM Decision: Free API Tier > Self-Hosted

**Self-hosting is not viable for this project.** No free-tier hosting offers GPU. CPU inference on a free VM produces minutes-per-response latency. Quality of small models (1B-4B) is noticeably inferior for empathetic dialogue.

**Recommended: Free API tiers**

| Provider | Free Tier | Model | Rate Limits (Verified Apr 2026) | Quality |
|----------|-----------|-------|-------------|---------|
| **Google AI Studio** | Free | Gemini 2.5 Pro | 5 RPM, **100 req/day** | Excellent — best for nuanced assessment |
| **Groq** | Free | Llama 3.3 70B | High RPM, **1,000 req/day** | Excellent — great for conversation |
| ~~Cohere~~ | Free trial | Command R+ | 20 RPM, **1,000 req/month** (non-commercial) | Good but unusable — trial keys prohibit production use |

**Dual-model strategy (decided):**
- **Gemini 2.5 Pro** for the initial check-in assessment — where quality and empathetic nuance matter most (100/day is sufficient for this single high-value turn)
- **Groq (Llama 3.3 70B)** for ongoing conversation turns — fast, generous limits, production-allowed

Note: Google cut free tier limits 50-80% in Dec 2025. Groq is 10x more generous on daily requests.

Abstract behind a simple interface so providers can be swapped with one env var change. Both support OpenAI-compatible API formats.

### 5.2 Hosting Decision

| Need | Recommended | Why |
|------|------------|-----|
| Frontend + API | **Vercel (Hobby, free)** | Zero-config Next.js deploy, generous free tier |
| Database | **Supabase (Free)** | Managed Postgres, 500 MB, great JS SDK |
| LLM (check-in assessment) | **Gemini 2.5 Pro (Google AI Studio)** | Highest quality for initial empathetic assessment; 100 req/day free |
| LLM (conversation turns) | **Groq (Llama 3.3 70B)** | Fast, 1,000 req/day free, production-allowed |

### 5.3 Recommended Stack

```
Frontend:     Next.js 14+ (App Router) + Tailwind CSS
Backend:      Next.js API Routes (serverless on Vercel)
Database:     Supabase (Postgres, free tier)
LLM Primary:  Gemini 2.5 Pro via Google AI Studio (initial check-in assessment)
LLM Turns:    Llama 3.3 70B via Groq (ongoing conversation)
Deployment:   Vercel (Hobby plan, free)
Total cost:   $0/month
```

### 5.4 Architecture

```
[Student Browser]
       |
       v
[Vercel — Next.js App]
  |-- /app/page.tsx              Chat UI
  |-- /app/api/chat/route.ts     LLM proxy (dual-model routing)
  |-- /app/api/mood/route.ts     Mood CRUD (calls Supabase)
       |                |
       v                v
[Gemini 2.5 Pro]    [Supabase Postgres]
  Initial check-in    mood_entries
  assessment           sessions
[Groq Llama 3.3 70B]  conversations
  Ongoing turns        resources
```

### 5.5 One-Week Build Plan

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Setup | Next.js + Supabase + Vercel deploy, env vars configured |
| 2 | Chat UI | Responsive chat interface with Tailwind, message bubbles |
| 3 | LLM Integration | API route calling Gemini, system prompt tuned, streaming |
| 4 | Mood Tracking | Mood entry per conversation, stored in Supabase, sessions |
| 5 | Resources + Safety | Crisis keyword detection, resource cards, escalation flow |
| 6 | Polish | Mood history view, mobile responsiveness, loading states |
| 7 | Demo Prep | Testing, README, deployment docs, demo script |

### 5.6 Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Google free tier changes | Groq handles most traffic already; LLM client abstracted; swap in 5 min |
| Supabase DB pauses from inactivity | Vercel cron job pings every 6 days |
| LLM says something harmful | System prompt boundaries + client-side crisis keyword detection + permanent disclaimer |
| Student data privacy | No accounts, no PII; session IDs are random UUIDs; auto-delete after 30 days |
| IT can't maintain it | Push to GitHub = auto-deploy; Supabase has GUI; one API key to rotate |

---

## 6. Differentiation Opportunity

### Why Build Custom vs. License Commercial?

| Factor | Commercial (Wysa, Togetherall) | Custom MUN MIND |
|---|---|---|
| Annual cost | $20K-60K+/year | $0 |
| MUN-specific content | Generic | MUN hours, SC2.0 pathways, NL crisis lines |
| SC2.0 alignment | None | Designed as Level 0.5 intervention |
| Crisis routing | Often US-centric | NL-specific: 811, 988, CHANNAL, Good2Talk |
| Data sovereignty | Often US-stored | Canadian cloud or MUN infrastructure |
| Customizability | Locked vendor product | Fully modifiable each semester |
| Sustainability | Ongoing vendor relationship | Simple handoff to MUN IT |

### Unique Value Proposition

**MUN MIND would be the first mental health check-in tool built *by* MUN students, *for* MUN students, embedded in MUN's own Stepped Care 2.0 framework.**

- **"Level 0.5" in SC2.0**: Structured self-monitoring below formal counselling. Students arrive at their first appointment with mood data and self-identified patterns.
- **NL-aware crisis safety net**: Distinguishes "stressed about exams" from "not safe" and routes to MUN/NL-specific resources
- **Grenfell and Marine Institute aware**: Tailored for isolated campuses
- **No vendor lock-in**: MUN owns the code, prompts, and data

---

## 7. Recommendations for PRD

1. **Position as SC2.0 Level 0.5** — a structured self-monitoring and psychoeducation layer below formal counselling, not a replacement for it
2. **Hardcode crisis detection** — keyword/phrase matching triggers deterministic (not AI-generated) crisis responses with specific NL resources. Never rely on LLM judgment for safety.
3. **True anonymity** — no accounts, no PII, session-scoped only. Strongest legal and trust position.
4. **Separate content from code** — crisis resources, check-in questions, and psychoeducation content in config files (JSON/YAML/MD) so the Wellness office can update without touching code
5. **Use free API tiers** — Gemini Flash via Google AI Studio primary, Groq as fallback. Abstract behind a swappable interface.
6. **Next.js + Supabase + Vercel** — $0/month, single codebase, git-push deploys, maintainable by MUN IT
7. **Scope to MVP** — chat check-in, mood tracking, crisis escalation, resource surfacing. No accounts, no admin dashboard, no analytics beyond aggregate counts.
8. **Consult ATIPP and ICEHR** before launch — even if technically exempt, institutional sign-off builds trust
9. **Design for Grenfell and Marine Institute** — not just St. John's campus
10. **Explicit scope boundaries everywhere** — "I'm not a therapist" in UI, in system prompts, in every conversation

---

## Sources

- ACHA-NCHA Survey Data: https://www.acha.org/NCHA
- MHCC Post-Secondary Standard: https://mentalhealthcommission.ca/studentstandard/
- CASA Mental Health: https://www.casa-acae.com/mental_health
- MUN Student Wellness: https://www.mun.ca/studentwellness/
- Stepped Care 2.0: https://steppedcaresolutions.com/
- Bridge the gApp: https://bridgethegapp.ca/
- Togetherall: https://togetherall.com/en-ca/
- Woebot: https://woebothealth.com/
- Wysa: https://www.wysa.com/
- MindShift CBT: https://www.anxietycanada.com/resources/mindshift-cbt/
- PHIA (NL): https://www.assembly.nl.ca/legislation/sr/statutes/p07-01.htm
- PIPEDA: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/
- Google AI Studio: https://ai.google.dev/pricing
- Groq: https://console.groq.com/docs/rate-limits
- Vercel: https://vercel.com/pricing
- Supabase: https://supabase.com/pricing
