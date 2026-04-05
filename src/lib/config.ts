/**
 * Typed config loaders with runtime Zod validation.
 *
 * Every config file is validated at import time. If a config file is malformed
 * (e.g., a MUN staff member edits resources.json and breaks a phone number entry),
 * the app fails to start with a clear error message rather than failing silently
 * at runtime in front of a student in distress.
 *
 * This module is server-only. Client-side code that needs crisis keywords (e.g.,
 * the client-side crisis detector in Phase 9) must import the keyword JSON directly
 * or use a dedicated client-safe loader — never this file.
 */

import "server-only";

import { z } from "zod";

import campusesJson from "@/config/campuses.json";
import copyJson from "@/config/copy.json";
import keywordsJson from "@/config/keywords.json";
import promptsJson from "@/config/prompts.json";
import resourcesJson from "@/config/resources.json";

// --- Shared enums ---

const crisisTierSchema = z.enum(["green", "yellow", "red"]);
// z.union of literals gives correct runtime validation AND the precise TypeScript type
// without an unsafe cast. Issue from Phase 2 review.
const moodScoreSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
const campusIdSchema = z.enum(["st_johns", "grenfell", "marine", "any"]);

// --- Resources schema ---

const resourceCategorySchema = z.enum([
  "crisis_line",
  "crisis_text",
  "student_helpline",
  "emergency",
  "campus_emergency",
  "hospital",
  "counselling",
  "peer_support",
  "self_help",
]);

const resourceSchema = z.object({
  id: z
    .string()
    .regex(
      /^[a-z0-9_]+$/,
      "Resource id must be snake_case lowercase (opaque id — no spaces, no caps). Why: the id is stored in Supabase resource_clicks and must be non-identifying on its own."
    ),
  name: z.string().min(1),
  description: z.string().min(1),
  phone: z.string().nullable(),
  text: z.string().nullable().optional(),
  url: z.string().url().nullable(),
  hours: z.string().min(1),
  campuses: z.array(campusIdSchema).min(1),
  tiers: z.array(crisisTierSchema).min(1),
  category: resourceCategorySchema,
  priority: z.number().int().min(0),
});

const resourcesConfigSchema = z.object({
  resources: z.array(resourceSchema).min(1),
});

// --- Keywords schema ---

const keywordCategorySchema = z.object({
  tier: crisisTierSchema,
  phrases: z.array(z.string().min(1)).min(1),
  negatable: z.boolean().optional(),
});

const keywordsConfigSchema = z.object({
  locale: z.string().min(2),
  categories: z.record(z.string(), keywordCategorySchema),
  negation_markers: z.array(z.string().min(1)).min(1),
  negation_window_tokens: z.number().int().positive(),
});

// --- Prompts schema ---

const degradedAssessmentResponseSchema = z.object({
  reply: z.string().min(1),
  // Nullable — when both LLMs fail, we don't fabricate a mood score (would corrupt analytics)
  moodScore: moodScoreSchema.nullable(),
  tier: z.enum(["green", "yellow"]),
  topicTags: z.array(z.string()),
});

const redTierResponseSchema = z.object({
  reply: z.string().min(1),
  callToAction: z.string().min(1),
});

const converseDegradedResponseSchema = z.object({
  reply: z.string().min(1),
});

const promptsConfigSchema = z.object({
  assess_system_prompt: z.string().min(1),
  assess_fallback_prompt: z.string().min(1),
  assess_degraded_response: degradedAssessmentResponseSchema,
  converse_degraded_response: converseDegradedResponseSchema,
  converse_system_prompt: z.string().min(1),
  red_tier_response: redTierResponseSchema,
});

// --- Campuses schema ---

const campusSchema = z.object({
  id: campusIdSchema,
  name: z.string().min(1),
  location: z.string().nullable(),
  description: z.string().min(1),
});

const campusesConfigSchema = z.object({
  campuses: z.array(campusSchema).min(1),
});

// --- Copy schema ---

const trustSignalSchema = z.object({
  icon: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

const moodOptionSchema = z.object({
  score: moodScoreSchema,
  label: z.string().min(1),
  id: z.string().min(1),
});

const copyConfigSchema = z.object({
  app: z.object({
    name: z.string().min(1),
    tagline: z.string().min(1),
    longDescription: z.string().min(1),
  }),
  landing: z.object({
    heading: z.string().min(1),
    subheading: z.string().min(1),
    trustSignals: z.array(trustSignalSchema).min(1),
    ctaPrimary: z.string().min(1),
    ctaFooterCrisis: z.string().min(1),
    returnVisitHeading: z.string().min(1),
  }),
  privacy: z.object({
    modalHeading: z.string().min(1),
    bodyText: z.string().min(1),
    points: z.array(z.string().min(1)).min(1),
    ackCheckbox: z.string().min(1),
    ackButton: z.string().min(1),
    cancelButton: z.string().min(1),
  }),
  campusSelector: z.object({
    heading: z.string().min(1),
    subheading: z.string().min(1),
    optionDefault: z.string().min(1),
  }),
  chat: z.object({
    greeting: z.string().min(1),
    inputPlaceholder: z.string().min(1),
    voice: z.object({
      startLabel: z.string().min(1),
      stopLabel: z.string().min(1),
      disclosureHeading: z.string().min(1),
      disclosureBody: z.string().min(1),
      disclosureAgree: z.string().min(1),
      disclosureDecline: z.string().min(1),
    }),
    endSession: z.string().min(1),
    crisisResourcesLink: z.string().min(1),
    typingIndicator: z.string(),
    stillThinking: z.string().min(1),
    disclaimer: z.string().min(1),
    moodWidgetHeading: z.string().min(1),
    moodOptions: z.array(moodOptionSchema).length(5),
    moodAcknowledgments: z.object({
      "1": z.string().min(1),
      "2": z.string().min(1),
      "3": z.string().min(1),
      "4": z.string().min(1),
      "5": z.string().min(1),
    }),
    quickReplies: z.array(z.string().min(1)).min(1),
  }),
  mood: z.object({
    historyHeading: z.string().min(1),
    historySubheading: z.string().min(1),
    clearButton: z.string().min(1),
    emptyState: z.string().min(1),
  }),
  crisis: z.object({
    bannerHeading: z.string().min(1),
    bannerBody: z.string().min(1),
    callCtaPrefix: z.string().min(1),
  }),
  errors: z.object({
    apiFailure: z.string().min(1),
    apiFailureRetry: z.string().min(1),
    apiFailureResourcesLead: z.string().min(1),
    offline: z.string().min(1),
    offlineResourcesLead: z.string().min(1),
    rateLimited: z.string().min(1),
    rateLimitedResourcesLead: z.string().min(1),
  }),
  session: z.object({
    timeoutHeading: z.string().min(1),
    timeoutBody: z.string().min(1),
    timeoutButton: z.string().min(1),
    summaryHeading: z.string().min(1),
    summaryClosingMessage: z.string().min(1),
    summaryNotSavedNote: z.string().min(1),
    summaryButtonClose: z.string().min(1),
    summaryButtonContinue: z.string().min(1),
  }),
});

// --- Validation helper ---

function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
  filename: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    // z.treeifyError gives a readable tree of validation errors.
    // We include the filename so a MUN staff member editing a config can find the problem.
    throw new Error(
      `Invalid config: ${filename}\n${JSON.stringify(
        z.treeifyError(result.error),
        null,
        2
      )}`
    );
  }
  return result.data;
}

// --- Public exports — validated at module load time ---

export const resourcesConfig = validate(
  resourcesConfigSchema,
  resourcesJson,
  "src/config/resources.json"
);

export const keywordsConfig = validate(
  keywordsConfigSchema,
  keywordsJson,
  "src/config/keywords.json"
);

export const promptsConfig = validate(
  promptsConfigSchema,
  promptsJson,
  "src/config/prompts.json"
);

export const campusesConfig = validate(
  campusesConfigSchema,
  campusesJson,
  "src/config/campuses.json"
);

export const copyConfig = validate(
  copyConfigSchema,
  copyJson,
  "src/config/copy.json"
);

// --- Cross-file integrity checks ---
// These run at module load time and throw if the configs are inconsistent with each other.
// A startup failure with a clear error is always better than a silent runtime failure
// when a student is in distress.

{
  // Every resource's campus must exist in campuses.json
  const validCampusIds = new Set(campusesConfig.campuses.map((c) => c.id));
  for (const resource of resourcesConfig.resources) {
    for (const campus of resource.campuses) {
      if (!validCampusIds.has(campus)) {
        throw new Error(
          `Config integrity: resource "${resource.id}" references unknown campus "${campus}" (not in campuses.json)`
        );
      }
    }
  }

  // Every resource id must be unique
  const ids = new Set<string>();
  for (const resource of resourcesConfig.resources) {
    if (ids.has(resource.id)) {
      throw new Error(
        `Config integrity: duplicate resource id "${resource.id}" in resources.json`
      );
    }
    ids.add(resource.id);
  }

  // Every resource must have at least one contact method (phone, url, or text)
  for (const resource of resourcesConfig.resources) {
    const hasContact =
      resource.phone !== null ||
      resource.url !== null ||
      (resource.text !== null && resource.text !== undefined);
    if (!hasContact) {
      throw new Error(
        `Config integrity: resource "${resource.id}" has no contact method (phone, url, and text are all null/absent)`
      );
    }
  }

  // At least one red-tier resource must exist — crisis flow has no fallback otherwise
  const hasRedResources = resourcesConfig.resources.some((r) =>
    r.tiers.includes("red")
  );
  if (!hasRedResources) {
    throw new Error(
      "Config integrity: resources.json must contain at least one resource with tier 'red'"
    );
  }

  // Hard safety requirement: 988 must be present (PRD §7)
  const has988 = resourcesConfig.resources.some((r) => r.id === "helpline_988");
  if (!has988) {
    throw new Error(
      'Config integrity: resources.json must contain a resource with id "helpline_988" (988 Suicide Crisis Helpline — PRD §7)'
    );
  }

  // Hard safety requirement: NL Crisis Line must be present (PRD §7)
  const hasNLCrisis = resourcesConfig.resources.some(
    (r) => r.id === "nl_crisis_line" || r.phone === "709-737-4668"
  );
  if (!hasNLCrisis) {
    throw new Error(
      'Config integrity: resources.json must contain the NL Provincial Crisis Line (id "nl_crisis_line" or phone 709-737-4668) — PRD §7'
    );
  }

  // Hard safety requirement: 911 must be present
  const has911 = resourcesConfig.resources.some((r) => r.id === "emergency_911");
  if (!has911) {
    throw new Error(
      'Config integrity: resources.json must contain "emergency_911" (911 Emergency Services)'
    );
  }

  // SAFETY INVARIANT: Red-tier keyword categories must NEVER be negatable.
  // Documented in PRD §7 and keywords.json _safety_note. Enforced here at load time.
  for (const [name, category] of Object.entries(keywordsConfig.categories)) {
    if (category.tier === "red" && category.negatable === true) {
      throw new Error(
        `Config integrity: keyword category "${name}" is tier "red" but has negatable: true. ` +
          `Red-tier phrases must never be negatable (PRD §7 safety requirement).`
      );
    }
  }

  // Mood option scores must be unique and cover 1–5
  const moodScores = copyConfig.chat.moodOptions.map((o) => o.score);
  const uniqueMoodScores = new Set(moodScores);
  if (uniqueMoodScores.size !== moodScores.length) {
    throw new Error(
      "Config integrity: copy.json chat.moodOptions must have unique scores"
    );
  }
  for (let s = 1 as 1 | 2 | 3 | 4 | 5; s <= 5; s++) {
    if (!uniqueMoodScores.has(s as 1 | 2 | 3 | 4 | 5)) {
      throw new Error(
        `Config integrity: copy.json chat.moodOptions is missing score ${s}`
      );
    }
  }
}
