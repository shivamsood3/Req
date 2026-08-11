import { redirect } from "next/navigation";
import { canAccessArea, isProfileComplete } from "./auth-policy";
import { createClient } from "./supabase/server";
import type { BrokerProfile } from "./types";

export async function getSessionProfile() {
  const supabase = await createClient();
  if (!supabase) return { user: null, profile: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (data as BrokerProfile | null) ?? null };
}

export async function requireApprovedBroker() {
  const session = await getSessionProfile();
  if (!session.user) redirect("/login");
  if (!session.profile || !isProfileComplete(session.profile)) {
    redirect("/profile-setup");
  }
  if (session.profile.status === "pending") redirect("/pending");
  if (!canAccessArea(session.profile, "broker")) redirect("/access-suspended");
  return { user: session.user, profile: session.profile };
}

export async function requireAdmin() {
  const session = await getSessionProfile();
  if (!session.user) redirect("/login");
  if (!session.profile || !isProfileComplete(session.profile)) {
    redirect("/profile-setup");
  }
  if (!canAccessArea(session.profile, "admin")) {
    redirect(session.profile.status === "approved" ? "/home" : "/access-suspended");
  }
  return { user: session.user, profile: session.profile };
}
