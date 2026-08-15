"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApprovedBroker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateProfile(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireApprovedBroker();
  const fullName = value(formData, "full_name");
  const companyName = value(formData, "company_name");
  const mobile = value(formData, "mobile");
  const primaryMarket = value(formData, "primary_market");
  const reraNumber = value(formData, "rera_number");

  if ([fullName, companyName, primaryMarket].some((field) => field.length < 2)) {
    return { error: "Please complete all required fields." };
  }
  if (!/^[+0-9 ()-]{8,18}$/.test(mobile)) return { error: "Enter a valid mobile number." };

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.rpc("update_own_profile", {
    p_full_name: fullName,
    p_company_name: companyName,
    p_mobile: mobile,
    p_primary_market: primaryMarket,
    p_rera_number: reraNumber || null,
  });
  if (error) return { error: "We couldn’t save your profile." };
  revalidatePath("/profile");
  revalidatePath("/home");
  return { success: "Profile updated." };
}

export async function deleteOwnAccount(formData: FormData) {
  await requireApprovedBroker();
  const confirmation = value(formData, "confirmation");
  if (confirmation !== "DELETE ACCOUNT") throw new Error("Type DELETE ACCOUNT to confirm.");
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("request_account_deletion");
  if (error) throw new Error("Account deletion could not be completed.");
  await supabase.auth.signOut();
  redirect("/");
}
