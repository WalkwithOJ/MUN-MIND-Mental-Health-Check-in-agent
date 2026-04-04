"use client";

import { notFound, useRouter } from "next/navigation";
import { useEffect } from "react";

import { clearOnboardingState } from "@/lib/onboarding-storage";

/**
 * /reset — dev-only helper that clears the onboarding sessionStorage state
 * and redirects to the landing page so the privacy + campus gates re-appear.
 *
 * Hidden in production (returns 404) so it can't be used to confuse students
 * or bypass state on the live site.
 */
export default function ResetPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const router = useRouter();

  useEffect(() => {
    clearOnboardingState();
    router.replace("/");
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[14px] text-[var(--color-text-muted)]">
        Resetting onboarding…
      </p>
    </div>
  );
}
