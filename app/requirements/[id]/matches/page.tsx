import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireApprovedBroker } from "@/lib/auth";
import { getOwnRequirement, getRequirementResponsesForOwner } from "@/lib/data";
import {
  formatAskingPrice,
  formatMatchSize,
  formatResponseCount,
} from "@/lib/requirement-format";

export const metadata: Metadata = { title: "REQ Matches" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "BR";
}

export default async function OwnerMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireApprovedBroker();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [requirement, inbox] = await Promise.all([
    getOwnRequirement(id),
    getRequirementResponsesForOwner(id),
  ]);
  if (!requirement) notFound();
  const responses = inbox?.responses ?? [];

  return (
    <AppShell profile={profile} activeNav="my-reqs">
      <section className="matches-page">
        <Link className="detail-back" href={`/requirements/${id}`}>← View REQ</Link>
        <p className="post-kicker">Match inbox</p>
        <h1>{requirement.localityNames.join(" + ")}</h1>
        <p className="matches-budget">{requirement.budgetLabel}</p>
        <p className="matches-total">{formatResponseCount(responses.length)}</p>

        {responses.length === 0 ? (
          <section className="app-empty-state matches-empty">
            <h2>No active responses yet.</h2>
            <p>Broker responses with active options will appear here.</p>
          </section>
        ) : (
          <div className="broker-response-list">
            {responses.map((response) => (
              <article className="broker-response-card" key={response.responseId}>
                <header>
                  <span className="response-avatar">{initials(response.respondentName)}</span>
                  <div>
                    <h2>{response.respondentName}</h2>
                    {response.respondentBrokerage ? <p>{response.respondentBrokerage}</p> : null}
                  </div>
                  <strong>{response.options.length} {response.options.length === 1 ? "option" : "options"}</strong>
                </header>
                <div className="owner-option-list">
                  {response.options.map((option) => (
                    <section className="owner-match-option" key={option.id}>
                      <h3>{formatAskingPrice(option.askingPrice)}</h3>
                      <p>{[option.localityName, formatMatchSize(option.size, option.sizeUnit), option.floor ? `${option.floor} Floor` : null].filter(Boolean).join(" · ")}</p>
                      {option.source ? <strong>{option.source}</strong> : null}
                      {option.notes ? <p className="option-notes">{option.notes}</p> : null}
                    </section>
                  ))}
                </div>
                <button className="detail-future-action" type="button" disabled>
                  Connect
                  <span>Not yet enabled</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
