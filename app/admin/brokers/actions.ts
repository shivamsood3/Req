"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reviewBroker(formData: FormData) {
  await requireAdmin();
  const brokerId = String(formData.get("broker_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(brokerId) || !["pending", "approved", "suspended", "rejected"].includes(decision)) {
    throw new Error("Invalid broker review request.");
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("review_broker", {
    p_profile_id: brokerId,
    p_decision: decision,
  });
  if (error) throw new Error("The broker review could not be saved.");
  revalidatePath("/admin");
  revalidatePath("/admin/brokers");
}
