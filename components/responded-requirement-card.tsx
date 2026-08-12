import Link from "next/link";
import { formatLocalitySummary } from "@/lib/requirement-format";
import type { RespondedRequirement } from "@/lib/types";

export function RespondedRequirementCard({ requirement }: { requirement: RespondedRequirement }) {
  return (
    <article className="owner-req-card responded-card">
      <div className={`owner-status owner-status-${requirement.effectiveStatus}`}>
        {requirement.effectiveStatus === "live" ? <span className="live-dot" /> : null}
        {requirement.effectiveStatus}
      </div>
      <p className="locality">{formatLocalitySummary(requirement.localityNames)}</p>
      <h3>{requirement.budgetLabel}</h3>
      <p className="owner-property">{requirement.propertyType}</p>
      <div className="owner-card-meta">
        <span>Your response</span>
        <span>{requirement.activeOptionCount} active {requirement.activeOptionCount === 1 ? "option" : "options"}</span>
      </div>
      {requirement.connectionId ? <p className="connected-status responded-connected">✓ Connected</p> : null}
      {requirement.withdrawnOptionCount > 0 ? <p className="withdrawn-note">{requirement.withdrawnOptionCount} withdrawn</p> : null}
      <Link className="owner-primary-action" href={`/requirements/${requirement.requirementId}/my-response`}>View response</Link>
    </article>
  );
}
