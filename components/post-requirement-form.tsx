"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createRequirement, type CreateRequirementActionState } from "@/app/post/actions";
import { updateRequirement } from "@/app/requirements/[id]/edit/actions";
import {
  BUYER_TYPES,
  CREATE_PROPERTY_TYPES,
  FLOOR_PREFERENCES,
  SIZE_UNITS,
  URGENCIES,
} from "@/lib/create-requirement";
import type { CreateRequirementFields } from "@/lib/create-requirement";
import type { LocalityOption } from "@/lib/types";

const initialState: CreateRequirementActionState = {};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="field-error" role="alert">{message}</p> : null;
}

function ChoiceGroup({
  name,
  choices,
  required,
  selected,
}: {
  name: string;
  choices: ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
  selected?: string;
}) {
  return (
    <div className="choice-grid">
      {choices.map((choice, index) => (
        <label className="choice-chip" key={choice.value}>
          <input name={name} type="radio" value={choice.value} required={required && index === 0} defaultChecked={selected === choice.value} />
          <span>{choice.label}</span>
        </label>
      ))}
    </div>
  );
}

function RequirementForm({
  localities,
  mode,
  requirementId,
  initialValues,
}: {
  localities: LocalityOption[];
  mode: "post" | "edit";
  requirementId?: string;
  initialValues?: CreateRequirementFields;
}) {
  const action = mode === "edit" ? updateRequirement : createRequirement;
  const [state, formAction, pending] = useActionState(action, initialValues ? { values: initialValues } : initialState);
  const values = state.values ?? initialValues;
  const [locationRows, setLocationRows] = useState(initialValues?.localityIds.length ? initialValues.localityIds : [""]);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!pending) submittingRef.current = false;
  }, [pending, state]);

  function updateLocation(index: number, value: string) {
    setLocationRows((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  function addLocation() {
    setLocationRows((current) => current.length < localities.length ? [...current, ""] : current);
  }

  function removeLocation(index: number) {
    setLocationRows((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function preventDuplicateSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submittingRef.current) event.preventDefault();
    else submittingRef.current = true;
  }

  return (
    <form className="post-form" action={formAction} key={values ? JSON.stringify(values) : "initial"} onSubmit={preventDuplicateSubmit}>
      {requirementId ? <input name="requirement_id" type="hidden" value={requirementId} /> : null}
      {state.errors?.form ? <p className="form-error" role="alert">{state.errors.form}</p> : null}

      <fieldset className="post-fieldset">
        <legend>Location <span>*</span></legend>
        <div className="location-fields">
          {locationRows.map((selected, index) => (
            <div className="location-row" key={index}>
              <select
                aria-label={index === 0 ? "Location" : `Additional location ${index}`}
                name="locality_id"
                value={selected}
                onChange={(event) => updateLocation(index, event.target.value)}
                required={index === 0}
              >
                <option value="">Select a South Delhi locality</option>
                {localities.map((locality) => (
                  <option
                    disabled={locationRows.some((value, rowIndex) => rowIndex !== index && value === locality.id)}
                    key={locality.id}
                    value={locality.id}
                  >
                    {locality.name}
                  </option>
                ))}
              </select>
              {index > 0 ? (
                <button type="button" onClick={() => removeLocation(index)} aria-label={`Remove additional location ${index}`}>Remove</button>
              ) : null}
            </div>
          ))}
        </div>
        {locationRows.length < localities.length ? (
          <button className="add-location" type="button" onClick={addLocation}>+ Add another location</button>
        ) : null}
        <FieldError message={state.errors?.localityIds} />
      </fieldset>

      <fieldset className="post-fieldset">
        <legend>Property type <span>*</span></legend>
        <ChoiceGroup name="property_type" choices={CREATE_PROPERTY_TYPES} required selected={values?.propertyType} />
        <FieldError message={state.errors?.propertyType} />
      </fieldset>

      <fieldset className="post-fieldset">
        <legend>Budget <span>*</span></legend>
        <div className="range-fields budget-range">
          <label><span>₹</span><input name="budget_min" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="12" required defaultValue={values?.budgetMin} /><small>Cr</small></label>
          <b>to</b>
          <label><span>₹</span><input name="budget_max" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="15" required defaultValue={values?.budgetMax} /><small>Cr</small></label>
        </div>
        <FieldError message={state.errors?.budgetMin ?? state.errors?.budgetMax} />
      </fieldset>

      <fieldset className="post-fieldset">
        <legend>Size</legend>
        <div className="range-fields size-range">
          <input aria-label="Minimum size" name="size_min" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="325" defaultValue={values?.sizeMin} />
          <b>to</b>
          <input aria-label="Maximum size" name="size_max" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="500" defaultValue={values?.sizeMax} />
          <select aria-label="Size unit" name="size_unit" defaultValue={values?.sizeUnit || "sq yd"}>
            {SIZE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
        <FieldError message={state.errors?.sizeMin ?? state.errors?.sizeMax ?? state.errors?.sizeUnit} />
      </fieldset>

      <fieldset className="post-fieldset">
        <legend>Floor</legend>
        <ChoiceGroup name="floor_preference" choices={FLOOR_PREFERENCES.map((value) => ({ value, label: value }))} selected={values?.floorPreference} />
        <FieldError message={state.errors?.floorPreference} />
      </fieldset>

      <fieldset className="post-fieldset">
        <legend>Buyer type</legend>
        <ChoiceGroup name="buyer_type" choices={BUYER_TYPES.map((value) => ({ value, label: value }))} selected={values?.buyerType} />
        <FieldError message={state.errors?.buyerType} />
      </fieldset>

      <fieldset className="post-fieldset">
        <legend>Urgency</legend>
        <ChoiceGroup name="urgency" choices={URGENCIES.map((value) => ({ value, label: value }))} selected={values?.urgency} />
        <FieldError message={state.errors?.urgency} />
      </fieldset>

      <div className="post-fieldset notes-field">
        <label htmlFor="requirement-notes">Notes</label>
        <textarea id="requirement-notes" name="notes" maxLength={500} rows={5} placeholder="Anything useful for an approved broker evaluating the requirement." defaultValue={values?.notes} />
        <div className="notes-help"><span>Do not include phone numbers or private buyer information.</span><span>500 max</span></div>
        <FieldError message={state.errors?.notes} />
      </div>

      {mode === "post" ? (
        <div className="post-consent">
          <p>Your location, budget, property type, broad size, floor preference, freshness and response count will appear in the public preview.</p>
          <p>Your identity, contact details, buyer details and notes stay inside the approved broker network. By posting, you agree to publish that safe preview for 7 days.</p>
        </div>
      ) : (
        <div className="post-consent">
          <p>Safe preview fields update publicly. Editing does not move this REQ up the feed or extend its expiry.</p>
        </div>
      )}

      <div className="post-submit-bar">
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? (mode === "post" ? "Posting…" : "Saving…") : (mode === "post" ? "Post live" : "Save changes")}
        </button>
      </div>
    </form>
  );
}

export function PostRequirementForm({ localities }: { localities: LocalityOption[] }) {
  return <RequirementForm localities={localities} mode="post" />;
}

export function EditRequirementForm({
  localities,
  requirementId,
  initialValues,
}: {
  localities: LocalityOption[];
  requirementId: string;
  initialValues: CreateRequirementFields;
}) {
  return (
    <RequirementForm
      localities={localities}
      mode="edit"
      requirementId={requirementId}
      initialValues={initialValues}
    />
  );
}
