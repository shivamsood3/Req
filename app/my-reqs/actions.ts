"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedBroker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type LifecycleActionState = { error?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requirementId(formData: FormData) {
  const id = String(formData.get("requirement_id") ?? "");
  return UUID.test(id) ? id : null;
}

function revalidateRequirement(id: string) {
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/my-reqs");
  revalidatePath(`/requirements/${id}`);
}

export async function closeOwnRequirement(
  _previousState: LifecycleActionState,
  formData: FormData,
): Promise<LifecycleActionState> {
  await requireApprovedBroker();
  const id = requirementId(formData);
  if (!id) return { error: "This REQ could not be found." };

  const supabase = await createClient();
  if (!supabase) return { error: "REQ is not connected right now." };
  const { error } = await supabase.rpc("close_own_requirement", { p_requirement_id: id });
  if (error) return { error: "This REQ is no longer available to close." };

  revalidateRequirement(id);
  redirect("/my-reqs?changed=closed");
}

export async function renewOwnRequirement(
  _previousState: LifecycleActionState,
  formData: FormData,
): Promise<LifecycleActionState> {
  await requireApprovedBroker();
  const id = requirementId(formData);
  if (!id) return { error: "This REQ could not be found." };

  const supabase = await createClient();
  if (!supabase) return { error: "REQ is not connected right now." };
  const { error } = await supabase.rpc("renew_own_requirement", { p_requirement_id: id });
  if (error) {
    return {
      error: error.message.includes("not yet expiring")
        ? "Keep Live becomes available during the final 24 hours."
        : "We couldn’t make this REQ live. Refresh and try again.",
    };
  }

  revalidateRequirement(id);
  redirect(`/requirements/${id}?renewed=1`);
}
