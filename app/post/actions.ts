"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedBroker } from "@/lib/auth";
import {
  createRequirementFields,
  validateCreateRequirement,
  type CreateRequirementFields,
  type CreateRequirementErrors,
} from "@/lib/create-requirement";
import { createClient } from "@/lib/supabase/server";

export type CreateRequirementActionState = {
  errors?: CreateRequirementErrors;
  values?: CreateRequirementFields;
};

export async function createRequirement(
  _previousState: CreateRequirementActionState,
  formData: FormData,
): Promise<CreateRequirementActionState> {
  await requireApprovedBroker();

  const fields = createRequirementFields(formData);
  const validation = validateCreateRequirement(fields);
  if (!validation.success) return { errors: validation.errors, values: fields };

  const input = validation.data;
  const supabase = await createClient();
  if (!supabase) return { errors: { form: "REQ is not connected right now. Please try again shortly." }, values: fields };

  const { data, error } = await supabase.rpc("create_requirement", {
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

  if (error || typeof data !== "string") {
    const localityChanged = error?.message.includes("selected locality");
    return {
      errors: localityChanged
        ? { localityIds: "One of those locations is no longer available. Please select again." }
        : { form: "We couldn’t post this REQ. Check the details and try again." },
      values: fields,
    };
  }

  revalidatePath("/");
  revalidatePath("/home");
  redirect(`/requirements/${data}?created=1`);
}
