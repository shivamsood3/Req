"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions = new Set(["dismiss", "warn", "suspend_broker", "close_requirement"]);

export async function moderateReport(formData: FormData) {
  await requireAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!UUID.test(reportId) || !actions.has(action)) throw new Error("Invalid moderation request.");
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("moderate_report", {
    p_report_id: reportId,
    p_action: action,
  });
  if (error) throw new Error("Moderation action could not be saved.");
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/requirements");
  revalidatePath("/admin/brokers");
  revalidatePath("/");
  revalidatePath("/home");
}
