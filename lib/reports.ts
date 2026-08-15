import { createClient } from "./supabase/server";
import type { ReportReason, ReportStatus } from "./types";

export type OwnReport = {
  id: string;
  reason: ReportReason;
  notes: string | null;
  status: ReportStatus;
  createdAt: string;
};

type OwnReportRow = {
  id: string;
  reason: ReportReason;
  notes: string | null;
  status: ReportStatus;
  created_at: string;
};

export async function getOwnOpenReport(requirementId: string): Promise<OwnReport | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_own_open_report_for_requirement", {
    p_requirement_id: requirementId,
  });
  if (error) return null;
  const row = (data?.[0] as OwnReportRow | undefined) ?? null;
  return row
    ? {
        id: row.id,
        reason: row.reason,
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
      }
    : null;
}
