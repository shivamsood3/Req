import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getSessionProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";

export const metadata: Metadata = { title: "Access pending" };
export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/request-access");
  if (profile.status === "approved") redirect(profile.role === "admin" ? "/admin" : "/home");
  if (profile.status !== "pending") redirect("/access-suspended");

  return (
    <AuthCard eyebrow="Access requested" title="Your account is pending approval.">
      <p className="supporting-copy">
        Thanks for signing up. We’ll email you once your REQ account is approved.
      </p>
      <div className="pending-actions">
        <form action={signOut}><button className="secondary-button" type="submit">Sign out</button></form>
      </div>
    </AuthCard>
  );
}
