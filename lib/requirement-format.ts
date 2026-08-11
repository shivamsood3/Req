import type { PropertyTypeKey } from "./types.ts";

export const PROPERTY_TYPE_OPTIONS: ReadonlyArray<{
  key: PropertyTypeKey;
  label: string;
}> = [
  { key: "floor", label: "Independent Floor" },
  { key: "house-plot", label: "House / Plot" },
  { key: "apartment", label: "Apartment" },
  { key: "commercial", label: "Commercial" },
  { key: "land", label: "Land" },
  { key: "other", label: "Other" },
];

export function propertyTypeLabel(key: PropertyTypeKey) {
  return PROPERTY_TYPE_OPTIONS.find((option) => option.key === key)?.label ?? "Other";
}

function compactNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, "");
}

export function formatBudgetRange(min: number, max: number) {
  return `₹${compactNumber(min)}–${compactNumber(max)} Cr`;
}

export function formatSizeRange(
  min: number | null,
  max: number | null,
  unit: string | null,
) {
  if (min !== null && max !== null && unit) {
    return `${compactNumber(min)}–${compactNumber(max)} ${unit}`;
  }
  if (min !== null && unit) return `${compactNumber(min)}+ ${unit}`;
  if (max !== null && unit) return `Up to ${compactNumber(max)} ${unit}`;
  return "Size flexible";
}

export function formatLocalitySummary(localities: string[]) {
  if (localities.length === 0) return "South Delhi";
  if (localities.length === 1) return localities[0];
  if (localities.length === 2) return `${localities[0]} + ${localities[1]}`;
  return `${localities[0]} + ${localities.length - 1} MORE`;
}

export function formatFreshness(liveSince: string, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(liveSince).getTime());
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `${minutes} MIN AGO`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} HR AGO`;

  return `${Math.floor(hours / 24)} DAYS AGO`;
}

export function formatResponseCount(count: number) {
  return `${count} ${count === 1 ? "broker" : "brokers"} responded`;
}

export function formatExpiry(expiresAt: string, now = Date.now()) {
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return "Expired";

  const hours = Math.ceil(remaining / 3_600_000);
  if (hours < 24) return `Expires in ${hours} ${hours === 1 ? "hour" : "hours"}`;

  const days = Math.ceil(hours / 24);
  return `Expires in ${days} ${days === 1 ? "day" : "days"}`;
}

export function requestTimestamp() {
  return Date.now();
}
