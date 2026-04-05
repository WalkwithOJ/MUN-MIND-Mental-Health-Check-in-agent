/**
 * Public entry point for the LLM layer.
 * Importers outside src/lib/llm/ should only import from here.
 */

export {
  routeAssess,
  routeConverse,
  routeConverseStream,
  capHistory,
  MAX_HISTORY_TURNS,
  MAX_HISTORY_MESSAGES,
} from "./router";
export { GeminiAdapter } from "./gemini";
export { GroqAdapter } from "./groq";
export { LLMError } from "./types";
export type {
  AssessmentResult,
  ConversationResult,
  ConversationStreamEvent,
  LLMProvider,
  Message,
  MoodScore,
  AssessTier,
  LLMErrorType,
} from "./types";
