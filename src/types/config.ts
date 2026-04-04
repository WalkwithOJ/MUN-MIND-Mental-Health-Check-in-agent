/**
 * Config type definitions.
 *
 * These types mirror the Zod schemas in `src/lib/config.ts`. The schemas are the
 * source of truth at runtime; these types are for editor ergonomics.
 */

// --- Core enums ---

export type CrisisTier = "green" | "yellow" | "red";

export type MoodScore = 1 | 2 | 3 | 4 | 5;

export type CampusId = "st_johns" | "grenfell" | "marine" | "any";

// --- Resources ---

export type ResourceCategory =
  | "crisis_line"
  | "crisis_text"
  | "student_helpline"
  | "emergency"
  | "campus_emergency"
  | "hospital"
  | "counselling"
  | "peer_support"
  | "self_help";

export interface Resource {
  id: string;
  name: string;
  description: string;
  phone: string | null;
  text?: string | null;
  url: string | null;
  hours: string;
  campuses: CampusId[];
  tiers: CrisisTier[];
  category: ResourceCategory;
  priority: number;
}

export interface ResourcesConfig {
  resources: Resource[];
}

// --- Keywords ---

export interface KeywordCategory {
  tier: CrisisTier;
  phrases: string[];
  negatable?: boolean;
}

export interface KeywordsConfig {
  locale: string;
  categories: Record<string, KeywordCategory>;
  negation_markers: string[];
  negation_window_tokens: number;
}

// --- Prompts ---

export interface DegradedAssessmentResponse {
  reply: string;
  // null when both LLM providers fail — the client must not persist a fabricated mood score
  // (would skew the aggregate dashboard). See docs/tasks/todo.md Phase 5.
  moodScore: MoodScore | null;
  tier: Exclude<CrisisTier, "red">;
  topicTags: string[];
}

export interface RedTierResponse {
  reply: string;
  callToAction: string;
}

export interface ConverseDegradedResponse {
  reply: string;
}

export interface PromptsConfig {
  assess_system_prompt: string;
  assess_fallback_prompt: string;
  assess_degraded_response: DegradedAssessmentResponse;
  converse_degraded_response: ConverseDegradedResponse;
  converse_system_prompt: string;
  red_tier_response: RedTierResponse;
}

// --- Campuses ---

export interface Campus {
  id: CampusId;
  name: string;
  location: string | null;
  description: string;
}

export interface CampusesConfig {
  campuses: Campus[];
}

// --- Copy ---

export interface TrustSignal {
  icon: string;
  title: string;
  description: string;
}

export interface MoodOption {
  score: MoodScore;
  label: string;
  id: string;
}

export interface CopyConfig {
  app: {
    name: string;
    tagline: string;
    longDescription: string;
  };
  landing: {
    heading: string;
    subheading: string;
    trustSignals: TrustSignal[];
    ctaPrimary: string;
    ctaFooterCrisis: string;
    returnVisitHeading: string;
  };
  privacy: {
    modalHeading: string;
    bodyText: string;
    points: string[];
    ackCheckbox: string;
    ackButton: string;
    cancelButton: string;
  };
  campusSelector: {
    heading: string;
    subheading: string;
    optionDefault: string;
  };
  chat: {
    greeting: string;
    inputPlaceholder: string;
    endSession: string;
    crisisResourcesLink: string;
    typingIndicator: string;
    stillThinking: string;
    disclaimer: string;
    moodWidgetHeading: string;
    moodOptions: MoodOption[];
    quickReplies: string[];
  };
  mood: {
    historyHeading: string;
    historySubheading: string;
    clearButton: string;
    emptyState: string;
  };
  crisis: {
    bannerHeading: string;
    bannerBody: string;
    callCtaPrefix: string;
  };
  errors: {
    apiFailure: string;
    apiFailureRetry: string;
    apiFailureResourcesLead: string;
    offline: string;
    offlineResourcesLead: string;
    rateLimited: string;
    rateLimitedResourcesLead: string;
  };
  session: {
    timeoutHeading: string;
    timeoutBody: string;
    timeoutButton: string;
    summaryHeading: string;
    summaryClosingMessage: string;
    summaryNotSavedNote: string;
    summaryButtonClose: string;
    summaryButtonContinue: string;
  };
}
