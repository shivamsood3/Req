"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeAuthError, validatePasswordPair } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "./password-field";

export function ResetPasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
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
      setError("Password reset is not configured yet. Add the Supabase environment variables to continue.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Open the latest password reset link from your email, then choose a new password.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(normalizeAuthError(updateError.message, "Couldn’t update your password. Try again."));
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?updated=password");
    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <PasswordField id="password" name="password" label="New password" autoComplete="new-password" />
      <PasswordField
        id="confirm_password"
        name="confirm_password"
        label="Confirm password"
        autoComplete="new-password"
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </button>
      <Link className="inline-auth-link" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
