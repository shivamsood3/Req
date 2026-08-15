import type { Metadata } from "next";
import Link from "next/link";
import { getAdminAnalytics } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

function percentage(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function minutes(value: number | null) {
  if (value === null) return "—";
  if (value < 60) return `${Math.round(value)} min`;
  return `${Math.round(value / 60)} hr`;
}

export default async function AdminPage() {
  const metrics = await getAdminAnalytics();

  return (
    <>
      <div className="admin-heading">
        <div><h1>Admin</h1><p>Basic access control for REQ brokers plus final V0 pilot metrics.</p></div>
      </div>
      {metrics ? (
        <>
          <section className="north-star">
            <p>North star</p>
            <h2>
              {metrics.weeklyActiveBrokers > 0 && metrics.weekConnections > 0
                ? `${metrics.northStarConnectionsPerWab ?? 0} connections / weekly active broker`
                : `${metrics.northStarReqsWithResponse} REQs with a broker response`}
            </h2>
            <span>Are brokers using REQ to discover each other?</span>
          </section>
          <section className="admin-status-grid">
            <p><strong>{metrics.approvedBrokers}</strong><span>Approved brokers</span></p>
            <p><strong>{metrics.pendingBrokers}</strong><span>Pending brokers</span></p>
            <p><strong>{metrics.weeklyActiveBrokers}</strong><span>Weekly active</span></p>
            <p><strong>{metrics.liveReqs}</strong><span>Live REQs</span></p>
            <p><strong>{percentage(metrics.matchRate)}</strong><span>Match rate</span></p>
            <p><strong>{percentage(metrics.connectionRate)}</strong><span>Connection rate</span></p>
            <p><strong>{minutes(metrics.medianMinutesToFirstResponse)}</strong><span>Median first response</span></p>
            <p><strong>{metrics.connectionsInitiated}</strong><span>Connections initiated</span></p>
          </section>
          <section className="admin-placeholder">
            <h2>This week</h2>
            <div className="admin-status-grid">
              <p><strong>{metrics.weekReqsPosted}</strong><span>REQs posted</span></p>
              <p><strong>{metrics.weekBrokersResponded}</strong><span>Brokers responded</span></p>
              <p><strong>{metrics.weekConnections}</strong><span>Connections</span></p>
              <p><strong>{metrics.reqsLast30d}</strong><span>REQs last 30 days</span></p>
              <p><strong>{metrics.matchOptionsSubmitted}</strong><span>Options submitted</span></p>
              <p><strong>{metrics.respondingBrokers}</strong><span>Responding brokers</span></p>
              <p><strong>{metrics.renewals}</strong><span>Renewals</span></p>
              <p><strong>{metrics.reqsWithResponse}</strong><span>REQs with response</span></p>
            </div>
          </section>
        </>
      ) : <section className="admin-placeholder"><h2>Analytics unavailable.</h2></section>}
      <section className="admin-links">
        <Link href="/admin/brokers">Broker admin →</Link>
        <Link href="/admin/reports">Reports →</Link>
        <Link href="/admin/requirements">REQs →</Link>
        <Link href="/admin/localities">Localities →</Link>
      </section>
    </>
  );
}
