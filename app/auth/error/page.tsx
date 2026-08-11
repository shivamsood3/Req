import Link from "next/link";
import { AuthCard } from "@/components/auth-card";

export default function AuthErrorPage() {
  return (
    <AuthCard eyebrow="Sign-in issue" title="That link didn’t work">
      <p className="supporting-copy">The magic link may have expired or already been used. Request a fresh link to continue.</p>
      <Link className="primary-button" href="/login">Try again</Link>
    </AuthCard>
  );
}
