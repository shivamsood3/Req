import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MatchOptionForm } from "@/components/match-option-form";
import { requireApprovedBroker } from "@/lib/auth";
import { getActiveLocalities, getBrokerRequirement, getOwnResponse } from "@/lib/data";

export const metadata: Metadata = { title: "Submit Match" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SubmitMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await requireApprovedBroker();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [requirement, localities, ownResponse] = await Promise.all([
    getBrokerRequirement(id),
    getActiveLocalities(),
    getOwnResponse(id),
  ]);
  if (!requirement || requirement.brokerId === user.id) notFound();
  if (ownResponse?.activeOptionCount === 3) redirect(`/requirements/${id}/my-response?limit=1`);

  return (
    <AppShell profile={profile} activeNav="home">
      <section className="match-page">
        <Link className="detail-back" href={ownResponse ? `/requirements/${id}/my-response` : `/requirements/${id}`}>
          ← {ownResponse ? "Your response" : "View REQ"}
        </Link>
        <p className="post-kicker">Submit Match</p>
        <h1>{ownResponse ? "Add another option." : "Share a relevant option."}</h1>
        <div className="match-context">
          <span>For</span>
          <strong>{requirement.localityNames.join(" + ")} · {requirement.budgetLabel}</strong>
        </div>
        {ownResponse ? <p className="option-usage">{ownResponse.activeOptionCount} of 3 options used</p> : null}
        <MatchOptionForm requirementId={id} localities={localities} />
      </section>
    </AppShell>
  );
}
