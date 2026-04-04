import { cn } from "@/lib/cn";

interface TypingIndicatorProps {
  className?: string;
}

/**
 * Three-dot typing indicator shown while the bot is composing a reply.
 * Uses a subtle pulse animation; respects prefers-reduced-motion via
 * globals.css global override.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-4 rounded-tl-[16px] rounded-tr-[16px] rounded-bl-none rounded-br-[16px]",
        "bg-[var(--color-secondary-container)] shadow-[var(--shadow-sm)]",
        className
      )}
      aria-label="MUN MIND is thinking"
      role="status"
    >
      <Dot delay="0s" />
      <Dot delay="0.15s" />
      <Dot delay="0.3s" />
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full bg-[var(--color-secondary)] opacity-60"
      style={{
        animation: "mun-mind-typing 1.2s ease-in-out infinite",
        animationDelay: delay,
      }}
    />
  );
}
