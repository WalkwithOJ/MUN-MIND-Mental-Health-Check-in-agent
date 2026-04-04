/**
 * Centralized disclaimer strings.
 *
 * Client-safe — reads copy.json directly. These strings appear in multiple places
 * (header, privacy modal, chat footer, error states) and must stay in sync. Putting
 * them in one module means the authoritative source is always copy.json.
 */

import copyJson from "@/config/copy.json";

interface CopyFile {
  chat: { disclaimer: string };
  privacy: { points: string[]; ackCheckbox: string };
  crisis: { bannerHeading: string; bannerBody: string };
}

const copy = copyJson as unknown as CopyFile;

/** "MUN MIND is not counselling or therapy. If you need support, help is available." */
export const NOT_A_THERAPIST = copy.chat.disclaimer;

/** "I understand this is not counselling or therapy." */
export const PRIVACY_ACKNOWLEDGMENT = copy.privacy.ackCheckbox;

/** Plain-language privacy points shown in the first-visit modal. */
export const PRIVACY_POINTS: readonly string[] = copy.privacy.points;

/** Crisis banner text (deterministic — never LLM-generated). */
export const CRISIS_BANNER_HEADING = copy.crisis.bannerHeading;
export const CRISIS_BANNER_BODY = copy.crisis.bannerBody;
