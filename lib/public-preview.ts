import type { PublicRequirementPreview } from "./types";

type SafeRequirementRow = {
  id: string;
  locality_name: string;
  locality_slug: string;
  property_type: string;
  budget_min: number;
  budget_max: number;
  size_min: number | null;
  size_max: number | null;
  size_unit: string | null;
  floor_preference: string | null;
  response_count: number;
  live_since: string;
};

function crores(value: number) {
  return `₹${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

export function serializePublicPreview(
  row: SafeRequirementRow,
): PublicRequirementPreview {
  return {
    id: row.id,
    locality: row.locality_name,
    localitySlug: row.locality_slug,
    propertyType: row.property_type,
    budgetLabel: `${crores(row.budget_min)}–${crores(row.budget_max)} Cr`,
    sizeLabel:
      row.size_min && row.size_max && row.size_unit
        ? `${row.size_min}–${row.size_max} ${row.size_unit}`
        : "Size flexible",
    floorPreference: row.floor_preference,
    responseCount: row.response_count,
    liveSince: row.live_since,
  };
}

export const fixturePreviews: PublicRequirementPreview[] = [
  {
    id: "b1000000-0000-4000-8000-000000000001",
    locality: "Defence Colony",
    localitySlug: "defence-colony",
    propertyType: "Independent Floor",
    budgetLabel: "₹12–15 Cr",
    sizeLabel: "325–500 sq yd",
    floorPreference: "First floor preferred",
    responseCount: 4,
    liveSince: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: "b1000000-0000-4000-8000-000000000002",
    locality: "Greater Kailash I",
    localitySlug: "greater-kailash-i",
    propertyType: "Builder Floor",
    budgetLabel: "₹7.5–9 Cr",
    sizeLabel: "250–350 sq yd",
    floorPreference: "Upper ground or first floor",
    responseCount: 7,
    liveSince: new Date(Date.now() - 34 * 60_000).toISOString(),
  },
  {
    id: "b1000000-0000-4000-8000-000000000003",
    locality: "New Friends Colony",
    localitySlug: "new-friends-colony",
    propertyType: "Independent House",
    budgetLabel: "₹24–30 Cr",
    sizeLabel: "400–600 sq yd",
    floorPreference: "Full building",
    responseCount: 2,
    liveSince: new Date(Date.now() - 58 * 60_000).toISOString(),
  },
  {
    id: "b1000000-0000-4000-8000-000000000004",
    locality: "Panchsheel Park",
    localitySlug: "panchsheel-park",
    propertyType: "Independent Floor",
    budgetLabel: "₹10–13 Cr",
    sizeLabel: "350–500 sq yd",
    floorPreference: "Second floor with terrace",
    responseCount: 5,
    liveSince: new Date(Date.now() - 87 * 60_000).toISOString(),
  },
];
