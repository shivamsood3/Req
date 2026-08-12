import { formatLocalitySummary } from "./requirement-format.ts";

export function normalizeIndianMobile(input: string | null | undefined) {
  const digits = (input ?? "").replace(/\D/g, "");
  const mobile10 = /^[6-9]\d{9}$/;

  if (mobile10.test(digits)) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0") && mobile10.test(digits.slice(1))) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91") && mobile10.test(digits.slice(2))) {
    return digits;
  }
  return null;
}

export function formatIndianMobile(input: string | null | undefined) {
  const normalized = normalizeIndianMobile(input);
  if (!normalized) return null;
  return `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`;
}

export function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || "there";
}

export function ownerToRespondentMessage({
  respondentName,
  localities,
  budgetLabel,
}: {
  respondentName: string | null;
  localities: string[];
  budgetLabel: string;
}) {
  return `Hi ${firstName(respondentName)}, connecting regarding your match for my ${formatLocalitySummary(localities)} ${budgetLabel} REQ on REQ.`;
}

export function respondentToOwnerMessage({
  ownerName,
  localities,
  budgetLabel,
}: {
  ownerName: string | null;
  localities: string[];
  budgetLabel: string;
}) {
  return `Hi ${firstName(ownerName)}, connecting regarding my match for your ${formatLocalitySummary(localities)} ${budgetLabel} REQ on REQ.`;
}

export function whatsappUrl(phone: string | null | undefined, message: string) {
  const normalized = normalizeIndianMobile(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
