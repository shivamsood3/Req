import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = { title: "Request received" };

export default function RequestAccessThanksPage() {
  return (
    <AuthCard eyebrow="Request received" title="Thanks for signing up.">
      <p className="supporting-copy">
        Your REQ account request is pending approval. We’ll email you once your account is approved.
      </p>
      <Link className="primary-button" href="/">
        Back to Live Market
      </Link>
      <p className="auth-footnote">
        Already approved? <Link href="/login">Sign in</Link>
      </p>
    </AuthCard>
  );
}
