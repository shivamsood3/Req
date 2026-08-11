import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { MagicLinkForm } from "@/components/magic-link-form";

export const metadata: Metadata = { title: "Request access" };

export default function RequestAccessPage() {
  return (
    <AuthCard eyebrow="Private broker network" title="Request access">
      <p className="supporting-copy">Use your work email. We’ll send a secure magic link to continue.</p>
      <MagicLinkForm intent="request" />
      <p className="auth-footnote">Already a member? <Link href="/login">Sign in</Link></p>
    </AuthCard>
  );
}
