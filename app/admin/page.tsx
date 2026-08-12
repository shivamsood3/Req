import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { BrokerProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.from("profiles").select("status, role").eq("role", "broker")
    : { data: [] };
  const brokers = (data ?? []) as Pick<BrokerProfile, "status" | "role">[];
  const pending = brokers.filter((broker) => broker.status === "pending").length;
  const approved = brokers.filter((broker) => broker.status === "approved").length;
  const suspended = brokers.filter((broker) => broker.status === "suspended").length;
  const rejected = brokers.filter((broker) => broker.status === "rejected").length;

  return (
    <>
      <div className="admin-heading">
        <div><h1>Admin</h1><p>Basic access control for REQ brokers.</p></div>
      </div>
      <section className="admin-placeholder">
        <h2>{pending} broker{pending === 1 ? "" : "s"} awaiting review</h2>
        <div className="admin-status-grid">
          <p><strong>{approved}</strong><span>Approved</span></p>
          <p><strong>{pending}</strong><span>Pending</span></p>
          <p><strong>{suspended}</strong><span>Suspended</span></p>
          <p><strong>{rejected}</strong><span>Rejected</span></p>
        </div>
        <p><Link href="/admin/brokers"><strong>Open broker admin →</strong></Link></p>
      </section>
    </>
  );
}
