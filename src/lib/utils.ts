import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function r(n: number, digits = 2) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}
