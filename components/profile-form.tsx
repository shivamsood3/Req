"use client";

import { useActionState } from "react";
import type { ActionState, BrokerProfile } from "@/lib/types";
import { completeProfile } from "@/app/profile-setup/actions";

const initialState: ActionState = {};

export function ProfileForm({ profile }: { profile: BrokerProfile | null }) {
  const [state, action, pending] = useActionState(completeProfile, initialState);

  return (
    <form className="form-stack profile-form" action={action}>
      <div className="field-group">
        <label htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" autoComplete="name" defaultValue={profile?.full_name ?? ""} required minLength={2} />
      </div>
      <div className="field-group">
        <label htmlFor="company_name">Company / brokerage</label>
        <input id="company_name" name="company_name" autoComplete="organization" defaultValue={profile?.company_name ?? ""} required minLength={2} />
      </div>
      <div className="field-group">
        <label htmlFor="mobile">Mobile number</label>
        <input id="mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98XXX XXXXX" defaultValue={profile?.mobile ?? ""} required pattern="[+0-9 ()-]{8,18}" />
      </div>
      <div className="field-group">
        <label htmlFor="primary_market">Primary market</label>
        <input id="primary_market" name="primary_market" defaultValue={profile?.primary_market ?? "South Delhi"} required minLength={2} />
      </div>
      <div className="field-group">
        <label htmlFor="rera_number">RERA number <span>Optional</span></label>
        <input id="rera_number" name="rera_number" defaultValue={profile?.rera_number ?? ""} />
      </div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Request access"}
      </button>
    </form>
  );
}
