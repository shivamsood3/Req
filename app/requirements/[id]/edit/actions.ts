"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CreateRequirementActionState } from "@/app/post/actions";
import { requireApprovedBroker } from "@/lib/auth";
import { createRequirementFields, validateCreateRequirement } from "@/lib/create-requirement";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateRequirement(
  _previousState: CreateRequirementActionState,
  formData: FormData,
): Promise<CreateRequirementActionState> {
  await requireApprovedBroker();
  const requirementId = String(formData.get("requirement_id") ?? "");
  const fields = createRequirementFields(formData);
  if (!UUID.test(requirementId)) return { errors: { form: "This REQ could not be found." }, values: fields };

  const validation = validateCreateRequirement(fields);
  if (!validation.success) return { errors: validation.errors, values: fields };

  const input = validation.data;
  const supabase = await createClient();
  if (!supabase) return { errors: { form: "REQ is not connected right now. Please try again shortly." }, values: fields };

  const { error } = await supabase.rpc("update_own_requirement", {
    p_requirement_id: requirementId,
    p_locality_ids: input.localityIds,
    p_property_type_key: input.propertyType,
    p_budget_min: input.budgetMin,
    p_budget_max: input.budgetMax,
    p_size_min: input.sizeMin,
    p_size_max: input.sizeMax,
    p_size_unit: input.sizeUnit,
    p_floor_preference: input.floorPreference,
    p_buyer_type: input.buyerType,
    p_urgency: input.urgency,
    p_notes: input.notes,
  });

  if (error) {
    if (error.message.includes("no longer live")) {
      return { errors: { form: "This REQ has expired or closed and can no longer be edited." }, values: fields };
    }
    if (error.message.includes("selected locality")) {
      return { errors: { localityIds: "One of those locations is no longer available. Please select again." }, values: fields };
    }
    return { errors: { form: "We couldn’t save these changes. Check the details and try again." }, values: fields };
  }

  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/my-reqs");
  revalidatePath(`/requirements/${requirementId}`);
  redirect(`/requirements/${requirementId}?updated=1`);
}
