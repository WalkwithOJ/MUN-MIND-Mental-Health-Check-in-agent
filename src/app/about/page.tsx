import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Mission — MUN MIND",
  description:
    "Why MUN MIND exists, how it works, and the privacy promises that shape it.",
};

/**
 * Static mission page. Plain content — no state, no API calls.
 * Copy here is intentionally grounded and honest about what this tool is and isn't.
 */
export default function AboutPage() {
  return (
    <div className="flex-1 bg-[var(--color-surface-body)]">
      <article className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-[var(--color-primary)] leading-tight tracking-tight mb-6">
            Our mission
          </h1>
          <p className="text-xl md:text-2xl text-[var(--color-secondary)] leading-relaxed">
            Make it easier for Memorial University students to check in with
            themselves — without an appointment, without a login, without
            judgment.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-heading font-bold text-[var(--color-primary)] mb-3">
            Why this exists
          </h2>
          <p className="text-[17px] leading-8 text-[var(--color-text-body)] mb-4">
            University is one of the most common times in life for mental
            health to struggle, and the gap between &ldquo;I&apos;m fine&rdquo;
            and &ldquo;I need to see a counsellor&rdquo; is where most students
            live. MUN MIND is built for that middle ground — a quiet minute to
            notice how you&apos;re actually doing, and a gentle handoff to real
            support when you want it.
          </p>
          <p className="text-[17px] leading-8 text-[var(--color-text-body)]">
            We are not a crisis service, not a therapist, and not a replacement
            for MUN Student Wellness. We&apos;re a first step — and for many
            students, sometimes the only step they need.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-heading font-bold text-[var(--color-primary)] mb-3">
            How privacy works here
          </h2>
          <ul className="space-y-3 text-[17px] leading-7 text-[var(--color-text-body)]">
            <li className="flex gap-3">
              <span className="text-[var(--color-primary)] font-bold shrink-0">
                •
              </span>
              <span>
                <strong>No account.</strong> There&apos;s nothing to sign up
                for and no email to collect.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--color-primary)] font-bold shrink-0">
                •
              </span>
              <span>
                <strong>Your conversation is never stored.</strong> Messages
                live only in your browser tab. Close the tab and they&apos;re
                gone.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--color-primary)] font-bold shrink-0">
                •
              </span>
              <span>
                <strong>No identifiers.</strong> We never ask for your name,
                student number, or email. Even the campus you pick stays on
                your device — it&apos;s never sent to our servers.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--color-primary)] font-bold shrink-0">
                •
              </span>
              <span>
                <strong>Only anonymous mood scores are counted.</strong> A
                number from 1&ndash;5 and a timestamp — nothing that could
                identify you — help MUN understand how students are doing in
                aggregate.
              </span>
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-heading font-bold text-[var(--color-primary)] mb-3">
            Safety, not sparkle
          </h2>
          <p className="text-[17px] leading-8 text-[var(--color-text-body)] mb-4">
            Crisis detection here is not powered by an AI model — it&apos;s a
            plain list of phrases that the code checks before anything else
            happens. If something you say matches, you get real crisis
            resources immediately, not an AI response. This is deliberate. A
            model having a bad day should never be the thing that decides
            whether you see 988.
          </p>
          <p className="text-[17px] leading-8 text-[var(--color-text-body)]">
            When you&apos;re chatting, the conversation is powered by language
            models (Google Gemini and Groq&apos;s Llama). Their only job is
            warm, grounded conversation — all safety routing happens before
            they ever see your message.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-heading font-bold text-[var(--color-primary)] mb-3">
            Built for MUN, by MUN students
          </h2>
          <p className="text-[17px] leading-8 text-[var(--color-text-body)]">
            This is a student-led project connected to real Newfoundland and
            Labrador resources — MUN Student Wellness, Good2Talk NL, the NL
            Provincial Crisis Line, 988, and more. If you know of a resource
            that should be here, reach out.
          </p>
        </section>

        <div className="flex flex-col sm:flex-row gap-4 mt-12">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-[8px] bg-[var(--color-primary)] text-white font-semibold shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-container)] transition-colors"
          >
            Start a check-in
          </Link>
          <Link
            href="/resources"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-[8px] border border-[var(--color-border-strong)] text-[var(--color-primary)] font-semibold hover:bg-[var(--color-surface-card)] transition-colors"
          >
            See all resources
          </Link>
        </div>
      </article>
    </div>
  );
}
