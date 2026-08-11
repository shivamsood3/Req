"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MagicLinkForm({ intent }: { intent: "request" | "login" }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("Sign-in is not configured yet. Add the Supabase environment variables to continue.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: intent === "request",
      },
    });

    if (signInError) setError(signInError.message);
    else setMessage(`Magic link sent to ${email.trim()}. You can close this page.`);
    setLoading(false);
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label htmlFor="email">Email address</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@brokerage.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-success" role="status">{message}</p> : null}
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
