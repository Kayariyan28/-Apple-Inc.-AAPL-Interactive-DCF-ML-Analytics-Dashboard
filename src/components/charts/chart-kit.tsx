import { type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { clamp, indexFromClientX, xAt } from "@/lib/charts/math";

export type ChartPad = { l: number; r: number; t: number; b: number };

function useViewBox(fallbackW = 720, fallbackH = 240) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: fallbackW, h: fallbackH });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (width: number, height: number) => {
      const w = width > 0 ? Math.round(width) : fallbackW;
      const h = height > 0 ? Math.round(height) : fallbackH;
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    apply(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      apply(cr.width, cr.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallbackW, fallbackH]);

  return { ref, w: box.w, h: box.h };
}

export function ChartFrame({
  className,
  heightClass = "h-52 md:h-64",
  children,
}: {
  className?: string;
  heightClass?: string;
  children: (box: { w: number; h: number }) => ReactNode;
}) {
  const { ref, w, h } = useViewBox();
  return (
    <div
      ref={ref}
      className={cn("relative isolate z-0 w-full min-w-0 overflow-hidden", heightClass, className)}
      style={{ position: "relative" }}
    >
      {children({ w, h })}
    </div>
  );
}

export function ChartSvg({
  viewW,
  viewH,
  n,
  pad,
  label,
  className,
  index,
  brushable = false,
  brush,
  onIndex,
  onCommit,
  onBrush,
  onDoubleReset,
  children,
}: {
  viewW: number;
  viewH: number;
  n: number;
  pad: ChartPad;
  label: string;
  className?: string;
  index: number | null;
  brushable?: boolean;
  brush?: { a: number; b: number } | null;
  onIndex: (i: number | null) => void;
  onCommit?: (i: number) => void;
  onBrush?: (a: number, b: number) => void;
  onDoubleReset?: () => void;
  children: ReactNode;
}) {
  const drag = useRef<{ a: number; moved: boolean; pointer: number } | null>(null);
  const indexRef = useRef(index);
  indexRef.current = index;
  const [liveBrush, setLiveBrush] = useState<{ a: number; b: number } | null>(null);

  const read = useCallback(
    (el: Element, clientX: number) =>
      indexFromClientX(clientX, el.getBoundingClientRect(), Math.max(1, n), pad.l, pad.r, viewW),
    [n, pad.l, pad.r, viewW],
  );

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const i = read(e.currentTarget, e.clientX);
    drag.current = { a: i, moved: false, pointer: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    onIndex(i);
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const i = read(e.currentTarget, e.clientX);
    onIndex(i);
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    if (Math.abs(i - d.a) >= 1) d.moved = true;
    if (brushable && d.moved) setLiveBrush({ a: d.a, b: i });
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    const i = read(e.currentTarget, e.clientX);
    if (d && d.pointer === e.pointerId) {
      if (d.moved && brushable && onBrush && Math.abs(i - d.a) >= 3) onBrush(d.a, i);
      else onCommit?.(i);
    }
    drag.current = null;
    setLiveBrush(null);
    onIndex(i);
  }

  function onPointerLeave(e: PointerEvent<SVGSVGElement>) {
    if (drag.current) return;
    if (e.pointerType === "mouse") onIndex(null);
  }

  const last = Math.max(0, n - 1);
  const shown = brush ?? liveBrush;
  const brushLo = shown ? Math.min(shown.a, shown.b) : 0;
  const brushHi = shown ? Math.max(shown.a, shown.b) : 0;
  const bx1 = shown ? xAt(brushLo, n, pad.l, pad.r, viewW) : 0;
  const bx2 = shown ? xAt(brushHi, n, pad.l, pad.r, viewW) : 0;

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      className={cn("chart-svg h-full w-full select-none outline-none", className)}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
        setLiveBrush(null);
      }}
      onPointerLeave={onPointerLeave}
      onDoubleClick={() => onDoubleReset?.()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onIndex(null);
          return;
        }
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End" && e.key !== "Enter") return;
        e.preventDefault();
        if (e.key === "Home") {
          onIndex(0);
          return;
        }
        if (e.key === "End") {
          onIndex(last);
          return;
        }
        if (e.key === "Enter") {
          const cur = indexRef.current ?? last;
          onCommit?.(cur);
          return;
        }
        const cur = indexRef.current ?? last;
        const next = clamp(cur + (e.key === "ArrowRight" ? 1 : -1), 0, last);
        onIndex(next);
      }}
    >
      {children}
      {shown ? (
        <rect
          x={Math.min(bx1, bx2)}
          y={pad.t}
          width={Math.max(1, Math.abs(bx2 - bx1))}
          height={Math.max(1, viewH - pad.t - pad.b)}
          fill="var(--color-accent)"
          opacity="0.12"
          className="pointer-events-none"
        />
      ) : null}
    </svg>
  );
}

export function Crosshair({
  x,
  y,
  x1,
  x2,
  y1,
  y2,
}: {
  x: number;
  y: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}) {
  return (
    <g className="pointer-events-none">
      <line x1={x} x2={x} y1={y1} y2={y2} stroke="currentColor" strokeOpacity="0.3" />
      <line
        x1={x1}
        x2={x2}
        y1={y}
        y2={y}
        stroke="currentColor"
        strokeOpacity="0.16"
        strokeDasharray="3 4"
      />
    </g>
  );
}

export function ChartTip({
  visible,
  xPct,
  children,
}: {
  visible: boolean;
  xPct: number;
  children: ReactNode;
}) {
  if (!visible) return null;
  const flip = xPct > 58;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        className="absolute top-3 max-w-52 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-[var(--shadow-border)]"
        style={{
          left: flip ? "auto" : `min(${Math.max(2, xPct)}%, calc(100% - 13.5rem))`,
          right: flip ? `min(${Math.max(2, 100 - xPct)}%, calc(100% - 13.5rem))` : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ToolBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="toolbar">
      {children}
    </div>
  );
}

export function ToolChip({
  on,
  onClick,
  children,
  title,
}: {
  on?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors duration-150",
        on ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ChartReadout({
  items,
}: {
  items: { label: string; value: string; tone?: "up" | "down" | "muted" }[];
}) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{it.label}</dt>
          <dd
            className={cn(
              "truncate tabular text-foreground",
              it.tone === "up" && "text-up",
              it.tone === "down" && "text-down",
              it.tone === "muted" && "text-muted-foreground",
            )}
          >
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
