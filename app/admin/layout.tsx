import Link from "next/link";
import { signOut } from "@/app/actions";
import { Brand } from "@/components/brand";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Brand href="/admin" />
        <nav aria-label="Admin navigation">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/brokers">Broker approvals</Link>
          <Link href="/admin/reports">Reports</Link>
          <Link href="/admin/requirements">REQs</Link>
          <Link href="/admin/localities">Localities</Link>
          <form action={signOut}>
            <button className="admin-signout" type="submit">Sign out</button>
          </form>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
