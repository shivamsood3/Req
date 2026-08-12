import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const { user } = await getSessionProfile();

  return (
    <AuthCard title="Choose a new password">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <>
          <p className="supporting-copy">
            Open the latest password reset link from your email, then choose a new password.
          </p>
          <Link className="primary-button" href="/forgot-password">
            Send reset link
          </Link>
        </>
      )}
    </AuthCard>
  );
}
