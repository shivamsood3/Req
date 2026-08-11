import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireApprovedBroker } from "@/lib/auth";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function BrokerHomePage() {
  const { profile } = await requireApprovedBroker();
  return (
    <AppShell profile={profile}>
      <p className="app-kicker">Good to see you, {profile.full_name?.split(" ")[0]}</p>
      <h1 className="app-title">Live Market</h1>
      <div className="status-strip"><span className="live-dot" /> Your broker access is live</div>
      <section className="app-preview-card">
        <h2>REQ is ready for the next build</h2>
        <p>Your approved workspace is active. Posting requirements, matching inventory and connections are intentionally not available in Build 0.</p>
      </section>
    </AppShell>
  );
}
