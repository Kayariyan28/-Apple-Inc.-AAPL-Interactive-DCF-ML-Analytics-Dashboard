/** Quiet isometric marks — Apple-clean, not decorative noise. */

export function CubeGlyph({ className = "h-28 w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 140" className={className} aria-hidden>
      <g fill="none" stroke="#1d1d1f" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M40 88 L110 52 L180 88 L110 124 Z" />
        <path d="M110 52 L110 18 L180 54 L180 88" />
        <path d="M110 18 L40 54 L40 88" />
        <path d="M110 52 L110 124" opacity="0.35" />
      </g>
      <path d="M110 52 L180 88 L110 124 L40 88 Z" fill="#0a84ff" opacity="0.14" />
    </svg>
  );
}

export function ArrowGlyph({ className = "h-16 w-28" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 72" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="12" y="40" width="18" height="20" />
        <rect x="38" y="28" width="18" height="32" />
        <rect x="64" y="16" width="18" height="44" />
        <path d="M96 44 L128 16" />
        <path d="M112 16 H128 V32" />
      </g>
    </svg>
  );
}
