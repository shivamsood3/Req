"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedBroker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ConnectActionState = { error?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function connectToResponse(
  _previousState: ConnectActionState,
  formData: FormData,
): Promise<ConnectActionState> {
  await requireApprovedBroker();
  const requirementId = String(formData.get("requirement_id") ?? "");
  const respondingBrokerId = String(formData.get("responding_broker_id") ?? "");

  if (!UUID.test(requirementId) || !UUID.test(respondingBrokerId)) {
    return { error: "This response could not be found." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "REQ is not connected right now." };

  const { error } = await supabase.rpc("connect_to_response", {
    p_requirement_id: requirementId,
    p_responding_broker_id: respondingBrokerId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("no longer live")) {
      return { error: "This REQ has closed or expired, so new connections are no longer available." };
    }
    if (message.includes("active response")) {
      return { error: "This broker no longer has an active match option." };
    }
    if (message.includes("not approved")) {
      return { error: "This broker is not currently available to connect." };
    }
    return { error: "We couldn’t connect this response. Try again." };
  }

  revalidatePath("/my-reqs");
  revalidatePath(`/requirements/${requirementId}`);
  revalidatePath(`/requirements/${requirementId}/matches`);
  revalidatePath(`/requirements/${requirementId}/my-response`);
  redirect(`/requirements/${requirementId}/matches?connected=1`);
}
