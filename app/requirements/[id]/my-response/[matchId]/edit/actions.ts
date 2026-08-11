"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MatchActionState } from "@/app/requirements/[id]/match/actions";
import { requireApprovedBroker } from "@/lib/auth";
import { matchOptionFields, validateMatchOption } from "@/lib/match-option";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateMatch(
  _previousState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  await requireApprovedBroker();
  const requirementId = String(formData.get("requirement_id") ?? "");
  const matchId = String(formData.get("match_id") ?? "");
  const fields = matchOptionFields(formData);
  if (!UUID.test(requirementId) || !UUID.test(matchId)) return { errors: { form: "This match could not be found." }, values: fields };
  const validation = validateMatchOption(fields);
  if (!validation.success) return { errors: validation.errors, values: fields };
  const supabase = await createClient();
  if (!supabase) return { errors: { form: "REQ is not connected right now." }, values: fields };
  const input = validation.data;
  const { error } = await supabase.rpc("update_own_match", {
    p_match_id: matchId,
    p_locality_id: input.localityId,
    p_asking_price: input.askingPrice,
    p_size: input.size,
    p_size_unit: input.sizeUnit,
    p_floor: input.floor,
    p_source: input.source,
    p_notes: input.notes,
  });
  if (error) {
    return {
      errors: {
        form: error.message.toLowerCase().includes("no longer live")
          ? "This REQ has closed or expired, so its matches can no longer be changed."
          : "We couldn’t update this match. Refresh and try again.",
      },
      values: fields,
    };
  }
  revalidatePath(`/requirements/${requirementId}/my-response`);
  revalidatePath(`/requirements/${requirementId}/matches`);
  revalidatePath("/my-reqs");
  redirect(`/requirements/${requirementId}/my-response?updated=1`);
}
