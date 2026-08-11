import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MatchOptionActions } from "@/components/match-option-actions";
import { requireApprovedBroker } from "@/lib/auth";
import { getOwnResponse } from "@/lib/data";
import { formatAskingPrice, formatMatchSize } from "@/lib/requirement-format";

export const metadata: Metadata = { title: "Your Matches" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function MyResponsePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string | string[]; withdrawn?: string | string[]; updated?: string | string[]; limit?: string | string[] }>;
}) {
  const { profile } = await requireApprovedBroker();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const response = await getOwnResponse(id);
  if (!response) notFound();
  const query = await searchParams;
  const canChange = response.effectiveStatus === "live";
  const activeOptions = response.options.filter((option) => option.status === "active");
  const withdrawnOptions = response.options.filter((option) => option.status === "withdrawn");

  return (
    <AppShell profile={profile} activeNav="my-reqs">
      <section className="response-page">
        <Link className="detail-back" href="/my-reqs?tab=responded">← Responded REQs</Link>
        {query.sent === "1" ? <p className="requirement-created" role="status">Your response has been sent</p> : null}
        {query.withdrawn === "1" ? <p className="requirement-created" role="status">Match withdrawn</p> : null}
        {query.updated === "1" ? <p className="requirement-created" role="status">Match updated</p> : null}
        {query.limit === "1" ? <p className="form-error" role="status">You already have 3 active options for this REQ.</p> : null}
        <p className="post-kicker">Your response</p>
        <h1>Your matches</h1>
        <div className="match-context">
          <span>For</span>
          <strong>{response.requirementLocalityNames.join(" + ")} · {response.budgetLabel}</strong>
        </div>
        {response.effectiveStatus !== "live" ? (
          <p className="response-locked">This REQ is {response.effectiveStatus}. Existing matches remain visible, but they can no longer be changed.</p>
        ) : null}

        <div className="submitted-options">
          {activeOptions.map((option, index) => (
            <article className="submitted-option" key={option.id}>
              <span className="option-number">Option {index + 1}</span>
              <h2>{formatAskingPrice(option.askingPrice)}</h2>
              <p>{[option.localityName, formatMatchSize(option.size, option.sizeUnit), option.floor ? `${option.floor} Floor` : null].filter(Boolean).join(" · ")}</p>
              {option.source ? <strong>{option.source}</strong> : null}
              {option.notes ? <p className="option-notes">{option.notes}</p> : null}
              {canChange ? <MatchOptionActions requirementId={id} matchId={option.id} /> : null}
            </article>
          ))}
        </div>

        {withdrawnOptions.length > 0 ? (
          <details className="withdrawn-options">
            <summary>{withdrawnOptions.length} withdrawn {withdrawnOptions.length === 1 ? "option" : "options"}</summary>
            {withdrawnOptions.map((option) => (
              <div key={option.id}><strong>{formatAskingPrice(option.askingPrice)}</strong><span>{option.localityName}</span></div>
            ))}
          </details>
        ) : null}

        <div className="response-usage">
          <p>{response.activeOptionCount} of 3 options used</p>
          {canChange && response.activeOptionCount < 3 ? <Link className="primary-button" href={`/requirements/${id}/match`}>+ Add another match</Link> : null}
        </div>
      </section>
    </AppShell>
  );
}
