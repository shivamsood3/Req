"use client";

import { useActionState, useState } from "react";
import {
  connectToResponse,
  type ConnectActionState,
} from "@/app/requirements/[id]/matches/actions";

const initialState: ConnectActionState = {};

export function ConnectResponseAction({
  requirementId,
  respondingBrokerId,
  respondentName,
}: {
  requirementId: string;
  respondingBrokerId: string;
  respondentName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(connectToResponse, initialState);

  return (
    <>
      <button className="detail-primary-action" type="button" onClick={() => setConfirming(true)}>
        Connect
      </button>
      {confirming ? (
        <div className="sheet-backdrop" role="presentation">
          <button className="sheet-dismiss" type="button" onClick={() => setConfirming(false)} aria-label="Cancel connection" />
          <section className="auth-sheet close-sheet" role="dialog" aria-modal="true" aria-labelledby={`connect-${respondingBrokerId}`}>
            <div className="sheet-handle" />
            <h2 id={`connect-${respondingBrokerId}`}>Connect with {respondentName}?</h2>
            <p className="sheet-copy">Your registered mobile numbers will be shared with each other.</p>
            {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
            <form action={action} className="close-sheet-actions">
              <input type="hidden" name="requirement_id" value={requirementId} />
              <input type="hidden" name="responding_broker_id" value={respondingBrokerId} />
              <button className="primary-button" type="submit" disabled={pending}>
                {pending ? "Connecting…" : "Connect on WhatsApp"}
              </button>
              <button className="secondary-button" type="button" onClick={() => setConfirming(false)}>Cancel</button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
