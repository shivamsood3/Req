import { serializeBrokerRequirement, type BrokerRequirementRow } from "./broker-requirement";
import { developmentLocalities, developmentPreviews } from "./dev-fixtures";
import { previewMatchesFilters, type FeedFilters } from "./feed-filters";
import { serializeOwnerRequirement, type OwnerRequirementRow } from "./owner-requirement";
import { serializePublicPreview, type SafeRequirementRow } from "./public-preview";
import { createPublicClient } from "./supabase/public";
import { createClient } from "./supabase/server";
import type { BrokerRequirement, LocalityOption, OwnerRequirement, PublicRequirementPreview } from "./types";

const isLocalDevelopment = process.env.NODE_ENV === "development";

export async function getActiveLocalities(): Promise<LocalityOption[]> {
  const supabase = createPublicClient();
  if (!supabase) return isLocalDevelopment ? developmentLocalities : [];

  const { data, error } = await supabase
    .from("localities")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load active localities");
  return (data ?? []) as LocalityOption[];
}

export async function getPublicPreviews(
  filters: FeedFilters,
): Promise<PublicRequirementPreview[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    return isLocalDevelopment
      ? developmentPreviews().filter((item) => previewMatchesFilters(item, filters))
      : [];
  }

  let query = supabase
    .from("public_requirement_previews")
    .select("*")
    .order("live_since", { ascending: false })
    .limit(100);

  if (filters.localities.length > 0) {
    query = query.overlaps("locality_slugs", filters.localities);
  }
  if (filters.propertyType) {
    query = query.eq("property_type_key", filters.propertyType);
  }
  if (filters.budgetMin !== null) {
    query = query.gte("budget_max", filters.budgetMin);
  }
  if (filters.budgetMax !== null) {
    query = query.lte("budget_min", filters.budgetMax);
  }

  const { data, error } = await query;
  if (error) throw new Error("Unable to load live requirements");
  return ((data ?? []) as SafeRequirementRow[]).map(serializePublicPreview);
}

function brokerRpcParams(filters: FeedFilters, requirementId: string | null) {
  return {
    p_locality_slugs: filters.localities.length > 0 ? filters.localities : null,
    p_property_type_key: filters.propertyType,
    p_budget_min: filters.budgetMin,
    p_budget_max: filters.budgetMax,
    p_requirement_id: requirementId,
  };
}

export async function getBrokerLiveRequirements(
  filters: FeedFilters,
): Promise<BrokerRequirement[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc(
    "get_broker_live_requirements",
    brokerRpcParams(filters, null),
  );
  if (error) throw new Error("Unable to load broker requirements");
  return ((data ?? []) as BrokerRequirementRow[]).map(serializeBrokerRequirement);
}

export async function getBrokerRequirement(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc(
    "get_broker_live_requirements",
    brokerRpcParams(
      { localities: [], propertyType: null, budgetMin: null, budgetMax: null },
      id,
    ),
  );
  if (error) throw new Error("Unable to load requirement");

  const row = (data?.[0] as BrokerRequirementRow | undefined) ?? null;
  return row ? serializeBrokerRequirement(row) : null;
}

export async function getOwnRequirements(): Promise<OwnerRequirement[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_own_requirements", {
    p_requirement_id: null,
  });
  if (error) throw new Error("Unable to load your requirements");
  return ((data ?? []) as OwnerRequirementRow[]).map(serializeOwnerRequirement);
}

export async function getOwnRequirement(id: string): Promise<OwnerRequirement | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_own_requirements", {
    p_requirement_id: id,
  });
  if (error) throw new Error("Unable to load your requirement");
  const row = (data?.[0] as OwnerRequirementRow | undefined) ?? null;
  return row ? serializeOwnerRequirement(row) : null;
}
