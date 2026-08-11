import Link from "next/link";
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

export function AppShell({ profile, children }: { profile: BrokerProfile; children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <header className="app-topbar">
        <Brand href="/home" />
        <div className="app-actions">
          <button type="button" aria-label="Notifications, coming in a future build" disabled className="bell-button">○</button>
          <span className="avatar" aria-label={`${profile.full_name} profile`}>{initials(profile.full_name)}</span>
        </div>
      </header>
      <main className="app-content">{children}</main>
      <nav className="bottom-nav" aria-label="Main navigation">
        <Link href="/home" className="nav-active"><span aria-hidden="true">⌂</span>Home</Link>
        <Link href="/post" aria-label="Post a REQ"><span className="nav-add">+</span></Link>
        <button type="button" disabled><span aria-hidden="true">▤</span>My REQs<small>Coming soon</small></button>
      </nav>
    </div>
  );
}
