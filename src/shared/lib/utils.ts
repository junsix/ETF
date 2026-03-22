import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatReturn(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

export function returnColor(val: number | null): string {
  if (val === null || val === undefined) return "text-gray-400";
  if (val > 0) return "text-red-600";
  if (val < 0) return "text-blue-600";
  return "text-gray-600";
}

export function formatNumber(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return val.toLocaleString("ko-KR");
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return String(vol);
}
