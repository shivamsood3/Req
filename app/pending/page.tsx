import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getSessionProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/auth-policy";
import { signOut } from "@/app/actions";

export const metadata: Metadata = { title: "Access pending" };
export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile || !isProfileComplete(profile)) redirect("/profile-setup");
  if (profile.status === "approved") redirect(profile.role === "admin" ? "/admin" : "/home");
  if (profile.status !== "pending") redirect("/access-suspended");

  return (
    <AuthCard eyebrow="Access requested" title="Your broker profile is pending approval.">
      <p className="supporting-copy">We’ll let you know once your account has been approved.</p>
      <div className="pending-details">
        <div className="pending-row"><span>Name</span><strong>{profile.full_name}</strong></div>
        <div className="pending-row"><span>Company</span><strong>{profile.company_name}</strong></div>
        <div className="pending-row"><span>Primary market</span><strong>{profile.primary_market}</strong></div>
      </div>
      <div className="pending-actions">
        <Link className="secondary-button" href="/profile-setup">Edit profile</Link>
        <form action={signOut}><button className="secondary-button" type="submit">Sign out</button></form>
      </div>
    </AuthCard>
  );
}
