import Link from "next/link";
import { AuthCard } from "@/components/auth-card";

export default function AuthErrorPage() {
  return (
    <AuthCard eyebrow="Sign-in issue" title="That link didn’t work">
      <p className="supporting-copy">The sign-in request may have expired. Try signing in again or request a new password reset link.</p>
      <Link className="primary-button" href="/login">Try again</Link>
    </AuthCard>
  );
}
