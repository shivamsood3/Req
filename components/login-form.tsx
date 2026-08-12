"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeAuthError } from "@/lib/auth-errors";
import { resolvePostAuthRoute } from "@/lib/auth-policy";
import { createClient } from "@/lib/supabase/client";
import type { BrokerProfile } from "@/lib/types";
import { PasswordField } from "./password-field";

export function LoginForm({ successMessage }: { successMessage?: string }) {
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
    const supabase = createClient();

    if (!supabase) {
      setError("Sign-in is not configured yet. Add the Supabase environment variables to continue.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(normalizeAuthError(signInError.message, "Couldn’t sign you in. Try again."));
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = user
      ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      : { data: null };

    const route = resolvePostAuthRoute((data as BrokerProfile | null) ?? null);
    router.replace(route);
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
      <PasswordField id="password" name="password" label="Password" autoComplete="current-password" />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {successMessage ? <p className="form-success" role="status">{successMessage}</p> : null}
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <Link className="inline-auth-link" href="/forgot-password">
        Forgot password?
      </Link>
    </form>
  );
}
