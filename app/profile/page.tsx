import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { NotificationPrompt } from "@/components/notification-prompt";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { requireApprovedBroker } from "@/lib/auth";
import { getProfileStats } from "@/lib/profile";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile } = await requireApprovedBroker();
  const stats = await getProfileStats();

  return (
    <AppShell profile={profile} activeNav={null}>
      <section className="settings-page">
        <Link className="detail-back" href="/home">← Home</Link>
        <p className="app-kicker">Broker profile</p>
        <h1 className="app-title">{profile.full_name}</h1>
        <div className="settings-panel">
          <div>
            <p className="settings-label">Brokerage</p>
            <h2>{profile.company_name}</h2>
            <p>{profile.primary_market} · {profile.email}</p>
            <p>Member since {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(profile.created_at))}</p>
          </div>
        </div>
        <div className="admin-status-grid">
          <p><strong>{stats.reqsPosted}</strong><span>REQs posted</span></p>
          <p><strong>{stats.matchesSubmitted}</strong><span>Matches submitted</span></p>
        </div>
        <section className="settings-panel">
          <div>
            <p className="settings-label">Edit profile</p>
            <h2>Keep your contact details current.</h2>
          </div>
          <ProfileSettingsForm profile={profile} />
        </section>
        <NotificationPrompt variant="settings" />
        <section className="settings-panel">
          <div>
            <p className="settings-label">Settings</p>
            <h2>Account</h2>
            <p><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p>
          </div>
          <form action={signOut}>
            <button className="secondary-button" type="submit">Sign out</button>
          </form>
        </section>
      </section>
    </AppShell>
  );
}
