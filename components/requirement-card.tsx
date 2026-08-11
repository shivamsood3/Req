"use client";

import Link from "next/link";
import {
  formatFreshness,
  formatLocalitySummary,
  formatResponseCount,
} from "@/lib/requirement-format";
import type { BrokerRequirement, PublicRequirementPreview } from "@/lib/types";

function isBrokerRequirement(
  item: PublicRequirementPreview | BrokerRequirement,
): item is BrokerRequirement {
  return "brokerId" in item;
}

export function RequirementCard({
  item,
  generatedAt,
  currentBrokerId,
  onPublicOpen,
}: {
  item: PublicRequirementPreview | BrokerRequirement;
  generatedAt: number;
  currentBrokerId?: string;
  onPublicOpen?: () => void;
}) {
  const brokerItem = isBrokerRequirement(item) ? item : null;
  const isOwn = brokerItem?.brokerId === currentBrokerId;

  return (
    <article className="requirement-card">
      <p className="locality">{formatLocalitySummary(item.localityNames)}</p>
      <h2>{item.budgetLabel}</h2>
      <div className="requirement-details">
        <p>{item.propertyType}</p>
        <p>{item.sizeLabel}</p>
        {item.floorPreference ? <p>{item.floorPreference}</p> : null}
        {brokerItem?.buyerType ? <p>Buyer: {brokerItem.buyerType}</p> : null}
        {brokerItem?.urgency ? <p>Urgency: {brokerItem.urgency}</p> : null}
      </div>

      <div className="card-status">
        <span className="live-copy">LIVE</span>
        <span aria-hidden="true">·</span>
        <span>{formatFreshness(item.liveSince, generatedAt)}</span>
      </div>

      {brokerItem ? (
        <p className="broker-attribution">
          Posted by <strong>{brokerItem.brokerName ?? "Broker unavailable"}</strong>
          {brokerItem.brokerage ? ` · ${brokerItem.brokerage}` : ""}
        </p>
      ) : null}

      <div className="card-footer">
        <p>{formatResponseCount(item.responseCount)}</p>
        {onPublicOpen ? (
          <button type="button" onClick={onPublicOpen}>
            View requirement <span aria-hidden="true">→</span>
          </button>
        ) : (
          <Link href={`/requirements/${item.id}`}>
            View requirement <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {brokerItem ? (
        <button className="future-action" type="button" disabled>
          {isOwn ? "View matches" : "I have a match"}
          <span>Available in a future build</span>
        </button>
      ) : null}
    </article>
  );
}
