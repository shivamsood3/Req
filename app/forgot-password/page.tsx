import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getSessionProfile } from "@/lib/auth";
import { resolvePostAuthRoute } from "@/lib/auth-policy";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const { user, profile } = await getSessionProfile();
  if (user) redirect(resolvePostAuthRoute(profile));

  return (
    <AuthCard title="Reset password">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
