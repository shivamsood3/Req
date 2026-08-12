"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeAuthError, validatePasswordPair } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "./password-field";

export function RequestAccessForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");
    const passwordError = validatePasswordPair(password, confirmPassword);

    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Access requests are not configured yet. Add the Supabase environment variables to continue.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(normalizeAuthError(signUpError.message, "Couldn’t create your account. Try again."));
      setLoading(false);
      return;
    }

    if (data.session) await supabase.auth.signOut();
    router.replace("/request-access/thanks");
    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={submit}>
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
      <PasswordField id="password" name="password" label="Create password" autoComplete="new-password" />
      <PasswordField
        id="confirm_password"
        name="confirm_password"
        label="Confirm password"
        autoComplete="new-password"
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
      <p className="auth-footnote">
        Already a member? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
