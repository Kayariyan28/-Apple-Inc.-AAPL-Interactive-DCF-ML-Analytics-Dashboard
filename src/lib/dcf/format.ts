const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(n: number, digits = 2) {
  return (digits === 0 ? usd0 : usd).format(n);
}

export function moneyShare(n: number) {
  return usd.format(n);
}

/** Model units are $ millions. */
export function billions(mm: number, digits = 0) {
  return `$${(mm / 1000).toFixed(digits)}B`;
}

export function trillions(mm: number, digits = 2) {
  return `$${(mm / 1_000_000).toFixed(digits)}T`;
}

export function pct(n: number, digits = 1) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

export function pctPlain(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function compact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function signedClass(n: number) {
  if (n > 0.005) return "text-up";
  if (n < -0.005) return "text-down";
  return "text-muted-foreground";
}
