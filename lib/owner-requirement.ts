import { serializeBrokerRequirement, type BrokerRequirementRow } from "./broker-requirement.ts";
import type { OwnerRequirement, RequirementStatus } from "./types.ts";

export type OwnerRequirementRow = BrokerRequirementRow & {
  locality_ids: string[];
  stored_status: RequirementStatus;
  effective_status: RequirementStatus;
  created_at: string;
  closed_at: string | null;
  renewal_count: number;
};

export function serializeOwnerRequirement(row: OwnerRequirementRow): OwnerRequirement {
  return {
    ...serializeBrokerRequirement(row),
    localityIds: row.locality_ids,
    storedStatus: row.stored_status,
    effectiveStatus: row.effective_status,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    renewalCount: row.renewal_count,
  };
}
