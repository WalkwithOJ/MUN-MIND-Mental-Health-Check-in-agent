"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { ResourceCard } from "@/components/chat/ResourceCard";
import type { Resource } from "@/lib/escalation";
import { getCampus, type CampusId } from "@/lib/onboarding-storage";
import campusesJson from "@/config/campuses.json";

interface CampusMeta {
  id: CampusId;
  name: string;
  location: string | null;
}

const campuses = (campusesJson as unknown as { campuses: CampusMeta[] })
  .campuses;

// useSyncExternalStore needs a stable snapshot; sessionStorage doesn't emit
// events we can subscribe to for same-tab writes, so we read on mount only.
const subscribeNoop = () => () => {};
const getCampusClient = (): CampusId | null => getCampus();
const getCampusServer = (): CampusId | null => null;

interface Props {
  resources: Resource[];
}

/**
 * Resource directory. Filters by the student's campus (if they selected one in
 * the onboarding flow — campus lives in sessionStorage only, never on the server).
 * Students who arrive here directly without onboarding see "all of NL".
 */
export function ResourcesDirectory({ resources }: Props) {
  const storedCampus = useSyncExternalStore(
    subscribeNoop,
    getCampusClient,
    getCampusServer
  );
  const [campus, setCampusState] = useState<CampusId | null>(storedCampus);

  const filtered = useMemo(() => {
    if (!campus || campus === "any") {
      return resources.filter((r) => r.campuses.includes("any"));
    }
    return resources.filter(
      (r) => r.campuses.includes(campus) || r.campuses.includes("any")
    );
  }, [campus, resources]);

  const crisisResources = filtered.filter((r) => r.tiers.includes("red"));
  const supportResources = filtered.filter(
    (r) => !r.tiers.includes("red") && r.tiers.includes("yellow")
  );
  const selfHelpResources = filtered.filter(
    (r) =>
      !r.tiers.includes("red") &&
      !r.tiers.includes("yellow") &&
      r.tiers.includes("green")
  );

  return (
    <div className="flex-1 bg-[var(--color-surface-body)]">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-[var(--color-primary)] leading-tight tracking-tight mb-4">
            Support is here.
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-secondary)] leading-relaxed max-w-2xl">
            Crisis lines, MUN campus counselling, peer support, and self-help —
            all in one place. If you&apos;re in immediate danger, call{" "}
            <a
              href="tel:911"
              className="font-semibold underline text-[var(--color-crisis)]"
            >
              911
            </a>
            .
          </p>
        </header>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <label
            htmlFor="campus-filter"
            className="text-sm font-semibold text-[var(--color-text-body)]"
          >
            Campus:
          </label>
          <select
            id="campus-filter"
            value={campus ?? ""}
            onChange={(e) =>
              setCampusState((e.target.value as CampusId) || null)
            }
            className="h-11 px-3 rounded-[8px] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] text-[14px] text-[var(--color-text-body)] focus:border-[var(--color-primary)] outline-none"
          >
            <option value="">All of Newfoundland and Labrador</option>
            {campuses
              .filter((c) => c.id !== "any")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <Section
          title="Crisis — call now"
          subtitle="Available 24/7. Free and confidential."
          resources={crisisResources}
          tone="crisis"
        />
        <Section
          title="Counselling & peer support"
          subtitle="For when things feel heavy but not an emergency."
          resources={supportResources}
        />
        <Section
          title="Self-help tools"
          subtitle="Free apps and platforms you can use on your own time."
          resources={selfHelpResources}
        />
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  subtitle: string;
  resources: Resource[];
  tone?: "crisis" | "default";
}

function Section({ title, subtitle, resources, tone = "default" }: SectionProps) {
  if (resources.length === 0) return null;
  return (
    <section className="mb-10">
      <h2
        className="text-2xl font-heading font-bold mb-1"
        style={{
          color:
            tone === "crisis"
              ? "var(--color-crisis)"
              : "var(--color-primary)",
        }}
      >
        {title}
      </h2>
      <p className="text-sm text-[var(--color-secondary)] mb-4">{subtitle}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
    </section>
  );
}
