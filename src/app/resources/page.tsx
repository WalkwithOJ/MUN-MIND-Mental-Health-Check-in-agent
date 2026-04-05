import type { Metadata } from "next";

import { ResourcesDirectory } from "@/components/resources/ResourcesDirectory";
import { getAllResources } from "@/lib/escalation";

export const metadata: Metadata = {
  title: "Resources — MUN MIND",
  description:
    "Crisis lines, MUN campus counselling, peer support, and self-help tools. Available 24/7.",
};

/**
 * Static resource directory. Server-renders the full list from resources.json,
 * then the client component filters by the student's campus (stored in
 * sessionStorage, never sent to the server — see INV-2 in the privacy arch).
 */
export default function ResourcesPage() {
  const allResources = getAllResources();
  return <ResourcesDirectory resources={allResources} />;
}
