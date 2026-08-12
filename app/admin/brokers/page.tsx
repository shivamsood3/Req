import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { BrokerProfile } from "@/lib/types";
import { reviewBroker } from "./actions";

export const metadata: Metadata = { title: "Broker approvals" };

const statusLabels = {
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
  rejected: "Rejected",
} as const;

export default async function BrokerApprovalsPage() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("role", "broker")
        .order("created_at", { ascending: false })
    : { data: [] };
  const brokers = (data ?? []) as BrokerProfile[];

  return (
    <>
      <div className="admin-heading">
        <div><h1>Broker admin</h1><p>Toggle broker access without opening Supabase Studio.</p></div>
      </div>
      <div className="broker-table">
        {brokers.length ? (
          <table>
            <thead><tr><th>Broker</th><th>Contact</th><th>Market</th><th>Status</th><th>Requested</th><th>Access</th></tr></thead>
            <tbody>
              {brokers.map((broker) => (
                <tr key={broker.id}>
                  <td><div className="broker-name">{broker.full_name || "Profile incomplete"}</div><div className="broker-sub">{broker.company_name || "—"}</div></td>
                  <td>{broker.email}<div className="broker-sub">{broker.mobile || "—"}</div></td>
                  <td>{broker.primary_market || "—"}<div className="broker-sub">RERA {broker.rera_number || "—"}</div></td>
                  <td><span className={`status-pill status-${broker.status}`}>{statusLabels[broker.status]}</span></td>
                  <td>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(broker.created_at))}</td>
                  <td>
                    <form action={reviewBroker} className="review-actions">
                      <input type="hidden" name="broker_id" value={broker.id} />
                      <button className="approve-button" name="decision" value="approved" type="submit" disabled={broker.status === "approved"}>Approve</button>
                      <button className="pending-button" name="decision" value="pending" type="submit" disabled={broker.status === "pending"}>Pending</button>
                      <button className="suspend-button" name="decision" value="suspended" type="submit" disabled={broker.status === "suspended"}>Suspend</button>
                      <button className="reject-button" name="decision" value="rejected" type="submit" disabled={broker.status === "rejected"}>Reject</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No broker profiles yet.</div>}
      </div>
    </>
  );
}
