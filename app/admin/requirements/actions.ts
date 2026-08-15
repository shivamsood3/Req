"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function adminCloseRequirement(formData: FormData) {
  await requireAdmin();
  const requirementId = String(formData.get("requirement_id") ?? "");
  if (!UUID.test(requirementId)) throw new Error("Invalid requirement.");
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("admin_close_requirement", {
    p_requirement_id: requirementId,
  });
  if (error) throw new Error("REQ could not be closed.");
  revalidatePath("/admin/requirements");
  revalidatePath("/");
  revalidatePath("/home");
}
