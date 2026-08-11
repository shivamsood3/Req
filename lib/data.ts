import { fixturePreviews, serializePublicPreview } from "./public-preview";
import { createClient } from "./supabase/server";
import type { PublicRequirementPreview } from "./types";

export async function getPublicPreviews(): Promise<PublicRequirementPreview[]> {
  const supabase = await createClient();
  if (!supabase) return fixturePreviews;

  const { data, error } = await supabase
    .from("public_requirement_previews")
    .select("*")
    .order("live_since", { ascending: false })
    .limit(12);

  if (error || !data?.length) return fixturePreviews;
  return data.map(serializePublicPreview);
}
