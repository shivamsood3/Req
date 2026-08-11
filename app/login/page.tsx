import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { MagicLinkForm } from "@/components/magic-link-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard eyebrow="Member access" title="Welcome back">
      <p className="supporting-copy">Enter your approved account email. No password required.</p>
      <MagicLinkForm intent="login" />
      <p className="auth-footnote">New to REQ? <Link href="/request-access">Request access</Link></p>
    </AuthCard>
  );
}
