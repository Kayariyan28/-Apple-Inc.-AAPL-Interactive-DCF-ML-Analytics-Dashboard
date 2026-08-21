import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-card p-5 text-card-foreground shadow-[var(--shadow-border)] md:p-6",
        className,
      )}
      {...props}
    />
  );
}

export function Kicker({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground", className)}
      {...props}
    />
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "up" | "down" | "muted";
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-sans text-xl font-medium tracking-tight tabular text-foreground md:text-2xl">
        {value}
      </p>
      {hint ? (
        <p
          className={
            tone === "up"
              ? "mt-1 text-xs tabular text-up"
              : tone === "down"
                ? "mt-1 text-xs tabular text-down"
                : "mt-1 text-xs tabular text-muted-foreground"
          }
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
