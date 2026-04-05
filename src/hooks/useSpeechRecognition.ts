"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Thin wrapper around the Web Speech API (SpeechRecognition).
 *
 * Browser support as of 2026:
 *   - Chrome (desktop + Android): supported, sends audio to Google Speech
 *   - Safari (iOS 14.5+, macOS): supported, sends audio to Apple
 *   - Edge: supported via WebSpeech API
 *   - Firefox: NOT supported — `supported` returns false
 *
 * Privacy: audio is processed by the browser vendor's cloud service. Students
 * must be warned before first use. See src/lib/voice-storage.ts and the
 * first-use disclosure in VoiceButton.tsx.
 */

type RecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

// Minimal type shim — the Web Speech API isn't in lib.dom.d.ts by default
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionAlt {
  transcript: string;
}
interface SpeechRecognitionR {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlt;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionR;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionInstance)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface UseSpeechRecognitionOptions {
  onFinalResult?: (transcript: string) => void;
}

export interface UseSpeechRecognitionResult {
  /** True only in browsers that expose the Web Speech API. */
  supported: boolean;
  /** True between start() and onend. */
  listening: boolean;
  /** Current interim or final transcript for the active session. */
  transcript: string;
  /** User-visible error string (permission denied, no speech, etc.). */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

// No-op subscribe — feature support never changes after mount, so we only
// need useSyncExternalStore to give us a hydration-safe "client value" read
// without calling setState inside an effect.
const subscribeNever = () => () => {};
const getSupportedClient = () => (getSpeechRecognitionCtor() !== null);
const getSupportedServer = () => false;

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionResult {
  const supported = useSyncExternalStore(
    subscribeNever,
    getSupportedClient,
    getSupportedServer
  );
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalResultCallbackRef = useRef(options.onFinalResult);

  // Keep the callback ref fresh without causing start/stop to churn
  useEffect(() => {
    finalResultCallbackRef.current = options.onFinalResult;
  }, [options.onFinalResult]);

  // Cleanup: abort any in-flight recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    // If one is already running, do nothing
    if (recognitionRef.current) return;

    setError(null);
    setTranscript("");

    const rec = new Ctor();
    rec.lang =
      typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const results: RecognitionResult[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        results.push({
          transcript: r[0]?.transcript ?? "",
          isFinal: r.isFinal,
        });
      }
      const combined = results.map((r) => r.transcript).join("");
      setTranscript(combined);
      const lastFinal = results.filter((r) => r.isFinal).pop();
      if (lastFinal && finalResultCallbackRef.current) {
        finalResultCallbackRef.current(combined);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = mapErrorToMessage(event.error);
      setError(msg);
      setListening(false);
      recognitionRef.current = null;
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {
      // Some browsers throw if start() is called twice in quick succession
      setError("Could not start voice input. Try again.");
      recognitionRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}

function mapErrorToMessage(errorCode: string): string {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. You can enable it in your browser settings.";
    case "no-speech":
      return "I didn't catch anything. Try again?";
    case "audio-capture":
      return "No microphone found on this device.";
    case "network":
      return "Voice input needs an internet connection.";
    case "aborted":
      return "";
    default:
      return "Voice input had a problem. You can type your message instead.";
  }
}
