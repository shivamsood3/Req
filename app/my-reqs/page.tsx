import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OwnerRequirementCard } from "@/components/owner-requirement-card";
import { RespondedRequirementCard } from "@/components/responded-requirement-card";
import { requireApprovedBroker } from "@/lib/auth";
import { getOwnRequirements, getRespondedRequirements } from "@/lib/data";
import { groupOwnRequirements } from "@/lib/requirement-lifecycle";
import { requestTimestamp } from "@/lib/requirement-format";

export const metadata: Metadata = { title: "My REQs" };
export const dynamic = "force-dynamic";

export default async function MyRequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; changed?: string | string[] }>;
}) {
  const { profile } = await requireApprovedBroker();
  const query = await searchParams;
  const activeTab = query.tab === "responded" ? "responded" : "posted";
  const generatedAt = requestTimestamp();
  const requirements = activeTab === "posted" ? await getOwnRequirements() : [];
  const respondedRequirements = activeTab === "responded" ? await getRespondedRequirements() : [];
  const groups = groupOwnRequirements(requirements, generatedAt);

  return (
    <AppShell profile={profile} activeNav="my-reqs">
      <section className="my-reqs-heading">
        <h1 className="app-title">My REQs</h1>
      </section>

      <nav className="req-tabs" aria-label="My REQs sections">
        <Link className={activeTab === "posted" ? "req-tab-active" : undefined} href="/my-reqs">Posted</Link>
        <Link className={activeTab === "responded" ? "req-tab-active" : undefined} href="/my-reqs?tab=responded">Responded</Link>
      </nav>

      {query.changed === "closed" ? <p className="requirement-created" role="status">REQ closed</p> : null}

      {activeTab === "responded" && respondedRequirements.length === 0 ? (
        <section className="app-empty-state my-reqs-empty">
          <h2>No responses sent yet.</h2>
          <p>REQs you respond to will appear here.</p>
        </section>
      ) : activeTab === "responded" ? (
        <section className="owner-card-list" aria-label="Responded requirements">
          {respondedRequirements.map((item) => <RespondedRequirementCard key={item.requirementId} requirement={item} />)}
        </section>
      ) : requirements.length === 0 ? (
        <section className="app-empty-state my-reqs-empty">
          <h2>You haven’t posted a REQ yet.</h2>
          <p>Have an active buyer?</p>
          <Link href="/post">Post a REQ</Link>
        </section>
      ) : (
        <div className="owner-groups">
          {groups.active.length > 0 ? (
            <section className="owner-group">
              <h2>Active</h2>
              <div className="owner-card-list">{groups.active.map((item) => <OwnerRequirementCard key={item.id} requirement={item} generatedAt={generatedAt} />)}</div>
            </section>
          ) : null}
          {groups.expiring.length > 0 ? (
            <section className="owner-group">
              <h2>Expiring</h2>
              <div className="owner-card-list">{groups.expiring.map((item) => <OwnerRequirementCard key={item.id} requirement={item} generatedAt={generatedAt} />)}</div>
            </section>
          ) : null}
          {groups.history.length > 0 ? (
            <section className="owner-group">
              <h2>History</h2>
              <div className="owner-card-list">{groups.history.map((item) => <OwnerRequirementCard key={item.id} requirement={item} generatedAt={generatedAt} />)}</div>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
