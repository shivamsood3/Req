"use client";

import Link from "next/link";
import { useState } from "react";
import { normalizeAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const supabase = createClient();

    if (!supabase) {
      setError("Password reset is not configured yet. Add the Supabase environment variables to continue.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(normalizeAuthError(resetError.message, "Couldn’t send the reset link. Try again."));
      setLoading(false);
      return;
    }

    setMessage("If this email has REQ access, a password reset link has been sent.");
    setLoading(false);
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <p className="supporting-copy">Enter your account email.</p>
      <div className="field-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="broker@email.com"
          required
        />
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-success" role="status">{message}</p> : null}
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <Link className="inline-auth-link" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
