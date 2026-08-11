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
  locality: string;
  localitySlug: string;
  propertyType: string;
  budgetLabel: string;
  sizeLabel: string;
  floorPreference: string | null;
  responseCount: number;
  liveSince: string;
};

export type ActionState = {
  error?: string;
  success?: string;
};
