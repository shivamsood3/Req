import { serializePublicPreview } from "./public-preview.ts";
import type { BrokerRequirement, PropertyTypeKey } from "./types.ts";

export type BrokerRequirementRow = {
  id: string;
  broker_id: string | null;
  broker_name: string | null;
  brokerage: string | null;
  locality_names: string[];
  locality_slugs: string[];
  property_type_key: PropertyTypeKey;
  budget_min: number | string;
  budget_max: number | string;
  size_min: number | string | null;
  size_max: number | string | null;
  size_unit: string | null;
  floor_preference: string | null;
  buyer_type: string | null;
  urgency: string | null;
  notes: string | null;
  response_count: number;
  live_since: string;
  updated_at: string;
  expires_at: string;
};

export function serializeBrokerRequirement(
  row: BrokerRequirementRow,
): BrokerRequirement {
  return {
    ...serializePublicPreview(row),
    brokerId: row.broker_id,
    brokerName: row.broker_name,
    brokerage: row.brokerage,
    buyerType: row.buyer_type,
    urgency: row.urgency,
    notes: row.notes,
    expiresAt: row.expires_at,
  };
}
