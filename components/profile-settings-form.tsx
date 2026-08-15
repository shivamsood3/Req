"use client";

import { useActionState, useState } from "react";
import type { ActionState, BrokerProfile } from "@/lib/types";
import { deleteOwnAccount, updateProfile } from "@/app/profile/actions";

const initialState: ActionState = {};

export function ProfileSettingsForm({ profile }: { profile: BrokerProfile }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <form className="form-stack profile-form" action={action}>
        <div className="field-group">
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" autoComplete="name" defaultValue={profile.full_name ?? ""} required minLength={2} />
        </div>
        <div className="field-group">
          <label htmlFor="company_name">Company / brokerage</label>
          <input id="company_name" name="company_name" autoComplete="organization" defaultValue={profile.company_name ?? ""} required minLength={2} />
        </div>
        <div className="field-group">
          <label htmlFor="mobile">Mobile number</label>
          <input id="mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" defaultValue={profile.mobile ?? ""} required pattern="[+0-9 ()-]{8,18}" />
        </div>
        <div className="field-group">
          <label htmlFor="primary_market">Primary market</label>
          <input id="primary_market" name="primary_market" defaultValue={profile.primary_market ?? "South Delhi"} required minLength={2} />
        </div>
        <div className="field-group">
          <label htmlFor="rera_number">RERA number <span>Optional</span></label>
          <input id="rera_number" name="rera_number" defaultValue={profile.rera_number ?? ""} />
        </div>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        {state.success ? <p className="requirement-created" role="status">{state.success}</p> : null}
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>

      <section className="danger-zone">
        <button className="reject-button" type="button" onClick={() => setConfirming((value) => !value)}>
          Delete account
        </button>
        {confirming ? (
          <form action={deleteOwnAccount} className="delete-form">
            <h2>Delete your REQ account?</h2>
            <p>You will lose access to REQ. Some transaction and safety records may be retained where required.</p>
            <label>
              Type DELETE ACCOUNT to confirm
              <input name="confirmation" required pattern="DELETE ACCOUNT" />
            </label>
            <div className="review-actions">
              <button className="reject-button" type="submit">Delete account</button>
              <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          </form>
        ) : null}
      </section>
    </>
  );
}
