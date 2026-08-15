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
  deleted_at?: string | null;
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
  sizeMin: number | null;
  sizeMax: number | null;
  sizeUnit: string | null;
  sizeLabel: string;
  floorPreference: string | null;
  responseCount: number;
  liveSince: string;
  updatedAt: string;
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
  ownActiveOptionCount: number;
  expiresAt: string;
};

export type RequirementStatus = "live" | "closed" | "expired";
export type EffectiveRequirementStatus = RequirementStatus;

export type OwnerRequirement = BrokerRequirement & {
  localityIds: string[];
  storedStatus: RequirementStatus;
  effectiveStatus: EffectiveRequirementStatus;
  createdAt: string;
  closedAt: string | null;
  renewalCount: number;
};

export type MatchStatus = "active" | "withdrawn";
export type MatchSizeUnit = "sq yd" | "sq ft" | "acre";
export type MatchFloor = "Ground" | "First" | "Second" | "Third" | "Top" | "Other";
export type MatchSource = "Direct" | "Through another broker" | "Prefer not to say";

export type MatchOption = {
  id: string;
  localityId: string;
  localityName: string;
  askingPrice: number;
  size: number | null;
  sizeUnit: MatchSizeUnit | null;
  floor: MatchFloor | null;
  source: MatchSource | null;
  notes: string | null;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
  withdrawnAt: string | null;
};

export type OwnResponse = {
  requirementId: string;
  requirementOwnerId: string;
  requirementOwnerName: string | null;
  requirementOwnerBrokerage: string | null;
  requirementOwnerMobile: string | null;
  connectionId: string | null;
  connectedAt: string | null;
  requirementLocalityNames: string[];
  propertyTypeKey: PropertyTypeKey;
  propertyType: string;
  budgetMin: number;
  budgetMax: number;
  budgetLabel: string;
  effectiveStatus: EffectiveRequirementStatus;
  expiresAt: string;
  responseId: string;
  activeOptionCount: number;
  withdrawnOptionCount: number;
  options: MatchOption[];
};

export type RespondedRequirement = {
  requirementId: string;
  localityNames: string[];
  propertyTypeKey: PropertyTypeKey;
  propertyType: string;
  budgetMin: number;
  budgetMax: number;
  budgetLabel: string;
  effectiveStatus: EffectiveRequirementStatus;
  activeOptionCount: number;
  withdrawnOptionCount: number;
  responseUpdatedAt: string;
  connectionId: string | null;
  connectedAt: string | null;
};

export type OwnerResponseGroup = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  respondentBrokerage: string | null;
  respondentMobile: string | null;
  connectionId: string | null;
  connectedAt: string | null;
  options: MatchOption[];
};

export type OwnerMatchInbox = {
  requirementId: string;
  requirementLocalityNames: string[];
  budgetMin: number;
  budgetMax: number;
  budgetLabel: string;
  effectiveStatus: EffectiveRequirementStatus;
  responses: OwnerResponseGroup[];
};

export type ActionState = {
  error?: string;
  success?: string;
};

export type ReportReason =
  | "fake_requirement"
  | "spam"
  | "misleading_information"
  | "inappropriate_conduct"
  | "other";

export type ReportStatus = "open" | "resolved" | "dismissed";
