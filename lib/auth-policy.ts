import type { BrokerProfile, BrokerRole, BrokerStatus } from "./types";

export type RouteArea = "broker" | "admin";

export function canAccessArea(
  profile: Pick<BrokerProfile, "role" | "status"> | null,
  area: RouteArea,
) {
  if (!profile || profile.status !== "approved") return false;
  return area === "admin" ? profile.role === "admin" : true;
}

export function isProfileComplete(
  profile: Pick<
    BrokerProfile,
    "full_name" | "company_name" | "mobile" | "primary_market"
  >,
) {
  return Boolean(
    profile.full_name?.trim() &&
      profile.company_name?.trim() &&
      profile.mobile?.trim() &&
      profile.primary_market?.trim(),
  );
}

export function resolvePostAuthRoute(
  profile:
    | (Pick<BrokerProfile, "role" | "status"> &
        Pick<
          BrokerProfile,
          "full_name" | "company_name" | "mobile" | "primary_market"
        >)
    | null,
) {
  if (!profile) return "/profile-setup";
  if (profile.status === "approved") {
    return profile.role === "admin" ? "/admin" : "/home";
  }
  if (!isProfileComplete(profile)) return "/profile-setup";
  if (profile.status === "pending") return "/pending";
  return "/access-suspended";
}

export function newProfileDefaults(): {
  role: BrokerRole;
  status: BrokerStatus;
} {
  return { role: "broker", status: "pending" };
}
