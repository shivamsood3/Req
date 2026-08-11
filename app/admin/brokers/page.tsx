import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { BrokerProfile } from "@/lib/types";
import { reviewBroker } from "./actions";

export const metadata: Metadata = { title: "Broker approvals" };

export default async function BrokerApprovalsPage() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.from("profiles").select("*").eq("status", "pending").order("created_at", { ascending: true })
    : { data: [] };
  const brokers = (data ?? []) as BrokerProfile[];

  return (
    <>
      <div className="admin-heading">
        <div><h1>Broker approvals</h1><p>Review access requests before brokers can enter REQ.</p></div>
      </div>
      <div className="broker-table">
        {brokers.length ? (
          <table>
            <thead><tr><th>Broker</th><th>Contact</th><th>Market</th><th>RERA</th><th>Requested</th><th>Action</th></tr></thead>
            <tbody>
              {brokers.map((broker) => (
                <tr key={broker.id}>
                  <td><div className="broker-name">{broker.full_name || "Profile incomplete"}</div><div className="broker-sub">{broker.company_name || "—"}</div></td>
                  <td>{broker.email}<div className="broker-sub">{broker.mobile || "—"}</div></td>
                  <td>{broker.primary_market || "—"}</td>
                  <td>{broker.rera_number || "—"}</td>
                  <td>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(broker.created_at))}</td>
                  <td>
                    <form action={reviewBroker} className="review-actions">
                      <input type="hidden" name="broker_id" value={broker.id} />
                      <button className="approve-button" name="decision" value="approved" type="submit">Approve</button>
                      <button className="reject-button" name="decision" value="rejected" type="submit">Reject</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No pending brokers.</div>}
      </div>
    </>
  );
}
