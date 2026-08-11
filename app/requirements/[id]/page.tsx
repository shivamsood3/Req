import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OwnerLifecycleActions } from "@/components/owner-lifecycle-actions";
import { requireApprovedBroker } from "@/lib/auth";
import { getBrokerRequirement, getOwnRequirement } from "@/lib/data";
import {
  formatExpiry,
  formatHistoryTiming,
  formatRequirementActivity,
  formatResponseCount,
  isExpiring,
  requestTimestamp,
} from "@/lib/requirement-format";
import type { OwnerRequirement } from "@/lib/types";

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

function isOwnerRequirement(requirement: object): requirement is OwnerRequirement {
  return "effectiveStatus" in requirement;
}

export default async function RequirementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string | string[]; updated?: string | string[]; renewed?: string | string[] }>;
}) {
  const { user, profile } = await requireApprovedBroker();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const ownRequirement = await getOwnRequirement(id);
  const requirement = ownRequirement ?? await getBrokerRequirement(id);
  if (!requirement) notFound();

  const generatedAt = requestTimestamp();
  const isOwn = requirement.brokerId === user.id;
  const query = await searchParams;
  const created = query.created === "1" && isOwn;
  const updated = query.updated === "1" && isOwn;
  const renewed = query.renewed === "1" && isOwn;
  const ownerItem = isOwnerRequirement(requirement) ? requirement : null;
  const effectiveStatus = ownerItem?.effectiveStatus ?? "live";
  const expiring = effectiveStatus === "live" && isExpiring(requirement.expiresAt, generatedAt);
  const statusTiming = effectiveStatus === "live"
    ? formatRequirementActivity(requirement.liveSince, requirement.updatedAt, generatedAt)
    : formatHistoryTiming(
        effectiveStatus,
        effectiveStatus === "closed" ? ownerItem?.closedAt ?? requirement.updatedAt : requirement.expiresAt,
        generatedAt,
      );

  return (
    <AppShell profile={profile} activeNav={isOwn ? "my-reqs" : "home"}>
      <article className="requirement-detail">
        <Link className="detail-back" href={isOwn ? "/my-reqs" : "/home"}>
          ← {isOwn ? "My REQs" : "Live Market"}
        </Link>

        {created ? <p className="requirement-created" role="status">Your REQ is live</p> : null}
        {updated ? <p className="requirement-created" role="status">REQ updated</p> : null}
        {renewed ? <p className="requirement-created" role="status">REQ renewed for 7 days</p> : null}

        <div className="detail-status">
          <span className={effectiveStatus === "live" ? "live-copy" : undefined}>{effectiveStatus.toUpperCase()}</span>
          <span aria-hidden="true">·</span>
          <span>{statusTiming}</span>
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
          {effectiveStatus === "live" ? <p>{formatExpiry(requirement.expiresAt, generatedAt)}</p> : null}
        </div>

        {isOwn && ownerItem ? (
          <div className="detail-owner-actions">
            <OwnerLifecycleActions
              requirementId={requirement.id}
              status={ownerItem.effectiveStatus}
              expiring={expiring}
            />
            {effectiveStatus !== "live" ? <Link className="detail-primary-action" href={`/requirements/${id}/matches`}>View matches</Link> : null}
          </div>
        ) : (
          <Link className="detail-primary-action" href={requirement.ownActiveOptionCount > 0 ? `/requirements/${id}/my-response` : `/requirements/${id}/match`}>
            {requirement.ownActiveOptionCount > 0
              ? `View your response · ${requirement.ownActiveOptionCount} ${requirement.ownActiveOptionCount === 1 ? "option" : "options"} sent`
              : "I have a match"}
          </Link>
        )}
      </article>
    </AppShell>
  );
}
