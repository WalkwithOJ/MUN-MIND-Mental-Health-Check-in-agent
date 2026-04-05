/**
 * Tracks whether the student has acknowledged the voice-input privacy notice
 * in the current session. Session-scoped (not persistent) to match the
 * anonymity model — a new tab or session requires re-acknowledgment.
 */

const KEY_VOICE_ACK = "mun-mind:voice-ack";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable (private browsing, quota exceeded) — no-op
  }
}

export function hasAcknowledgedVoice(): boolean {
  return safeGet(KEY_VOICE_ACK) === "1";
}

export function setVoiceAcknowledged(): void {
  safeSet(KEY_VOICE_ACK, "1");
}
