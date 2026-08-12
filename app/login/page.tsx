import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { getSessionProfile } from "@/lib/auth";
import { resolvePostAuthRoute } from "@/lib/auth-policy";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const { user, profile } = await getSessionProfile();
  if (user) redirect(resolvePostAuthRoute(profile));

  const params = await searchParams;
  const successMessage = params.updated === "password" ? "Password updated." : undefined;

  return (
    <AuthCard title="Welcome back">
      <LoginForm successMessage={successMessage} />
      <p className="auth-footnote">New to REQ? <Link href="/request-access">Request access</Link></p>
    </AuthCard>
  );
}
