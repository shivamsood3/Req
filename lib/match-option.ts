import type {
  MatchFloor,
  MatchSizeUnit,
  MatchSource,
} from "./types.ts";

export const MATCH_SIZE_UNITS: ReadonlyArray<{ value: MatchSizeUnit; label: string }> = [
  { value: "sq yd", label: "sq yd" },
  { value: "sq ft", label: "sq ft" },
  { value: "acre", label: "acre" },
];

export const MATCH_FLOORS: ReadonlyArray<{ value: MatchFloor; label: string }> = [
  { value: "Ground", label: "Ground" },
  { value: "First", label: "First" },
  { value: "Second", label: "Second" },
  { value: "Third", label: "Third" },
  { value: "Top", label: "Top" },
  { value: "Other", label: "Other" },
];

export const MATCH_SOURCES: ReadonlyArray<{ value: MatchSource; label: string }> = [
  { value: "Direct", label: "Direct" },
  { value: "Through another broker", label: "Through another broker" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

export type MatchOptionFields = {
  localityId: string;
  askingPrice: string;
  size: string;
  sizeUnit: string;
  floor: string;
  source: string;
  notes: string;
};

export type MatchOptionInput = {
  localityId: string;
  askingPrice: number;
  size: number | null;
  sizeUnit: MatchSizeUnit | null;
  floor: MatchFloor | null;
  source: MatchSource | null;
  notes: string | null;
};

export type MatchOptionErrors = Partial<Record<keyof MatchOptionFields | "form", string>>;

export function matchOptionFields(formData: FormData): MatchOptionFields {
  return {
    localityId: String(formData.get("locality_id") ?? ""),
    askingPrice: String(formData.get("asking_price") ?? ""),
    size: String(formData.get("size") ?? ""),
    sizeUnit: String(formData.get("size_unit") ?? ""),
    floor: String(formData.get("floor") ?? ""),
    source: String(formData.get("source") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

function positiveNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function validateMatchOption(
  fields: MatchOptionFields,
): { success: true; data: MatchOptionInput } | { success: false; errors: MatchOptionErrors } {
  const errors: MatchOptionErrors = {};
  const askingPrice = positiveNumber(fields.askingPrice);
  const size = fields.size.trim() ? positiveNumber(fields.size) : null;
  const sizeUnits = MATCH_SIZE_UNITS.map((item) => item.value) as string[];
  const floors = MATCH_FLOORS.map((item) => item.value) as string[];
  const sources = MATCH_SOURCES.map((item) => item.value) as string[];

  if (!fields.localityId) errors.localityId = "Select a location.";
  if (askingPrice === null) errors.askingPrice = "Enter a positive asking price in crore.";
  if (fields.size.trim() && size === null) errors.size = "Enter a positive size or leave it blank.";
  if (size !== null && !sizeUnits.includes(fields.sizeUnit)) errors.sizeUnit = "Select a size unit.";
  if (fields.floor && !floors.includes(fields.floor)) errors.floor = "Select a valid floor.";
  if (fields.source && !sources.includes(fields.source)) errors.source = "Select a valid source.";
  if (fields.notes.trim().length > 500) errors.notes = "Keep notes to 500 characters or fewer.";

  if (Object.keys(errors).length > 0) return { success: false, errors };
  return {
    success: true,
    data: {
      localityId: fields.localityId,
      askingPrice: askingPrice!,
      size,
      sizeUnit: size === null ? null : fields.sizeUnit as MatchSizeUnit,
      floor: fields.floor ? fields.floor as MatchFloor : null,
      source: fields.source ? fields.source as MatchSource : null,
      notes: fields.notes.trim() || null,
    },
  };
}
