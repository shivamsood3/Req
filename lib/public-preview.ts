import {
  formatBudgetRange,
  formatSizeRange,
  propertyTypeLabel,
} from "./requirement-format.ts";
import type { PropertyTypeKey, PublicRequirementPreview } from "./types.ts";

export type SafeRequirementRow = {
  id: string;
  locality_names: string[];
  locality_slugs: string[];
  property_type_key: PropertyTypeKey;
  budget_min: number | string;
  budget_max: number | string;
  size_min: number | string | null;
  size_max: number | string | null;
  size_unit: string | null;
  floor_preference: string | null;
  response_count: number;
  live_since: string;
  updated_at: string;
};

function optionalNumber(value: number | string | null) {
  return value === null ? null : Number(value);
}

export function serializePublicPreview(
  row: SafeRequirementRow,
): PublicRequirementPreview {
  const budgetMin = Number(row.budget_min);
  const budgetMax = Number(row.budget_max);
  const sizeMin = optionalNumber(row.size_min);
  const sizeMax = optionalNumber(row.size_max);

  return {
    id: row.id,
    localityNames: row.locality_names,
    localitySlugs: row.locality_slugs,
    propertyTypeKey: row.property_type_key,
    propertyType: propertyTypeLabel(row.property_type_key),
    budgetMin,
    budgetMax,
    budgetLabel: formatBudgetRange(budgetMin, budgetMax),
    sizeMin,
    sizeMax,
    sizeUnit: row.size_unit,
    sizeLabel: formatSizeRange(
      sizeMin,
      sizeMax,
      row.size_unit,
    ),
    floorPreference: row.floor_preference,
    responseCount: row.response_count,
    liveSince: row.live_since,
    updatedAt: row.updated_at,
  };
}
