import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { NotificationPrompt } from "@/components/notification-prompt";
import { requireApprovedBroker } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile } = await requireApprovedBroker();

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
            <p>{profile.primary_market}</p>
          </div>
        </div>
        <NotificationPrompt variant="settings" />
      </section>
    </AppShell>
  );
}
