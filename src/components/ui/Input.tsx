import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * Input — single-line text field. Matches Figma "Input Architecture" card.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label ? (
        <label
          htmlFor={id}
          className="text-[12px] leading-4 font-semibold text-[var(--color-text-muted)] ml-1"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        className={cn(
          "bg-[var(--color-surface-alt)] rounded-[8px] px-4 py-[14px]",
          "text-[16px] leading-6 text-[var(--color-text-body)]",
          "placeholder:text-[var(--color-text-placeholder)]",
          "min-h-[48px] w-full",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className
        )}
        {...rest}
      />
    </div>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

/**
 * TextArea — multi-line text field used for the chat input and longer reflection.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ label, id, className, ...rest }, ref) {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label ? (
          <label
            htmlFor={id}
            className="text-[12px] leading-4 font-semibold text-[var(--color-text-muted)] ml-1"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={id}
          rows={3}
          className={cn(
            "bg-[var(--color-surface-alt)] rounded-[8px] px-4 py-3",
            "text-[16px] leading-6 text-[var(--color-text-body)]",
            "placeholder:text-[var(--color-text-placeholder)]",
            "min-h-[80px] w-full resize-none",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            className
          )}
          {...rest}
        />
      </div>
    );
  }
);
