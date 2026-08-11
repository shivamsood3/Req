"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  closeOwnRequirement,
  renewOwnRequirement,
  type LifecycleActionState,
} from "@/app/my-reqs/actions";

const initialState: LifecycleActionState = {};

export function OwnerLifecycleActions({
  requirementId,
  status,
  expiring,
  includeView = false,
}: {
  requirementId: string;
  status: "live" | "closed" | "expired";
  expiring: boolean;
  includeView?: boolean;
}) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [closeState, closeAction, closePending] = useActionState(closeOwnRequirement, initialState);
  const [renewState, renewAction, renewPending] = useActionState(renewOwnRequirement, initialState);

  if (status !== "live") {
    return (
      <form action={renewAction} className="owner-action-form">
        <input type="hidden" name="requirement_id" value={requirementId} />
        {renewState.error ? <p className="field-error" role="alert">{renewState.error}</p> : null}
        <button className="owner-primary-action" type="submit" disabled={renewPending}>
          {renewPending ? "Making live…" : "Make live again"}
        </button>
      </form>
    );
  }

  return (
    <div className="owner-actions">
      {renewState.error ? <p className="field-error" role="alert">{renewState.error}</p> : null}
      {includeView ? <Link href={`/requirements/${requirementId}`}>View REQ</Link> : null}
      <Link href={`/requirements/${requirementId}/matches`}>View matches</Link>
      <Link href={`/requirements/${requirementId}/edit`}>Edit</Link>
      {expiring ? (
        <form action={renewAction}>
          <input type="hidden" name="requirement_id" value={requirementId} />
          <button type="submit" disabled={renewPending}>{renewPending ? "Renewing…" : "Keep live"}</button>
        </form>
      ) : null}
      <button className="close-trigger" type="button" onClick={() => setConfirmClose(true)}>Close REQ</button>

      {confirmClose ? (
        <div className="sheet-backdrop" role="presentation">
          <button className="sheet-dismiss" type="button" onClick={() => setConfirmClose(false)} aria-label="Cancel closing REQ" />
          <section className="auth-sheet close-sheet" role="dialog" aria-modal="true" aria-labelledby={`close-${requirementId}`}>
            <div className="sheet-handle" />
            <h2 id={`close-${requirementId}`}>Close this REQ?</h2>
            <p className="sheet-copy">It will leave the live feed and stop accepting new activity.</p>
            {closeState.error ? <p className="form-error" role="alert">{closeState.error}</p> : null}
            <form action={closeAction} className="close-sheet-actions">
              <input type="hidden" name="requirement_id" value={requirementId} />
              <button className="danger-button" type="submit" disabled={closePending}>{closePending ? "Closing…" : "Close REQ"}</button>
              <button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>Cancel</button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
