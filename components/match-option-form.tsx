"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitMatch, type MatchActionState } from "@/app/requirements/[id]/match/actions";
import { updateMatch } from "@/app/requirements/[id]/my-response/[matchId]/edit/actions";
import {
  MATCH_FLOORS,
  MATCH_SIZE_UNITS,
  MATCH_SOURCES,
  type MatchOptionFields,
} from "@/lib/match-option";
import type { LocalityOption } from "@/lib/types";

const initialState: MatchActionState = {};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="field-error" role="alert">{message}</p> : null;
}

export function MatchOptionForm({
  requirementId,
  localities,
  mode = "create",
  matchId,
  initialValues,
}: {
  requirementId: string;
  localities: LocalityOption[];
  mode?: "create" | "edit";
  matchId?: string;
  initialValues?: MatchOptionFields;
}) {
  const action = mode === "edit" ? updateMatch : submitMatch;
  const [state, formAction, pending] = useActionState(
    action,
    initialValues ? { values: initialValues } : initialState,
  );
  const values = state.values ?? initialValues;
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!pending) submittingRef.current = false;
  }, [pending, state]);

  return (
    <form
      className="match-form"
      action={formAction}
      key={values ? JSON.stringify(values) : "initial"}
      onSubmit={(event) => {
        if (submittingRef.current) event.preventDefault();
        else submittingRef.current = true;
      }}
    >
      <input name="requirement_id" type="hidden" value={requirementId} />
      {matchId ? <input name="match_id" type="hidden" value={matchId} /> : null}
      {state.errors?.form ? <p className="form-error" role="alert">{state.errors.form}</p> : null}

      <div className="match-field">
        <label htmlFor="match-locality">Location <span>*</span></label>
        <select id="match-locality" name="locality_id" required defaultValue={values?.localityId ?? ""}>
          <option value="">Select a South Delhi locality</option>
          {localities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}</option>)}
        </select>
        <FieldError message={state.errors?.localityId} />
      </div>

      <div className="match-field">
        <label htmlFor="asking-price">Asking price <span>*</span></label>
        <div className="match-price-input">
          <span>₹</span>
          <input id="asking-price" name="asking_price" type="number" min="0.01" step="0.01" inputMode="decimal" required defaultValue={values?.askingPrice ?? ""} />
          <span>Cr</span>
        </div>
        <FieldError message={state.errors?.askingPrice} />
      </div>

      <div className="match-field">
        <label htmlFor="match-size">Size <small>Optional</small></label>
        <div className="match-size-input">
          <input id="match-size" name="size" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={values?.size ?? ""} />
          <select aria-label="Size unit" name="size_unit" defaultValue={values?.sizeUnit || "sq yd"}>
            {MATCH_SIZE_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
          </select>
        </div>
        <FieldError message={state.errors?.size} />
        <FieldError message={state.errors?.sizeUnit} />
      </div>

      <div className="match-field">
        <label htmlFor="match-floor">Floor <small>Optional</small></label>
        <select id="match-floor" name="floor" defaultValue={values?.floor ?? ""}>
          <option value="">Not specified</option>
          {MATCH_FLOORS.map((floor) => <option key={floor.value} value={floor.value}>{floor.label}</option>)}
        </select>
        <FieldError message={state.errors?.floor} />
      </div>

      <div className="match-field">
        <label htmlFor="match-source">Source <small>Optional</small></label>
        <select id="match-source" name="source" defaultValue={values?.source ?? ""}>
          <option value="">Not specified</option>
          {MATCH_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
        </select>
        <FieldError message={state.errors?.source} />
      </div>

      <div className="match-field notes-field">
        <label htmlFor="match-notes">Notes <small>Optional</small></label>
        <textarea id="match-notes" name="notes" rows={4} maxLength={500} defaultValue={values?.notes ?? ""} />
        <p className="notes-help">Do not include owner/buyer phone numbers or private personal information.</p>
        <FieldError message={state.errors?.notes} />
      </div>

      <div className="match-submit-bar">
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save match" : "Submit match"}
        </button>
      </div>
    </form>
  );
}
