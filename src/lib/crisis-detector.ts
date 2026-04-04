/**
 * Deterministic crisis keyword detector.
 *
 * SAFETY INVARIANTS (do not relax without review):
 *   1. This module is CLIENT-SAFE. It runs in the browser (per Phase 9 plan) so
 *      a slow or failed server never delays the crisis banner. It does NOT import
 *      from `@/lib/config` (which is server-only).
 *   2. Red-tier detection is NEVER suppressed by negation. Any hard crisis phrase
 *      match = Red, period. False positives are acceptable; false negatives are not.
 *   3. Short tokens (≤3 characters) are ONLY matched at word boundaries to avoid
 *      substring false positives ("5kms of running" must not trigger "kms").
 *   4. This function must be pure, synchronous, and fast — it runs on every message
 *      before any async work.
 *   5. The keyword list lives in `src/config/keywords.json` and can be edited by
 *      non-developers. This detector must gracefully handle new phrases being added.
 *
 * See docs/PRD.md §7 and docs/research-brief.md.
 */

import keywordsJson from "@/config/keywords.json";

export type CrisisTier = "green" | "yellow" | "red";

interface KeywordCategory {
  tier: CrisisTier;
  phrases: string[];
  negatable?: boolean;
}

interface KeywordsFile {
  locale: string;
  categories: Record<string, KeywordCategory>;
  negation_markers: string[];
  negation_window_tokens: number;
}

// We deliberately cast here — the types mirror the JSON schema but the JSON import
// produces a wide type. The Zod validation in `@/lib/config` covers server-side
// integrity; the shape of keywords.json is stable and tested against the type above.
const keywords = keywordsJson as unknown as KeywordsFile;

// Precompiled data structures. Computed once at module load.
interface CompiledPhrase {
  phrase: string;
  tier: CrisisTier;
  negatable: boolean;
  /** Short tokens (≤3 chars) require word-boundary matching. */
  wordBoundary: boolean;
  /** Regex for word-boundary match. Only populated when wordBoundary is true. */
  regex?: RegExp;
}

const WORD_BOUNDARY_MAX_LEN = 3;

function compilePhrases(): CompiledPhrase[] {
  const compiled: CompiledPhrase[] = [];
  for (const category of Object.values(keywords.categories)) {
    for (const rawPhrase of category.phrases) {
      const phrase = normalizeText(rawPhrase);
      const wordBoundary = phrase.length <= WORD_BOUNDARY_MAX_LEN;
      compiled.push({
        phrase,
        tier: category.tier,
        negatable: category.negatable ?? false,
        wordBoundary,
        regex: wordBoundary
          ? new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i")
          : undefined,
      });
    }
  }
  // Sort: longer phrases first so "don't want to wake up" wins before "want to" could match
  compiled.sort((a, b) => b.phrase.length - a.phrase.length);
  return compiled;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const COMPILED_PHRASES = compilePhrases();
// Split negation markers into single-word (token match) and multi-word (substring match)
// so "no longer" and "used to" are matched correctly.
const NEGATION_MARKERS_LC = keywords.negation_markers.map((m) =>
  m.toLowerCase()
);
const NEGATION_SINGLE = new Set(
  NEGATION_MARKERS_LC.filter((m) => !m.includes(" "))
);
const NEGATION_MULTI = NEGATION_MARKERS_LC.filter((m) => m.includes(" "));
const NEGATION_WINDOW = keywords.negation_window_tokens;

/**
 * Normalize text for matching:
 *  - lowercase
 *  - fold Unicode smart quotes/dashes to ASCII equivalents (iOS autocorrect inserts
 *    U+2019 right single quotation mark — without folding, "don't" would not match
 *    the authored keyword "don't" since stripping punctuation would remove U+2019)
 *  - collapse whitespace
 *  - strip surrounding/duplicate punctuation
 * We do NOT strip ASCII apostrophes (needed to match "don't"/"dont" variants).
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // smart single quotes / reversed apostrophes → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // smart double quotes → "
    .replace(/[\u2013\u2014\u2212]/g, "-") // en dash, em dash, minus → -
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Match {
  phrase: string;
  tier: CrisisTier;
  negatable: boolean;
  index: number;
}

function findMatches(normalized: string): Match[] {
  const matches: Match[] = [];
  for (const c of COMPILED_PHRASES) {
    if (c.wordBoundary && c.regex) {
      const m = normalized.match(c.regex);
      if (m && m.index !== undefined) {
        matches.push({
          phrase: c.phrase,
          tier: c.tier,
          negatable: c.negatable,
          index: m.index,
        });
      }
    } else {
      const idx = normalized.indexOf(c.phrase);
      if (idx !== -1) {
        matches.push({
          phrase: c.phrase,
          tier: c.tier,
          negatable: c.negatable,
          index: idx,
        });
      }
    }
  }
  return matches;
}

/**
 * Check whether a Yellow-tier match is clearly negated.
 *
 * We only check negation for negatable (Yellow) matches. Red matches are NEVER
 * checked — a hard crisis phrase is Red regardless of surrounding words.
 *
 * A match is negated when either:
 *   (a) a single-word negation marker appears as a token in the last
 *       NEGATION_WINDOW tokens before the match, OR
 *   (b) a multi-word negation marker (e.g., "no longer", "used to") appears
 *       as a substring anywhere in the last NEGATION_WINDOW tokens joined.
 */
function isNegated(normalized: string, matchIndex: number): boolean {
  const prefix = normalized.slice(0, matchIndex).trim();
  if (!prefix) return false;
  const tokens = prefix.split(/\s+/);
  const window = tokens.slice(-NEGATION_WINDOW);
  // (a) single-word markers
  if (window.some((t) => NEGATION_SINGLE.has(t))) return true;
  // (b) multi-word markers (e.g., "no longer", "used to")
  const joined = window.join(" ");
  if (NEGATION_MULTI.some((m) => joined.includes(m))) return true;
  return false;
}

/**
 * Detect crisis tier for a user message.
 *
 * Rules:
 *   - If any Red-tier phrase matches → return 'red' immediately. Negation is ignored.
 *   - Else if any Yellow-tier phrase matches and is NOT negated → return 'yellow'.
 *   - Else if any Yellow-tier phrase matches but IS negated → return 'green'.
 *   - Else → return 'green'.
 *
 * Guarantees:
 *   - Pure function. No side effects.
 *   - Synchronous. Safe to call in event handlers before any async work.
 *   - Empty/whitespace input returns 'green' (nothing to react to).
 */
export function detectCrisis(text: string): CrisisTier {
  if (!text || typeof text !== "string") return "green";
  const normalized = normalizeText(text);
  if (!normalized) return "green";

  const matches = findMatches(normalized);
  if (matches.length === 0) return "green";

  // Red always wins, regardless of negation
  if (matches.some((m) => m.tier === "red")) return "red";

  // Yellow: at least one non-negated yellow match → yellow; otherwise → green
  const anyNonNegatedYellow = matches.some(
    (m) => m.tier === "yellow" && !(m.negatable && isNegated(normalized, m.index))
  );
  return anyNonNegatedYellow ? "yellow" : "green";
}

/**
 * Debug-only helper for tests. Returns the raw match data for a given input.
 * Not exported for production code paths — only used by the test suite.
 * @internal
 */
export function _detectCrisisInternal(text: string) {
  if (!text || typeof text !== "string") {
    return { tier: "green" as CrisisTier, matches: [] as Match[] };
  }
  const normalized = normalizeText(text);
  if (!normalized) return { tier: "green" as CrisisTier, matches: [] as Match[] };
  const matches = findMatches(normalized);
  const tier = detectCrisis(text);
  return { tier, matches, normalized };
}
