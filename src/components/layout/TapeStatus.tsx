import { cn } from "@/lib/utils";
import type { MarketSession } from "@/lib/market/types";

const LABEL: Record<MarketSession, string> = {
  open: "Live",
  pre: "Pre-market",
  post: "After hours",
  closed: "Last print",
};

export function TapeStatus({
  session,
  stale,
  className,
}: {
  session: MarketSession;
  stale?: boolean;
  className?: string;
}) {
  const live = !stale && session !== "closed";
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs uppercase tracking-widest", className)}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          stale ? "bg-muted-foreground" : live ? "live-dot bg-up" : "bg-warn",
        )}
      />
      <span className="text-muted-foreground">{stale ? "Snapshot" : LABEL[session]}</span>
    </span>
  );
}
