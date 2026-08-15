import type {
  BuyerType,
  CreateRequirementInput,
  FloorPreference,
  PropertyTypeKey,
  SizeUnit,
  Urgency,
} from "./types.ts";

export const CREATE_PROPERTY_TYPES: ReadonlyArray<{ value: PropertyTypeKey; label: string }> = [
  { value: "floor", label: "Independent Floor" },
  { value: "house-plot", label: "House / Plot" },
  { value: "apartment", label: "Apartment" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
  { value: "other", label: "Other" },
];

export const SIZE_UNITS: readonly SizeUnit[] = ["sq yd", "sq ft", "acre"];
export const FLOOR_PREFERENCES: readonly FloorPreference[] = ["Ground", "First", "Second", "Third", "Top", "Any"];
export const BUYER_TYPES: readonly BuyerType[] = ["End User", "Developer", "Investor", "Corporate", "Other"];
export const URGENCIES: readonly Urgency[] = ["Immediate", "Active", "Flexible"];

export type CreateRequirementFields = {
  localityIds: string[];
  propertyType: string;
  budgetMin: string;
  budgetMax: string;
  sizeMin: string;
  sizeMax: string;
  sizeUnit: string;
  floorPreference: string;
  buyerType: string;
  urgency: string;
  notes: string;
};

export type CreateRequirementErrors = Partial<Record<keyof CreateRequirementFields | "form", string>>;

export type CreateRequirementValidation =
  | { success: true; data: CreateRequirementInput }
  | { success: false; errors: CreateRequirementErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalNumber(raw: string) {
  if (!raw.trim()) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : Number.NaN;
}

function isOneOf<T extends string>(value: string, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

export function validateCreateRequirement(fields: CreateRequirementFields): CreateRequirementValidation {
  const errors: CreateRequirementErrors = {};
  const submittedLocalityIds = fields.localityIds.map((id) => id.trim()).filter(Boolean);
  const localityIds = [...new Set(submittedLocalityIds)];
  const propertyTypes = CREATE_PROPERTY_TYPES.map(({ value }) => value);
  const budgetMin = optionalNumber(fields.budgetMin);
  const budgetMax = optionalNumber(fields.budgetMax);
  const sizeMin = optionalNumber(fields.sizeMin);
  const sizeMax = optionalNumber(fields.sizeMax);
  const notes = fields.notes.trim();

  if (localityIds.length === 0) errors.localityIds = "Select at least one location.";
  else if (localityIds.some((id) => !UUID.test(id))) errors.localityIds = "Select a valid location.";
  else if (localityIds.length !== submittedLocalityIds.length) errors.localityIds = "Select each location only once.";

  if (!isOneOf(fields.propertyType, propertyTypes)) errors.propertyType = "Select a property type.";

  if (budgetMin === null || Number.isNaN(budgetMin) || budgetMin <= 0) errors.budgetMin = "Enter a minimum budget above 0.";
  if (budgetMax === null || Number.isNaN(budgetMax) || budgetMax <= 0) errors.budgetMax = "Enter a maximum budget above 0.";
  if (budgetMin !== null && !Number.isNaN(budgetMin) && budgetMin > 1000) errors.budgetMin = "Enter a realistic budget.";
  if (budgetMax !== null && !Number.isNaN(budgetMax) && budgetMax > 1000) errors.budgetMax = "Enter a realistic budget.";
  if (budgetMin !== null && budgetMax !== null && !Number.isNaN(budgetMin) && !Number.isNaN(budgetMax) && budgetMax < budgetMin) {
    errors.budgetMax = "Maximum budget must be at least the minimum.";
  }

  if (sizeMin !== null && (Number.isNaN(sizeMin) || sizeMin <= 0)) errors.sizeMin = "Size must be above 0.";
  if (sizeMax !== null && (Number.isNaN(sizeMax) || sizeMax <= 0)) errors.sizeMax = "Size must be above 0.";
  if (sizeMin !== null && sizeMax !== null && !Number.isNaN(sizeMin) && !Number.isNaN(sizeMax) && sizeMax < sizeMin) {
    errors.sizeMax = "Maximum size must be at least the minimum.";
  }
  if ((sizeMin !== null || sizeMax !== null) && !isOneOf(fields.sizeUnit, SIZE_UNITS)) errors.sizeUnit = "Select a size unit.";
  if (fields.floorPreference && !isOneOf(fields.floorPreference, FLOOR_PREFERENCES)) errors.floorPreference = "Select a valid floor preference.";
  if (fields.buyerType && !isOneOf(fields.buyerType, BUYER_TYPES)) errors.buyerType = "Select a valid buyer type.";
  if (fields.urgency && !isOneOf(fields.urgency, URGENCIES)) errors.urgency = "Select a valid urgency.";
  if (notes.length > 500) errors.notes = "Keep notes to 500 characters or fewer.";

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return {
    success: true,
    data: {
      localityIds,
      propertyType: fields.propertyType as PropertyTypeKey,
      budgetMin: budgetMin as number,
      budgetMax: budgetMax as number,
      sizeMin,
      sizeMax,
      sizeUnit: sizeMin !== null || sizeMax !== null ? fields.sizeUnit as SizeUnit : null,
      floorPreference: fields.floorPreference ? fields.floorPreference as FloorPreference : null,
      buyerType: fields.buyerType ? fields.buyerType as BuyerType : null,
      urgency: fields.urgency ? fields.urgency as Urgency : null,
      notes: notes || null,
    },
  };
}

export function createRequirementFields(formData: FormData): CreateRequirementFields {
  const value = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    localityIds: formData.getAll("locality_id").map(String),
    propertyType: value("property_type"),
    budgetMin: value("budget_min"),
    budgetMax: value("budget_max"),
    sizeMin: value("size_min"),
    sizeMax: value("size_max"),
    sizeUnit: value("size_unit"),
    floorPreference: value("floor_preference"),
    buyerType: value("buyer_type"),
    urgency: value("urgency"),
    notes: value("notes"),
  };
}
