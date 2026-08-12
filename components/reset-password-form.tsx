"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeAuthError, validatePasswordPair } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "./password-field";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const supabase = createClient();
      if (!supabase) {
        if (active) {
          setError("Password reset is not configured yet. Add the Supabase environment variables to continue.");
          setReady(true);
        }
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      let sessionError = "";

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        sessionError = exchangeError?.message ?? "";
      } else if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        sessionError = verifyError?.message ?? "";
      } else if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          sessionError = setSessionError?.message ?? "";
        }
      }

      if (!active) return;

      if (sessionError) {
        setError(normalizeAuthError(sessionError, "Open the latest password reset link from your email, then choose a new password."));
      }

      if (code || tokenHash || window.location.hash) {
        window.history.replaceState({}, document.title, "/reset-password");
      }

      setReady(true);
    }

    prepareRecoverySession();
    return () => {
      active = false;
    };
  }, [searchParams]);

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
      <p className="supporting-copy">
        Open the latest password reset link from your email, then choose a new password.
      </p>
      <PasswordField id="password" name="password" label="New password" autoComplete="new-password" />
      <PasswordField
        id="confirm_password"
        name="confirm_password"
        label="Confirm password"
        autoComplete="new-password"
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={!ready || loading}>
        {!ready ? "Preparing…" : loading ? "Updating…" : "Update password"}
      </button>
      <Link className="inline-auth-link" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
