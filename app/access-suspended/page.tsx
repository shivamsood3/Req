import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getSessionProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AccessSuspendedPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.status === "approved") redirect(profile.role === "admin" ? "/admin" : "/home");
  if (profile?.status === "pending") redirect("/pending");

  const rejected = profile?.status === "rejected";
  return (
    <AuthCard eyebrow="Account access" title={rejected ? "Access request not approved" : "Access suspended"}>
      <p className="supporting-copy">
        {rejected
          ? "Your request for REQ access was not approved. Contact the REQ administrator if you believe this is an error."
          : "This account cannot currently access the broker application. Contact the REQ administrator for assistance."}
      </p>
      <form action={signOut}><button className="secondary-button" type="submit">Sign out</button></form>
    </AuthCard>
  );
}
