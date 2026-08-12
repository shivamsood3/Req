"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function completeProfile(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = value(formData, "full_name");
  const companyName = value(formData, "company_name");
  const mobile = value(formData, "mobile");
  const primaryMarket = value(formData, "primary_market");
  const reraNumber = value(formData, "rera_number");

  if ([fullName, companyName, primaryMarket].some((field) => field.length < 2)) {
    return { error: "Please complete all required fields." };
  }
  if (!/^[+0-9 ()-]{8,18}$/.test(mobile)) {
    return { error: "Enter a valid mobile number." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again to continue." };

  const { error } = await supabase.rpc("complete_broker_profile", {
    p_full_name: fullName,
    p_company_name: companyName,
    p_mobile: mobile,
    p_primary_market: primaryMarket,
    p_rera_number: reraNumber || null,
  });

  if (error) return { error: "We couldn’t save your profile. Please try again." };
  redirect("/pending");
}
