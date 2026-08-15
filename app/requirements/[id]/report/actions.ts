"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedBroker } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/report-reasons";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, ReportReason } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedReasons = new Set(REPORT_REASONS.map((reason) => reason.value));

export async function submitRequirementReport(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireApprovedBroker();
  const requirementId = String(formData.get("requirement_id") ?? "");
  const reason = String(formData.get("reason") ?? "") as ReportReason;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!UUID.test(requirementId) || !allowedReasons.has(reason)) {
    return { error: "Choose a valid report reason." };
  }
  if (notes.length > 500) return { error: "Keep notes to 500 characters or fewer." };

  const supabase = await createClient();
  if (!supabase) return { error: "REQ is not connected right now." };
  const { error } = await supabase.rpc("submit_report", {
    p_requirement_id: requirementId,
    p_reason: reason,
    p_notes: notes || null,
  });
  if (error) return { error: "We couldn’t submit this report. Please try again." };
  revalidatePath(`/requirements/${requirementId}`);
  revalidatePath("/admin/reports");
  return { success: "Report submitted." };
}
