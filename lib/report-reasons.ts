import type { ReportReason } from "./types";

export const REPORT_REASONS: ReadonlyArray<{ value: ReportReason; label: string }> = [
  { value: "fake_requirement", label: "Fake requirement" },
  { value: "spam", label: "Spam" },
  { value: "misleading_information", label: "Misleading information" },
  { value: "inappropriate_conduct", label: "Inappropriate conduct" },
  { value: "other", label: "Other" },
];

export function reportReasonLabel(reason: string) {
  return REPORT_REASONS.find((item) => item.value === reason)?.label ?? "Other";
}
