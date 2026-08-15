import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <header className="topbar">
        <Brand />
        <Link className="text-button" href="/">Live Market</Link>
      </header>
      <article className="legal-page">
        <p className="app-kicker">REQ V0</p>
        <h1>Terms</h1>
        <p>REQ is intended for approved property brokers participating in a private pilot.</p>
        <h2>Genuine requirements</h2>
        <p>Post only genuine buyer requirements and submit only responsible match options. You are responsible for the accuracy of what you share.</p>
        <h2>No guarantee</h2>
        <p>REQ helps brokers discover each other. It does not guarantee a transaction, exclusivity, payment, or that parties will not communicate outside REQ.</p>
        <h2>Misuse</h2>
        <p>Spam, fake requirements, misleading information, inappropriate conduct, or misuse may lead to reports, removal of REQs, suspension, or rejection.</p>
        <h2>V0 pilot</h2>
        <p>Features may change as the pilot teaches us what is useful. No post-V0 marketplace, CRM, chat, payment, or AI feature is implied by these terms.</p>
        <p className="broker-sub">Pilot legal documents should be counsel-reviewed before a larger launch.</p>
      </article>
    </main>
  );
}
