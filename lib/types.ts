export type BrokerRole = "broker" | "admin";
export type BrokerStatus = "pending" | "approved" | "suspended" | "rejected";

export type BrokerProfile = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  mobile: string | null;
  primary_market: string | null;
  rera_number: string | null;
  role: BrokerRole;
  status: BrokerStatus;
  approved_at: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicRequirementPreview = {
  id: string;
  localityNames: string[];
  localitySlugs: string[];
  propertyTypeKey: PropertyTypeKey;
  propertyType: string;
  budgetMin: number;
  budgetMax: number;
  budgetLabel: string;
  sizeLabel: string;
  floorPreference: string | null;
  responseCount: number;
  liveSince: string;
};

export type PropertyTypeKey =
  | "floor"
  | "house-plot"
  | "apartment"
  | "commercial"
  | "land"
  | "other";

export type LocalityOption = {
  id: string;
  name: string;
  slug: string;
};

export type SizeUnit = "sq yd" | "sq ft" | "acre";
export type FloorPreference = "Ground" | "First" | "Second" | "Third" | "Top" | "Any";
export type BuyerType = "End User" | "Developer" | "Investor" | "Corporate" | "Other";
export type Urgency = "Immediate" | "Active" | "Flexible";

export type CreateRequirementInput = {
  localityIds: string[];
  propertyType: PropertyTypeKey;
  budgetMin: number;
  budgetMax: number;
  sizeMin: number | null;
  sizeMax: number | null;
  sizeUnit: SizeUnit | null;
  floorPreference: FloorPreference | null;
  buyerType: BuyerType | null;
  urgency: Urgency | null;
  notes: string | null;
};

export type BrokerRequirement = PublicRequirementPreview & {
  brokerId: string | null;
  brokerName: string | null;
  brokerage: string | null;
  buyerType: string | null;
  urgency: string | null;
  notes: string | null;
  expiresAt: string;
};

export type ActionState = {
  error?: string;
  success?: string;
};
