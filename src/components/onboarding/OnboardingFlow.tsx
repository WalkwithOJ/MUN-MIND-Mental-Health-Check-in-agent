"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui";
import copyJson from "@/config/copy.json";
import {
  type CampusId,
  getCampus,
  hasAcknowledgedPrivacy,
  isReturnVisit,
  markVisited,
  setCampus,
  setPrivacyAcknowledged,
} from "@/lib/onboarding-storage";

import { CampusSelector } from "./CampusSelector";
import { PrivacyNoticeModal } from "./PrivacyNoticeModal";

interface TrustSignal {
  icon: string;
  title: string;
  description: string;
}

interface CopyFile {
  landing: {
    heading: string;
    subheading: string;
    trustSignals: TrustSignal[];
    ctaPrimary: string;
    returnVisitHeading: string;
  };
}

const copy = (copyJson as unknown as CopyFile).landing;

type Stage = "landing" | "privacy" | "campus";

/**
 * Read isReturnVisit from sessionStorage via useSyncExternalStore — the
 * idiomatic React 19 pattern for external state. The server snapshot always
 * returns false so the server-rendered HTML matches the first-visit heading;
 * React swaps to the real value on hydration.
 */
const subscribeNoop = () => () => {};
function useIsReturnVisit(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => isReturnVisit(),
    () => false
  );
}

/**
 * Orchestrates the onboarding flow: Landing → Privacy (first visit only) →
 * Campus Selector → Chat.
 *
 * State transitions:
 *   - First visit: student clicks CTA → privacy modal → campus selector → /chat
 *   - Return visit: student clicks CTA → straight to /chat (privacy already
 *     acknowledged, campus already chosen, both from sessionStorage)
 *   - If the student cleared sessionStorage (new tab, private window), they
 *     start over from the landing page
 *
 * All state lives in sessionStorage — no server roundtrip, no persistent
 * identifiers. See src/lib/onboarding-storage.ts.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("landing");
  const isReturning = useIsReturnVisit();
  const campusHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // When the stage transitions to "campus", move focus to the heading so
  // keyboard/screen-reader users know the view has changed.
  useEffect(() => {
    if (stage === "campus") {
      campusHeadingRef.current?.focus();
    }
  }, [stage]);

  function handleStartCheckIn() {
    // If the student has already acknowledged privacy AND picked a campus in
    // this session, skip straight to chat. Otherwise run through the gates.
    if (hasAcknowledgedPrivacy() && getCampus()) {
      router.push("/chat");
      return;
    }
    if (hasAcknowledgedPrivacy()) {
      setStage("campus");
      return;
    }
    setStage("privacy");
  }

  function handlePrivacyAck() {
    setPrivacyAcknowledged();
    setStage("campus");
  }

  function handleCampusSelect(campus: CampusId) {
    setCampus(campus);
    // Mark the tab as fully onboarded AFTER completion, not on page load.
    // This way "Welcome back" only shows for students who completed the flow.
    markVisited();
    router.push("/chat");
  }

  if (stage === "campus") {
    return (
      <section className="flex-1 flex items-center justify-center py-16">
        <CampusSelector
          onSelect={handleCampusSelect}
          headingRef={campusHeadingRef}
        />
      </section>
    );
  }

  return (
    <>
      <LandingHero
        heading={isReturning ? copy.returnVisitHeading : copy.heading}
        subheading={copy.subheading}
        ctaLabel={copy.ctaPrimary}
        onStart={handleStartCheckIn}
        trustSignals={copy.trustSignals}
      />
      <PrivacyNoticeModal
        open={stage === "privacy"}
        onAcknowledge={handlePrivacyAck}
        onCancel={() => setStage("landing")}
      />
    </>
  );
}

function LandingHero({
  heading,
  subheading,
  ctaLabel,
  onStart,
  trustSignals,
}: {
  heading: string;
  subheading: string;
  ctaLabel: string;
  onStart: () => void;
  trustSignals: TrustSignal[];
}) {
  return (
    <section className="flex-1 flex flex-col">
      <div className="max-w-[960px] mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center gap-6">
        <h1 className="text-[40px] leading-[48px] md:text-[56px] md:leading-[64px] font-bold text-[var(--color-primary)] tracking-tight max-w-[720px]">
          {heading}
        </h1>
        <p className="text-[18px] leading-7 md:text-[20px] md:leading-8 text-[var(--color-text-body)] max-w-[560px]">
          {subheading}
        </p>
        <div className="mt-2">
          <Button size="lg" onClick={onStart}>
            {ctaLabel}
          </Button>
        </div>
      </div>

      <div className="max-w-[1120px] w-full mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-3 gap-4">
        {trustSignals.map((signal) => (
          <TrustSignalCard key={signal.title} signal={signal} />
        ))}
      </div>
    </section>
  );
}

function TrustSignalCard({ signal }: { signal: TrustSignal }) {
  return (
    <div className="bg-[var(--color-surface-high)] rounded-[16px] p-6 flex flex-col items-center text-center gap-3">
      <div
        aria-hidden="true"
        className="w-10 h-10 rounded-full bg-[var(--color-surface-card)] flex items-center justify-center text-[var(--color-primary)]"
      >
        <TrustIcon name={signal.icon} />
      </div>
      <h3 className="text-[16px] leading-6 font-semibold text-[var(--color-primary)]">
        {signal.title}
      </h3>
      <p className="text-[14px] leading-5 text-[var(--color-text-body)]">
        {signal.description}
      </p>
    </div>
  );
}

function TrustIcon({ name }: { name: string }) {
  // Minimal inline icons so we don't pull an icon library just for the landing page.
  // Each matches the brand feel — soft strokes, no sparkles.
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (name === "heart") {
    return (
      <svg {...common}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  }
  // Default: university / book icon
  return (
    <svg {...common}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
