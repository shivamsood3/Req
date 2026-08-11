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
};

function optionalNumber(value: number | string | null) {
  return value === null ? null : Number(value);
}

export function serializePublicPreview(
  row: SafeRequirementRow,
): PublicRequirementPreview {
  const budgetMin = Number(row.budget_min);
  const budgetMax = Number(row.budget_max);

  return {
    id: row.id,
    localityNames: row.locality_names,
    localitySlugs: row.locality_slugs,
    propertyTypeKey: row.property_type_key,
    propertyType: propertyTypeLabel(row.property_type_key),
    budgetMin,
    budgetMax,
    budgetLabel: formatBudgetRange(budgetMin, budgetMax),
    sizeLabel: formatSizeRange(
      optionalNumber(row.size_min),
      optionalNumber(row.size_max),
      row.size_unit,
    ),
    floorPreference: row.floor_preference,
    responseCount: row.response_count,
    liveSince: row.live_since,
  };
}
