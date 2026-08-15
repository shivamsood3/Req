"use client";

import { useActionState, useState } from "react";
import { REPORT_REASONS } from "@/lib/report-reasons";
import type { ActionState } from "@/lib/types";
import { submitRequirementReport } from "@/app/requirements/[id]/report/actions";

const initialState: ActionState = {};

export function ReportRequirementForm({
  requirementId,
  alreadyReported,
}: {
  requirementId: string;
  alreadyReported: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitRequirementReport, initialState);

  if (alreadyReported || state.success) {
    return (
      <p className="report-submitted" role="status">
        Report submitted. Admin will review it.
      </p>
    );
  }

  return (
    <details className="report-menu" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary aria-label="Open requirement actions">•••</summary>
      <form action={action} className="report-form">
        <input type="hidden" name="requirement_id" value={requirementId} />
        <h2>Report this REQ</h2>
        <label>
          Reason
          <select name="reason" required defaultValue="">
            <option value="" disabled>Select a reason</option>
            {REPORT_REASONS.map((reason) => (
              <option value={reason.value} key={reason.value}>{reason.label}</option>
            ))}
          </select>
        </label>
        <label>
          Notes <span>Optional</span>
          <textarea name="notes" maxLength={500} rows={4} placeholder="Add concise context for admin review." />
        </label>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </details>
  );
}
