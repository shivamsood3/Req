"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedBroker } from "@/lib/auth";
import { sendPushForEventKey } from "@/lib/notifications";
import {
  matchOptionFields,
  validateMatchOption,
  type MatchOptionErrors,
  type MatchOptionFields,
} from "@/lib/match-option";
import { createClient } from "@/lib/supabase/server";

export type MatchActionState = { errors?: MatchOptionErrors; values?: MatchOptionFields };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitMatch(
  _previousState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const { user } = await requireApprovedBroker();
  const requirementId = String(formData.get("requirement_id") ?? "");
  const fields = matchOptionFields(formData);
  if (!UUID.test(requirementId)) return { errors: { form: "This REQ could not be found." }, values: fields };
  const validation = validateMatchOption(fields);
  if (!validation.success) return { errors: validation.errors, values: fields };

  const supabase = await createClient();
  if (!supabase) return { errors: { form: "REQ is not connected right now." }, values: fields };
  const input = validation.data;
  const { error } = await supabase.rpc("submit_match", {
    p_requirement_id: requirementId,
    p_locality_id: input.localityId,
    p_asking_price: input.askingPrice,
    p_size: input.size,
    p_size_unit: input.sizeUnit,
    p_floor: input.floor,
    p_source: input.source,
    p_notes: input.notes,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("no longer live")) return { errors: { form: "This REQ has closed or expired and cannot accept matches." }, values: fields };
    if (message.includes("maximum 3")) return { errors: { form: "You already have 3 active options for this REQ." }, values: fields };
    if (message.includes("own requirement")) return { errors: { form: "You cannot respond to your own REQ." }, values: fields };
    return { errors: { form: "We couldn’t submit this match. Check the details and try again." }, values: fields };
  }

  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/my-reqs");
  revalidatePath(`/requirements/${requirementId}`);
  revalidatePath(`/requirements/${requirementId}/my-response`);
  revalidatePath(`/requirements/${requirementId}/matches`);
  await sendPushForEventKey(`new_match:${requirementId}:${user.id}`);
  redirect(`/requirements/${requirementId}/my-response?sent=1`);
}
