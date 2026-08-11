import { serializePublicPreview } from "./public-preview";
import type { LocalityOption, PublicRequirementPreview } from "./types";

export const developmentLocalities: LocalityOption[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Defence Colony", slug: "defence-colony" },
  { id: "00000000-0000-4000-8000-000000000002", name: "Greater Kailash I", slug: "greater-kailash-i" },
  { id: "00000000-0000-4000-8000-000000000003", name: "New Friends Colony", slug: "new-friends-colony" },
  { id: "00000000-0000-4000-8000-000000000004", name: "Panchsheel Park", slug: "panchsheel-park" },
];

// These fixtures are used only by `next dev` when Supabase is not configured.
// Production never falls back to them and the Build 1 migration removes their
// historical IDs from the live database.
export function developmentPreviews(now = Date.now()): PublicRequirementPreview[] {
  return [
    {
      id: "b1000000-0000-4000-8000-000000000001",
      locality_names: ["Defence Colony", "Greater Kailash I"],
      locality_slugs: ["defence-colony", "greater-kailash-i"],
      property_type_key: "floor" as const,
      budget_min: 12,
      budget_max: 15,
      size_min: 325,
      size_max: 500,
      size_unit: "sq yd",
      floor_preference: "First floor preferred",
      response_count: 4,
      live_since: new Date(now - 12 * 60_000).toISOString(),
      updated_at: new Date(now - 12 * 60_000).toISOString(),
    },
    {
      id: "b1000000-0000-4000-8000-000000000002",
      locality_names: ["Greater Kailash I"],
      locality_slugs: ["greater-kailash-i"],
      property_type_key: "floor" as const,
      budget_min: 7.5,
      budget_max: 9,
      size_min: 250,
      size_max: 350,
      size_unit: "sq yd",
      floor_preference: "Upper ground or first floor",
      response_count: 7,
      live_since: new Date(now - 3 * 3_600_000).toISOString(),
      updated_at: new Date(now - 3 * 3_600_000).toISOString(),
    },
    {
      id: "b1000000-0000-4000-8000-000000000003",
      locality_names: ["New Friends Colony"],
      locality_slugs: ["new-friends-colony"],
      property_type_key: "house-plot" as const,
      budget_min: 24,
      budget_max: 30,
      size_min: 400,
      size_max: 600,
      size_unit: "sq yd",
      floor_preference: "Full building",
      response_count: 2,
      live_since: new Date(now - 2 * 86_400_000).toISOString(),
      updated_at: new Date(now - 2 * 86_400_000).toISOString(),
    },
    {
      id: "b1000000-0000-4000-8000-000000000004",
      locality_names: ["Panchsheel Park"],
      locality_slugs: ["panchsheel-park"],
      property_type_key: "floor" as const,
      budget_min: 10,
      budget_max: 13,
      size_min: 350,
      size_max: 500,
      size_unit: "sq yd",
      floor_preference: "Second floor with terrace",
      response_count: 5,
      live_since: new Date(now - 87 * 60_000).toISOString(),
      updated_at: new Date(now - 87 * 60_000).toISOString(),
    },
  ].map(serializePublicPreview);
}
