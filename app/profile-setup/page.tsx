import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ProfileForm } from "@/components/profile-form";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Complete profile" };
export const dynamic = "force-dynamic";

export default async function ProfileSetupPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/request-access");

  return (
    <AuthCard eyebrow="Broker profile" title="Complete your profile">
      <p className="supporting-copy">These details help the REQ admin verify your broker access.</p>
      <ProfileForm profile={profile} />
    </AuthCard>
  );
}
