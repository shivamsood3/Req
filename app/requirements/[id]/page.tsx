import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireApprovedBroker } from "@/lib/auth";
import { getBrokerRequirement } from "@/lib/data";
import {
  formatExpiry,
  formatFreshness,
  formatResponseCount,
  requestTimestamp,
} from "@/lib/requirement-format";

export const metadata: Metadata = { title: "Requirement" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function RequirementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string | string[] }>;
}) {
  const { user, profile } = await requireApprovedBroker();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const requirement = await getBrokerRequirement(id);
  if (!requirement) notFound();

  const generatedAt = requestTimestamp();
  const isOwn = requirement.brokerId === user.id;
  const created = (await searchParams).created === "1" && isOwn;

  return (
    <AppShell profile={profile}>
      <article className="requirement-detail">
        <Link className="detail-back" href="/home">← Live Market</Link>

        {created ? <p className="requirement-created" role="status">Your REQ is live</p> : null}

        <div className="detail-status">
          <span className="live-copy">LIVE</span>
          <span aria-hidden="true">·</span>
          <span>{formatFreshness(requirement.liveSince, generatedAt)}</span>
        </div>

        <section className="detail-hero">
          <p>{requirement.localityNames.join(" + ")}</p>
          <h1>{requirement.budgetLabel}</h1>
          <h2>{requirement.propertyType}</h2>
        </section>

        <dl className="detail-grid">
          <DetailRow label="Size" value={requirement.sizeLabel} />
          <DetailRow label="Floor" value={requirement.floorPreference} />
          <DetailRow label="Buyer type" value={requirement.buyerType} />
          <DetailRow label="Urgency" value={requirement.urgency} />
          <DetailRow label="Notes" value={requirement.notes} />
        </dl>

        <section className="posted-by">
          <p>Posted by</p>
          <h2>{requirement.brokerName ?? "Broker unavailable"}</h2>
          {requirement.brokerage ? <p>{requirement.brokerage}</p> : null}
        </section>

        <div className="detail-timing">
          <p>{formatResponseCount(requirement.responseCount)}</p>
          <p>{formatExpiry(requirement.expiresAt, generatedAt)}</p>
        </div>

        <button className="detail-future-action" type="button" disabled>
          {isOwn ? "View matches" : "I have a match"}
          <span>Available in a future build</span>
        </button>
      </article>
    </AppShell>
  );
}
