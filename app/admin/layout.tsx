import Link from "next/link";
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
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
