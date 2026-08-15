import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <header className="topbar">
        <Brand />
        <Link className="text-button" href="/">Live Market</Link>
      </header>
      <article className="legal-page">
        <p className="app-kicker">REQ V0</p>
        <h1>Privacy</h1>
        <p>REQ is a private broker pilot. We collect only the account, profile, REQ, match, connection, notification and moderation data needed to run the product.</p>
        <h2>Public previews</h2>
        <p>Logged-out visitors may see safe anonymized REQ previews: location, budget, property type, broad preferences, freshness and response count. They do not see broker identity or contact details.</p>
        <h2>Connected phone sharing</h2>
        <p>Mobile numbers are revealed only after the REQ owner deliberately connects with a responding broker.</p>
        <h2>Notifications</h2>
        <p>Browser push is optional. Push payloads are short and avoid private notes, phone numbers and email addresses.</p>
        <h2>Reports and moderation</h2>
        <p>Reports are visible to the reporter and admins. Reported brokers are not automatically notified in V0.</p>
        <h2>Deletion</h2>
        <p>Account deletion revokes access, anonymizes profile fields where feasible, closes live REQs and preserves minimum relational records needed for safety and integrity.</p>
        <p className="broker-sub">Pilot legal documents should be counsel-reviewed before a larger launch.</p>
      </article>
    </main>
  );
}
