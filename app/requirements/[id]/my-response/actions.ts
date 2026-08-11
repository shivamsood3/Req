"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedBroker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type WithdrawActionState = { error?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function withdrawMatch(
  _previousState: WithdrawActionState,
  formData: FormData,
): Promise<WithdrawActionState> {
  await requireApprovedBroker();
  const requirementId = String(formData.get("requirement_id") ?? "");
  const matchId = String(formData.get("match_id") ?? "");
  if (!UUID.test(requirementId) || !UUID.test(matchId)) return { error: "This match could not be found." };
  const supabase = await createClient();
  if (!supabase) return { error: "REQ is not connected right now." };
  const { error } = await supabase.rpc("withdraw_own_match", { p_match_id: matchId });
  if (error) {
    return {
      error: error.message.toLowerCase().includes("no longer live")
        ? "This REQ has closed or expired, so its matches can no longer be changed."
        : "This match is no longer available to withdraw.",
    };
  }

  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/my-reqs");
  revalidatePath(`/requirements/${requirementId}`);
  revalidatePath(`/requirements/${requirementId}/my-response`);
  revalidatePath(`/requirements/${requirementId}/matches`);
  redirect(`/requirements/${requirementId}/my-response?withdrawn=1`);
}
