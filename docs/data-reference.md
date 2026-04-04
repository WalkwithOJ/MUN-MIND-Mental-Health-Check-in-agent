# Data Reference — MUN MIND

> Explains domain data relationships and semantics not captured in models or schemas alone.

## Status: To Be Defined During Design Phase

---

## Domain Concepts

<!-- Example:
### Concept Name
**What it represents:**
**Relationships:** how it connects to other concepts
**Business rules:** constraints that aren't in the schema
**Nuances:** things a developer needs to know that aren't obvious
-->

### Check-In
**What it represents:** A single mood/wellness data point from a student session
**Relationships:** _TBD_
**Business rules:** _TBD_
**Nuances:** Must be anonymous — no link back to student identity

### Escalation
**What it represents:** A trigger point where the system surfaces counseling resources
**Relationships:** _TBD_
**Business rules:** _TBD_
**Nuances:** Not a referral — the student decides whether to act on it

### Mood Data
**What it represents:** The tracked emotional/wellness state over time
**Relationships:** _TBD_
**Business rules:** _TBD_
**Nuances:** Owned by the anonymous session, not by a user account

---

## Key Relationships

_To be mapped once data models are designed._

## Privacy Constraints

- No personally identifiable information (PII) stored
- Session-based identity only
- Data retention policy: _TBD_
- Who can access aggregate data: _TBD_
