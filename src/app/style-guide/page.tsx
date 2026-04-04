"use client";

import { notFound } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, ChatBubble, Input, Modal, TextArea } from "@/components/ui";

/**
 * /style-guide — dev reference for the MUN MIND design system.
 *
 * This page exists purely for visual verification against the Figma design
 * (frame 1:2). It lists every component in every state. Not part of the
 * public user experience.
 */
export default function StyleGuidePage() {
  // Dev-only: hide from production users. This page exists purely as a
  // visual reference during development and has no place in a student-facing
  // deployment.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-16">
      <Section title="Brand">
        <h1 className="text-[56px] leading-[70px] font-bold text-[var(--color-primary)] tracking-tight">
          Calm Minds, Bright Futures.
        </h1>
        <p className="text-[20px] leading-[32.5px] text-[var(--color-secondary)] max-w-[672px] mt-4">
          A comprehensive design reference for MUN MIND. Prioritizing tranquility,
          editorial clarity, and tonal depth to create a safe digital space for
          student wellness.
        </p>
      </Section>

      <Section title="Color palette">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <Swatch label="Primary" hex="#13423D" bg="var(--color-primary)" />
          <Swatch
            label="Primary Container"
            hex="#2D5A54"
            bg="var(--color-primary-container)"
          />
          <Swatch label="Secondary" hex="#42655C" bg="var(--color-secondary)" />
          <Swatch
            label="Secondary Container"
            hex="#C4EBDE"
            bg="var(--color-secondary-container)"
            dark
          />
          <Swatch label="Surface" hex="#FAF9F4" bg="var(--color-surface)" dark />
          <Swatch label="Surface High" hex="#E9E8E3" bg="var(--color-surface-high)" dark />
          <Swatch label="Accent" hex="#A1D0C8" bg="var(--color-accent)" dark />
          <Swatch label="Crisis" hex="#BA1A1A" bg="var(--color-crisis)" />
        </div>
      </Section>

      <Section title="Typography">
        <div className="bg-[var(--color-surface-alt)] rounded-[24px] p-12 flex flex-col gap-12">
          <TypeSample
            meta="Display / Manrope Bold / 60px"
            sample="Calm Minds, Bright Futures."
            className="text-[60px] leading-[70px] font-bold text-[var(--color-primary)] tracking-tight"
          />
          <TypeSample
            meta="H1 / Manrope Bold / 36px"
            sample="Your Journey to Wellness"
            className="text-[36px] leading-[40px] font-bold text-[var(--color-primary)] tracking-tight"
          />
          <TypeSample
            meta="H2 / Manrope SemiBold / 24px"
            sample="Visualizing Mood through Organic Interaction"
            className="text-[24px] leading-8 font-semibold text-[var(--color-primary)]"
          />
          <TypeSample
            meta="Body / Plus Jakarta Sans / 18px"
            sample="Instead of binary choices, we use fluid sliders and tonal mapping to let students express complex emotions without the pressure of finding the right word."
            className="text-[18px] leading-[29.25px] text-[var(--color-text-body)]"
          />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-4 items-start">
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost button</Button>
          <Button variant="crisis">Get help now</Button>
          <Button variant="primary" disabled>
            Inactive
          </Button>
          <Button variant="primary" size="lg">
            Start a check-in
          </Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid md:grid-cols-2 gap-6 max-w-[720px]">
          <Input label="Full name" placeholder="Alex Rivera" id="sg-input-name" />
          <Input
            label="Preferred pronoun (optional)"
            placeholder="they/them"
            id="sg-input-pronoun"
          />
          <TextArea
            label="Message"
            placeholder="How are you feeling today?"
            id="sg-textarea"
            className="md:col-span-2"
          />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid md:grid-cols-2 gap-6">
          <Card radius="sm">
            <div className="text-[12px] leading-4 font-semibold text-[var(--color-text-muted)] mb-2">
              8px Radius (Functional Elements)
            </div>
            <h3 className="text-[16px] leading-6 font-semibold text-[var(--color-primary)]">
              Standard Action Card
            </h3>
            <p className="text-[14px] leading-5 text-[var(--color-text-body)] mt-1">
              Used for buttons, inputs, and small navigation items.
            </p>
          </Card>
          <Card radius="md">
            <div className="text-[12px] leading-4 font-semibold text-[var(--color-text-muted)] mb-2">
              16px Radius (Containment Elements)
            </div>
            <h3 className="text-[16px] leading-6 font-semibold text-[var(--color-primary)]">
              Content Container
            </h3>
            <p className="text-[14px] leading-5 text-[var(--color-text-body)] mt-1">
              Used for main page cards, modals, and primary layout sections.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Chat bubbles">
        <div className="max-w-[520px] flex flex-col gap-4 bg-[var(--color-surface-alt)] rounded-[16px] p-6">
          <ChatBubble role="user">
            I&apos;ve been feeling a bit overwhelmed with exams lately. Any tips for focus?
          </ChatBubble>
          <ChatBubble role="bot">
            I hear you. Let&apos;s try a 5-minute breathing exercise together. Would you
            like to start now?
          </ChatBubble>
        </div>
      </Section>

      <Section title="Badges and chips">
        <div className="flex flex-wrap gap-3">
          <Badge variant="accent">Signature component</Badge>
          <Badge variant="neutral">Accessible</Badge>
          <Badge variant="neutral">Low friction</Badge>
          <Badge variant="neutral">Non-judgmental</Badge>
          <Badge variant="muted">Just need to vent</Badge>
        </div>
      </Section>

      <Section title="Modal">
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Open privacy modal preview
        </Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} labelledBy="sg-modal-heading">
          <h2
            id="sg-modal-heading"
            className="text-[24px] leading-8 font-semibold text-[var(--color-primary)] mb-4"
          >
            Before we begin
          </h2>
          <ul className="flex flex-col gap-2 text-[14px] leading-5 text-[var(--color-text-body)] mb-6">
            <li>• No account needed. There&apos;s nothing to sign up for.</li>
            <li>• Your conversation isn&apos;t saved after you close this tab.</li>
            <li>• We never collect your name, email, or student number.</li>
          </ul>
          <div className="flex justify-end">
            <Button onClick={() => setModalOpen(false)}>I understand — let&apos;s go</Button>
          </div>
        </Modal>
      </Section>

      <Section title="Spacing scale (4px base)">
        <div className="bg-[var(--color-primary)] rounded-[16px] p-8 flex items-end gap-4">
          {[4, 8, 12, 16, 24, 32, 48, 64].map((n) => (
            <div key={n} className="flex flex-col items-center gap-2">
              <div
                className="bg-[var(--color-accent-light)] rounded-full"
                style={{ width: n, height: n }}
              />
              <span className="text-[10px] text-white/80 font-mono">{n}px</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-[24px] leading-8 font-semibold text-[var(--color-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({
  label,
  hex,
  bg,
  dark = false,
}: {
  label: string;
  hex: string;
  bg: string;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-32 rounded-[12px] shadow-[var(--shadow-sm)]"
        style={{
          background: bg,
          border: dark ? "1px solid var(--color-border-strong)" : undefined,
        }}
      />
      <div>
        <div className="text-[14px] leading-5 font-semibold text-[var(--color-text-primary)]">
          {label}
        </div>
        <div className="text-[12px] leading-4 text-[var(--color-text-muted)] font-mono">
          {hex}
        </div>
      </div>
    </div>
  );
}

function TypeSample({
  meta,
  sample,
  className,
}: {
  meta: string;
  sample: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-8 last:border-b-0 last:pb-0">
      <span className="text-[12px] leading-4 font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
        {meta}
      </span>
      <p className={className}>{sample}</p>
    </div>
  );
}
