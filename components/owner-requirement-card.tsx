import Link from "next/link";
import { OwnerLifecycleActions } from "./owner-lifecycle-actions";
import {
  formatExpiry,
  formatHistoryTiming,
  formatLocalitySummary,
  formatResponseCount,
  formatRequirementActivity,
  isExpiring,
} from "@/lib/requirement-format";
import type { OwnerRequirement } from "@/lib/types";

export function OwnerRequirementCard({
  requirement,
  generatedAt,
}: {
  requirement: OwnerRequirement;
  generatedAt: number;
}) {
  const expiring = requirement.effectiveStatus === "live" && isExpiring(requirement.expiresAt, generatedAt);
  const statusLabel = requirement.effectiveStatus === "live"
    ? (expiring ? "Expiring" : "Live")
    : requirement.effectiveStatus === "closed" ? "Closed" : "Expired";
  const historyTimestamp = requirement.effectiveStatus === "closed"
    ? requirement.closedAt ?? requirement.updatedAt
    : requirement.expiresAt;
  const timing = requirement.effectiveStatus === "live"
    ? formatExpiry(requirement.expiresAt, generatedAt)
    : formatHistoryTiming(requirement.effectiveStatus, historyTimestamp, generatedAt);

  return (
    <article className="owner-req-card">
      <div className={`owner-status owner-status-${statusLabel.toLowerCase()}`}>
        {requirement.effectiveStatus === "live" ? <span className="live-dot" /> : null}
        {statusLabel}
      </div>
      <p className="locality">{formatLocalitySummary(requirement.localityNames)}</p>
      <h3>{requirement.budgetLabel}</h3>
      <p className="owner-property">{requirement.propertyType}</p>
      {requirement.effectiveStatus === "live" ? (
        <p className="owner-updated">{formatRequirementActivity(requirement.liveSince, requirement.updatedAt, generatedAt)}</p>
      ) : null}
      <div className="owner-card-meta">
        <span>{formatResponseCount(requirement.responseCount)}</span>
        <span>{timing}</span>
      </div>
      {requirement.effectiveStatus === "live" ? (
        <OwnerLifecycleActions
          requirementId={requirement.id}
          status="live"
          expiring={expiring}
          includeView
        />
      ) : (
        <div className="history-actions">
          <Link href={`/requirements/${requirement.id}`}>View REQ</Link>
          <Link href={`/requirements/${requirement.id}/matches`}>View matches</Link>
          <OwnerLifecycleActions
            requirementId={requirement.id}
            status={requirement.effectiveStatus}
            expiring={false}
          />
        </div>
      )}
    </article>
  );
}
