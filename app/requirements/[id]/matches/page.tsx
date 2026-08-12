import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConnectResponseAction } from "@/components/connect-response-action";
import { requireApprovedBroker } from "@/lib/auth";
import {
  formatIndianMobile,
  ownerToRespondentMessage,
  whatsappUrl,
} from "@/lib/connection";
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

export default async function OwnerMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ connected?: string | string[] }>;
}) {
  const { profile } = await requireApprovedBroker();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const query = await searchParams;
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
        {query.connected === "1" ? <p className="requirement-created" role="status">Connected</p> : null}

        {responses.length === 0 ? (
          <section className="app-empty-state matches-empty">
            <h2>No active responses yet.</h2>
            <p>Broker responses with active options will appear here.</p>
          </section>
        ) : (
          <div className="broker-response-list">
            {responses.map((response) => {
              const respondentMobileLabel = formatIndianMobile(response.respondentMobile);
              const responseWhatsAppUrl = whatsappUrl(
                response.respondentMobile,
                ownerToRespondentMessage({
                  respondentName: response.respondentName,
                  localities: inbox?.requirementLocalityNames ?? requirement.localityNames,
                  budgetLabel: requirement.budgetLabel,
                }),
              );
              return (
              <article className="broker-response-card" key={response.responseId}>
                <header>
                  <span className="response-avatar">{initials(response.respondentName)}</span>
                  <div>
                    <h2>{response.respondentName}</h2>
                    {response.respondentBrokerage ? <p>{response.respondentBrokerage}</p> : null}
                  </div>
                  <strong>{response.options.length} {response.options.length === 1 ? "option" : "options"}</strong>
                </header>
                {response.connectionId ? (
                  <div className="connected-contact">
                    <p className="connected-status">✓ Connected</p>
                    <h3>{response.respondentName}</h3>
                    {response.respondentBrokerage ? <p>{response.respondentBrokerage}</p> : null}
                    {respondentMobileLabel ? (
                      <strong>{respondentMobileLabel}</strong>
                    ) : (
                      <p>Mobile number unavailable. Ask this broker to update their REQ profile.</p>
                    )}
                  </div>
                ) : null}
                {response.options.length > 0 ? (
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
                ) : (
                  <p className="response-locked">No active options right now. The connection remains visible because contact was already shared.</p>
                )}
                {response.connectionId ? (
                  responseWhatsAppUrl ? (
                    <a
                      className="detail-primary-action"
                      href={responseWhatsAppUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open WhatsApp
                    </a>
                  ) : (
                    <p className="field-error">Mobile number unavailable. Ask this broker to update their REQ profile.</p>
                  )
                ) : requirement.effectiveStatus === "live" && response.options.length > 0 ? (
                  <ConnectResponseAction
                    requirementId={id}
                    respondingBrokerId={response.respondentId}
                    respondentName={response.respondentName}
                  />
                ) : (
                  <button className="detail-future-action" type="button" disabled>
                    Connect unavailable
                    <span>REQ is no longer live</span>
                  </button>
                )}
              </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
