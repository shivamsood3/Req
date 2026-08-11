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
  name: string;
  slug: string;
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
