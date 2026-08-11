import type { OwnerRequirement } from "./types.ts";

export type OwnerRequirementGroup = "active" | "expiring" | "history";

export function ownerRequirementGroup(
  requirement: Pick<OwnerRequirement, "effectiveStatus" | "expiresAt">,
  now = Date.now(),
): OwnerRequirementGroup {
  if (requirement.effectiveStatus !== "live") return "history";
  const remaining = new Date(requirement.expiresAt).getTime() - now;
  return remaining <= 24 * 3_600_000 ? "expiring" : "active";
}

export function groupOwnRequirements(items: OwnerRequirement[], now = Date.now()) {
  return {
    active: items.filter((item) => ownerRequirementGroup(item, now) === "active"),
    expiring: items.filter((item) => ownerRequirementGroup(item, now) === "expiring"),
    history: items.filter((item) => ownerRequirementGroup(item, now) === "history"),
  };
}
