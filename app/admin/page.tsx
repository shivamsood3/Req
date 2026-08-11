import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { count } = supabase
    ? await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending")
    : { count: 0 };

  return (
    <>
      <div className="admin-heading">
        <div><h1>Admin</h1><p>Build 0 access operations.</p></div>
      </div>
      <section className="admin-placeholder">
        <h2>{count ?? 0} broker{count === 1 ? "" : "s"} awaiting review</h2>
        <p><Link href="/admin/brokers"><strong>Open broker approvals →</strong></Link></p>
      </section>
    </>
  );
}
