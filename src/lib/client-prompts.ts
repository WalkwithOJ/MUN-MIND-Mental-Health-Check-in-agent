/**
 * Client-safe prompts loader.
 *
 * Imports prompts.json directly so client components can access the
 * deterministic red-tier response without pulling in server-only @/lib/config.
 *
 * This exposes only the prompt content (not API keys or server secrets),
 * which is already public-safe information.
 */

import copyJson from "@/config/copy.json";
import promptsJson from "@/config/prompts.json";

interface PromptsFile {
  red_tier_response: {
    reply: string;
    callToAction: string;
  };
  converse_degraded_response: {
    reply: string;
  };
  assess_degraded_response: {
    reply: string;
    moodScore: number | null;
    tier: "green" | "yellow";
    topicTags: string[];
  };
}

interface CopyFile {
  chat: {
    moodAcknowledgments: Record<"1" | "2" | "3" | "4" | "5", string>;
  };
}

const prompts = promptsJson as unknown as PromptsFile;
const copy = copyJson as unknown as CopyFile;

export const RED_TIER_REPLY = prompts.red_tier_response.reply;
export const RED_TIER_CTA = prompts.red_tier_response.callToAction;
export const CONVERSE_DEGRADED_REPLY = prompts.converse_degraded_response.reply;
export const ASSESS_DEGRADED_REPLY = prompts.assess_degraded_response.reply;

export const MOOD_ACKNOWLEDGMENTS = copy.chat.moodAcknowledgments;
