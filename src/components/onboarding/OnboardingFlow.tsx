"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui";
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

// Map the icon keys in copy.json to Material Symbols Outlined icon names.
const ICON_MAP: Record<string, string> = {
  lock: "visibility_off",
  heart: "info",
  university: "school",
};

const subscribeNoop = () => () => {};

function useIsReturnVisit(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => isReturnVisit(),
    () => false
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("landing");
  const isReturning = useIsReturnVisit();
  const campusHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (stage === "campus") {
      campusHeadingRef.current?.focus();
    }
  }, [stage]);

  function handleStartCheckIn() {
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
    <section className="relative flex-1 flex flex-col editorial-gradient overflow-hidden">
      {/* Decorative organic shapes — calm, off-center, pure CSS */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-1/4 w-96 h-96 bg-[var(--color-secondary-container)] organic-shape blur-3xl opacity-20 -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-1/4 w-80 h-80 bg-[var(--color-accent)] organic-shape blur-3xl opacity-20 -z-10"
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-4xl w-full text-center flex flex-col items-center gap-12">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-[44px] leading-[52px] md:text-[72px] md:leading-[80px] font-bold font-heading text-[var(--color-primary)] tracking-tight">
              {heading}
            </h1>
            <p className="text-[18px] leading-7 md:text-[22px] md:leading-9 text-[var(--color-secondary)] max-w-2xl">
              {subheading}
            </p>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="group relative overflow-hidden px-10 py-5 rounded-[8px] bg-[var(--color-primary)] text-white text-[18px] font-bold shadow-[var(--shadow-sm)] transition-all duration-200 ease-out hover:shadow-xl hover:shadow-[var(--color-primary)]/20 active:scale-[0.98]"
          >
            <span className="relative z-10">{ctaLabel}</span>
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8">
            {trustSignals.map((signal) => (
              <TrustSignalCard key={signal.title} signal={signal} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSignalCard({ signal }: { signal: TrustSignal }) {
  return (
    <div className="bg-[var(--color-surface-high)] rounded-[16px] p-8 flex flex-col items-center text-center gap-4 transition-transform duration-300 hover:-translate-y-1">
      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-card)] flex items-center justify-center text-[var(--color-primary)]">
        <Icon name={ICON_MAP[signal.icon] ?? "check_circle"} className="text-[24px]" />
      </div>
      <h3 className="text-[18px] leading-7 font-bold font-heading text-[var(--color-primary)]">
        {signal.title}
      </h3>
      <p className="text-[14px] leading-5 text-[var(--color-secondary)]">
        {signal.description}
      </p>
    </div>
  );
}
