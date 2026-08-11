import type { PropertyTypeKey, PublicRequirementPreview } from "./types.ts";
import { PROPERTY_TYPE_OPTIONS } from "./requirement-format.ts";

export type FeedFilters = {
  localities: string[];
  propertyType: PropertyTypeKey | null;
  budgetMin: number | null;
  budgetMax: number | null;
};

export type FeedSearchParams = Record<string, string | string[] | undefined>;

export const EMPTY_FEED_FILTERS: FeedFilters = {
  localities: [],
  propertyType: null,
  budgetMin: null,
  budgetMax: null,
};

function values(value: string | string[] | undefined) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function budget(value: string | string[] | undefined) {
  const candidate = values(value)[0];
  if (!candidate) return null;
  const parsed = Number(candidate);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000) return null;
  return Math.round(parsed * 100) / 100;
}

export function parseFeedFilters(
  searchParams: FeedSearchParams,
  allowedLocalitySlugs: string[],
): FeedFilters {
  const allowedLocalities = new Set(allowedLocalitySlugs);
  const localities = [...new Set(values(searchParams.locality))].filter((slug) =>
    allowedLocalities.has(slug),
  );

  const propertyTypeCandidate = values(searchParams.type)[0];
  const propertyType = PROPERTY_TYPE_OPTIONS.some(
    (option) => option.key === propertyTypeCandidate,
  )
    ? (propertyTypeCandidate as PropertyTypeKey)
    : null;

  let budgetMin = budget(searchParams.budgetMin);
  let budgetMax = budget(searchParams.budgetMax);
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    budgetMin = null;
    budgetMax = null;
  }

  return { localities, propertyType, budgetMin, budgetMax };
}

export function budgetRangesOverlap(
  requirementMin: number,
  requirementMax: number,
  selectedMin: number | null,
  selectedMax: number | null,
) {
  return (
    (selectedMin === null || requirementMax >= selectedMin) &&
    (selectedMax === null || requirementMin <= selectedMax)
  );
}

export function previewMatchesFilters(
  item: PublicRequirementPreview,
  filters: FeedFilters,
) {
  const localityMatches =
    filters.localities.length === 0 ||
    item.localitySlugs.some((slug) => filters.localities.includes(slug));
  const typeMatches =
    filters.propertyType === null || item.propertyTypeKey === filters.propertyType;

  return (
    localityMatches &&
    typeMatches &&
    budgetRangesOverlap(
      item.budgetMin,
      item.budgetMax,
      filters.budgetMin,
      filters.budgetMax,
    )
  );
}
