"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  withdrawMatch,
  type WithdrawActionState,
} from "@/app/requirements/[id]/my-response/actions";

const initialState: WithdrawActionState = {};

export function MatchOptionActions({ requirementId, matchId }: { requirementId: string; matchId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(withdrawMatch, initialState);
  return (
    <div className="match-option-actions">
      <Link href={`/requirements/${requirementId}/my-response/${matchId}/edit`}>Edit</Link>
      <button type="button" onClick={() => setConfirming(true)}>Withdraw</button>
      {confirming ? (
        <div className="sheet-backdrop" role="presentation">
          <button className="sheet-dismiss" type="button" onClick={() => setConfirming(false)} aria-label="Cancel withdrawing match" />
          <section className="auth-sheet close-sheet" role="dialog" aria-modal="true" aria-labelledby={`withdraw-${matchId}`}>
            <div className="sheet-handle" />
            <h2 id={`withdraw-${matchId}`}>Withdraw this match?</h2>
            <p className="sheet-copy">It will no longer be shown to the REQ owner.</p>
            {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
            <form action={action} className="close-sheet-actions">
              <input type="hidden" name="requirement_id" value={requirementId} />
              <input type="hidden" name="match_id" value={matchId} />
              <button className="danger-button" type="submit" disabled={pending}>{pending ? "Withdrawing…" : "Withdraw"}</button>
              <button className="secondary-button" type="button" onClick={() => setConfirming(false)}>Cancel</button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
