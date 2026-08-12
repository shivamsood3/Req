import { formatBudgetRange, propertyTypeLabel } from "./requirement-format.ts";
import type {
  MatchFloor,
  MatchOption,
  MatchSizeUnit,
  MatchSource,
  MatchStatus,
  OwnResponse,
  OwnerMatchInbox,
  OwnerResponseGroup,
  PropertyTypeKey,
  RespondedRequirement,
  RequirementStatus,
} from "./types.ts";

export type OwnResponseRow = {
  requirement_id: string;
  requirement_owner_id: string;
  requirement_owner_name: string | null;
  requirement_owner_brokerage: string | null;
  requirement_owner_mobile: string | null;
  connection_id: string | null;
  connected_at: string | null;
  requirement_locality_names: string[];
  property_type_key: PropertyTypeKey;
  budget_min: number | string;
  budget_max: number | string;
  effective_status: RequirementStatus;
  expires_at: string;
  response_id: string;
  active_option_count: number;
  withdrawn_option_count: number;
  match_id: string;
  match_locality_id: string;
  match_locality_name: string;
  asking_price: number | string;
  match_size: number | string | null;
  match_size_unit: MatchSizeUnit | null;
  match_floor: MatchFloor | null;
  match_source: MatchSource | null;
  match_notes: string | null;
  match_status: MatchStatus;
  match_created_at: string;
  match_updated_at: string;
  withdrawn_at: string | null;
};

export type RespondedRequirementRow = {
  requirement_id: string;
  requirement_locality_names: string[];
  property_type_key: PropertyTypeKey;
  budget_min: number | string;
  budget_max: number | string;
  effective_status: RequirementStatus;
  active_option_count: number;
  withdrawn_option_count: number;
  response_updated_at: string;
  connection_id: string | null;
  connected_at: string | null;
};

export type OwnerResponseRow = {
  requirement_id: string;
  requirement_locality_names: string[];
  budget_min: number | string;
  budget_max: number | string;
  effective_status: RequirementStatus;
  response_id: string;
  respondent_id: string;
  respondent_name: string;
  respondent_brokerage: string | null;
  respondent_mobile: string | null;
  connection_id: string | null;
  connected_at: string | null;
  option_count: number;
  match_id: string | null;
  match_locality_name: string | null;
  asking_price: number | string | null;
  match_size: number | string | null;
  match_size_unit: MatchSizeUnit | null;
  match_floor: MatchFloor | null;
  match_source: MatchSource | null;
  match_notes: string | null;
  match_created_at: string | null;
};

function optionFromOwnRow(row: OwnResponseRow): MatchOption {
  return {
    id: row.match_id,
    localityId: row.match_locality_id,
    localityName: row.match_locality_name,
    askingPrice: Number(row.asking_price),
    size: row.match_size === null ? null : Number(row.match_size),
    sizeUnit: row.match_size_unit,
    floor: row.match_floor,
    source: row.match_source,
    notes: row.match_notes,
    status: row.match_status,
    createdAt: row.match_created_at,
    updatedAt: row.match_updated_at,
    withdrawnAt: row.withdrawn_at,
  };
}

export function serializeOwnResponse(rows: OwnResponseRow[]): OwnResponse | null {
  const first = rows[0];
  if (!first) return null;
  const budgetMin = Number(first.budget_min);
  const budgetMax = Number(first.budget_max);
  return {
    requirementId: first.requirement_id,
    requirementOwnerId: first.requirement_owner_id,
    requirementOwnerName: first.requirement_owner_name,
    requirementOwnerBrokerage: first.requirement_owner_brokerage,
    requirementOwnerMobile: first.requirement_owner_mobile,
    connectionId: first.connection_id,
    connectedAt: first.connected_at,
    requirementLocalityNames: first.requirement_locality_names,
    propertyTypeKey: first.property_type_key,
    propertyType: propertyTypeLabel(first.property_type_key),
    budgetMin,
    budgetMax,
    budgetLabel: formatBudgetRange(budgetMin, budgetMax),
    effectiveStatus: first.effective_status,
    expiresAt: first.expires_at,
    responseId: first.response_id,
    activeOptionCount: first.active_option_count,
    withdrawnOptionCount: first.withdrawn_option_count,
    options: rows.map(optionFromOwnRow),
  };
}

export function serializeRespondedRequirement(row: RespondedRequirementRow): RespondedRequirement {
  const budgetMin = Number(row.budget_min);
  const budgetMax = Number(row.budget_max);
  return {
    requirementId: row.requirement_id,
    localityNames: row.requirement_locality_names,
    propertyTypeKey: row.property_type_key,
    propertyType: propertyTypeLabel(row.property_type_key),
    budgetMin,
    budgetMax,
    budgetLabel: formatBudgetRange(budgetMin, budgetMax),
    effectiveStatus: row.effective_status,
    activeOptionCount: row.active_option_count,
    withdrawnOptionCount: row.withdrawn_option_count,
    responseUpdatedAt: row.response_updated_at,
    connectionId: row.connection_id,
    connectedAt: row.connected_at,
  };
}

export function serializeOwnerInbox(rows: OwnerResponseRow[]): OwnerMatchInbox | null {
  const first = rows[0];
  if (!first) return null;
  const groups = new Map<string, OwnerResponseGroup>();
  for (const row of rows) {
    const group = groups.get(row.response_id) ?? {
      responseId: row.response_id,
      respondentId: row.respondent_id,
      respondentName: row.respondent_name,
      respondentBrokerage: row.respondent_brokerage,
      respondentMobile: row.respondent_mobile,
      connectionId: row.connection_id,
      connectedAt: row.connected_at,
      options: [],
    };
    if (row.match_id && row.match_locality_name && row.asking_price !== null && row.match_created_at) {
      group.options.push({
        id: row.match_id,
        localityId: "",
        localityName: row.match_locality_name,
        askingPrice: Number(row.asking_price),
        size: row.match_size === null ? null : Number(row.match_size),
        sizeUnit: row.match_size_unit,
        floor: row.match_floor,
        source: row.match_source,
        notes: row.match_notes,
        status: "active",
        createdAt: row.match_created_at,
        updatedAt: row.match_created_at,
        withdrawnAt: null,
      });
    }
    groups.set(row.response_id, group);
  }
  const budgetMin = Number(first.budget_min);
  const budgetMax = Number(first.budget_max);
  return {
    requirementId: first.requirement_id,
    requirementLocalityNames: first.requirement_locality_names,
    budgetMin,
    budgetMax,
    budgetLabel: formatBudgetRange(budgetMin, budgetMax),
    effectiveStatus: first.effective_status,
    responses: [...groups.values()],
  };
}
