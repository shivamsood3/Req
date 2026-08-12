"use client";

import { useState } from "react";

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  minLength = 8,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field-group">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        <button
          className="field-toggle"
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
    </div>
  );
}
