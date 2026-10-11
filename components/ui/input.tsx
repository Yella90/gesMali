import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm",
        "placeholder:text-[var(--color-ink-faint)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)]",
        "disabled:opacity-50 disabled:bg-neutral-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";