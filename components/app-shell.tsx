import Link from "next/link";
import { signOut } from "@/app/actions";
import { getUnreadNotificationCount } from "@/lib/notifications";
import type { BrokerProfile } from "@/lib/types";
import { Brand } from "./brand";

function initials(name: string | null) {
  return (name ?? "REQ")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export async function AppShell({
  profile,
  children,
  activeNav = "home",
}: {
  profile: BrokerProfile;
  children: React.ReactNode;
  activeNav?: "home" | "my-reqs" | null;
}) {
  const unreadCount = await getUnreadNotificationCount();

  return (
    <div className="app-frame">
      <header className="app-topbar">
        <Brand href="/home" />
        <div className="app-actions">
          <Link href="/notifications" aria-label={`${unreadCount} unread notifications`} className="bell-button">
            <span aria-hidden="true">○</span>
            {unreadCount > 0 ? <strong className="bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</strong> : null}
          </Link>
          <Link href="/profile" className="avatar" aria-label={`${profile.full_name} profile`}>
            {initials(profile.full_name)}
          </Link>
          <form action={signOut}>
            <button className="app-signout" type="submit">Sign out</button>
          </form>
        </div>
      </header>
      <main className="app-content">{children}</main>
      <nav className="bottom-nav" aria-label="Main navigation">
        <Link href="/home" className={activeNav === "home" ? "nav-active" : undefined}><span aria-hidden="true">⌂</span>Home</Link>
        <Link href="/post" aria-label="Post a REQ"><span className="nav-add">+</span></Link>
        <Link href="/my-reqs" className={activeNav === "my-reqs" ? "nav-active" : undefined}><span aria-hidden="true">▤</span>My REQs</Link>
      </nav>
      <footer className="legal-footer app-legal-footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
