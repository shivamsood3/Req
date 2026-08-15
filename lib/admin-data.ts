import { createClient } from "./supabase/server";
import { formatBudgetRange } from "./requirement-format";
import { reportReasonLabel } from "./report-reasons";

export type AdminAnalytics = {
  approvedBrokers: number;
  pendingBrokers: number;
  weeklyActiveBrokers: number;
  liveReqs: number;
  reqsLast7d: number;
  reqsLast30d: number;
  reqsPosted: number;
  reqsWithResponse: number;
  matchRate: number | null;
  connectionsInitiated: number;
  connectionRate: number | null;
  medianMinutesToFirstResponse: number | null;
  matchOptionsSubmitted: number;
  respondingBrokers: number;
  renewals: number;
  weekReqsPosted: number;
  weekBrokersResponded: number;
  weekConnections: number;
  northStarConnectionsPerWab: number | null;
  northStarReqsWithResponse: number;
};

type AdminAnalyticsRow = {
  approved_brokers: number;
  pending_brokers: number;
  weekly_active_brokers: number;
  live_reqs: number;
  reqs_last_7d: number;
  reqs_last_30d: number;
  reqs_posted: number;
  reqs_with_response: number;
  match_rate: number | string | null;
  connections_initiated: number;
  connection_rate: number | string | null;
  median_minutes_to_first_response: number | string | null;
  match_options_submitted: number;
  responding_brokers: number;
  renewals: number;
  week_reqs_posted: number;
  week_brokers_responded: number;
  week_connections: number;
  north_star_connections_per_wab: number | string | null;
  north_star_reqs_with_response: number;
};

export type AdminReport = {
  id: string;
  reason: string;
  reasonLabel: string;
  notes: string | null;
  status: string;
  adminAction: string | null;
  createdAt: string;
  resolvedAt: string | null;
  requirementId: string | null;
  requirementLabel: string;
  reportedBrokerId: string;
  reportedBrokerName: string | null;
  reportedBrokerage: string | null;
  reporterName: string | null;
  reporterBrokerage: string | null;
};

type AdminReportRow = {
  id: string;
  reason: string;
  notes: string | null;
  status: string;
  admin_action: string | null;
  created_at: string;
  resolved_at: string | null;
  requirement_id: string | null;
  requirement_label: string;
  reported_broker_id: string;
  reported_broker_name: string | null;
  reported_brokerage: string | null;
  reporter_name: string | null;
  reporter_brokerage: string | null;
};

export type AdminRequirement = {
  id: string;
  brokerId: string | null;
  brokerName: string | null;
  brokerage: string | null;
  localityNames: string[];
  budgetLabel: string;
  propertyType: string;
  storedStatus: string;
  effectiveStatus: string;
  createdAt: string;
  liveSince: string;
  expiresAt: string | null;
  responseCount: number;
};

type AdminRequirementRow = {
  id: string;
  broker_id: string | null;
  broker_name: string | null;
  brokerage: string | null;
  locality_names: string[] | null;
  budget_min: number | string;
  budget_max: number | string;
  property_type: string;
  stored_status: string;
  effective_status: string;
  created_at: string;
  live_since: string;
  expires_at: string | null;
  response_count: number;
};

export type AdminLocality = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  requirementCount: number;
};

type AdminLocalityRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  requirement_count: number;
};

function numberOrNull(value: number | string | null) {
  return value === null ? null : Number(value);
}

export async function getAdminAnalytics(): Promise<AdminAnalytics | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_admin_analytics");
  if (error) throw new Error("Unable to load admin analytics");
  const row = (data?.[0] as AdminAnalyticsRow | undefined) ?? null;
  if (!row) return null;
  return {
    approvedBrokers: row.approved_brokers,
    pendingBrokers: row.pending_brokers,
    weeklyActiveBrokers: row.weekly_active_brokers,
    liveReqs: row.live_reqs,
    reqsLast7d: row.reqs_last_7d,
    reqsLast30d: row.reqs_last_30d,
    reqsPosted: row.reqs_posted,
    reqsWithResponse: row.reqs_with_response,
    matchRate: numberOrNull(row.match_rate),
    connectionsInitiated: row.connections_initiated,
    connectionRate: numberOrNull(row.connection_rate),
    medianMinutesToFirstResponse: numberOrNull(row.median_minutes_to_first_response),
    matchOptionsSubmitted: row.match_options_submitted,
    respondingBrokers: row.responding_brokers,
    renewals: row.renewals,
    weekReqsPosted: row.week_reqs_posted,
    weekBrokersResponded: row.week_brokers_responded,
    weekConnections: row.week_connections,
    northStarConnectionsPerWab: numberOrNull(row.north_star_connections_per_wab),
    northStarReqsWithResponse: row.north_star_reqs_with_response,
  };
}

export async function getAdminReports(): Promise<AdminReport[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_admin_reports");
  if (error) throw new Error("Unable to load reports");
  return ((data ?? []) as AdminReportRow[]).map((row) => ({
    id: row.id,
    reason: row.reason,
    reasonLabel: reportReasonLabel(row.reason),
    notes: row.notes,
    status: row.status,
    adminAction: row.admin_action,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    requirementId: row.requirement_id,
    requirementLabel: row.requirement_label,
    reportedBrokerId: row.reported_broker_id,
    reportedBrokerName: row.reported_broker_name,
    reportedBrokerage: row.reported_brokerage,
    reporterName: row.reporter_name,
    reporterBrokerage: row.reporter_brokerage,
  }));
}

export async function getAdminRequirements(): Promise<AdminRequirement[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_admin_requirements");
  if (error) throw new Error("Unable to load requirements");
  return ((data ?? []) as AdminRequirementRow[]).map((row) => ({
    id: row.id,
    brokerId: row.broker_id,
    brokerName: row.broker_name,
    brokerage: row.brokerage,
    localityNames: row.locality_names ?? [],
    budgetLabel: formatBudgetRange(Number(row.budget_min), Number(row.budget_max)),
    propertyType: row.property_type,
    storedStatus: row.stored_status,
    effectiveStatus: row.effective_status,
    createdAt: row.created_at,
    liveSince: row.live_since,
    expiresAt: row.expires_at,
    responseCount: row.response_count,
  }));
}

export async function getAdminLocalities(): Promise<AdminLocality[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_admin_localities");
  if (error) throw new Error("Unable to load localities");
  return ((data ?? []) as AdminLocalityRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    requirementCount: row.requirement_count,
  }));
}
