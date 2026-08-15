"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fields(formData: FormData) {
  return {
    id: String(formData.get("locality_id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    sortOrder: Number(String(formData.get("sort_order") ?? "0")),
    isActive: formData.get("is_active") === "on",
  };
}

export async function createLocality(formData: FormData) {
  await requireAdmin();
  const input = fields(formData);
  if (input.name.length < 2 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) {
    throw new Error("Invalid locality.");
  }
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("create_admin_locality", {
    p_name: input.name,
    p_slug: input.slug,
    p_sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
  });
  if (error) throw new Error("Locality could not be created.");
  revalidatePath("/admin/localities");
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/post");
}

export async function updateLocality(formData: FormData) {
  await requireAdmin();
  const input = fields(formData);
  if (!UUID.test(input.id) || input.name.length < 2 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) {
    throw new Error("Invalid locality.");
  }
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("update_admin_locality", {
    p_locality_id: input.id,
    p_name: input.name,
    p_slug: input.slug,
    p_is_active: input.isActive,
    p_sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
  });
  if (error) throw new Error("Locality could not be saved.");
  revalidatePath("/admin/localities");
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath("/post");
}
