import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MatchOptionForm } from "@/components/match-option-form";
import { requireApprovedBroker } from "@/lib/auth";
import { getActiveLocalities, getOwnResponse } from "@/lib/data";
import type { MatchOptionFields } from "@/lib/match-option";

export const metadata: Metadata = { title: "Edit Match" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditMatchPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { profile } = await requireApprovedBroker();
  const { id, matchId } = await params;
  if (!UUID.test(id) || !UUID.test(matchId)) notFound();
  const [response, localities] = await Promise.all([getOwnResponse(id), getActiveLocalities()]);
  if (!response) notFound();
  const option = response.options.find((item) => item.id === matchId);
  if (!option || option.status !== "active") notFound();

  if (response.effectiveStatus !== "live") {
    return (
      <AppShell profile={profile} activeNav="my-reqs">
        <section className="match-page">
          <Link className="detail-back" href={`/requirements/${id}/my-response`}>← Your response</Link>
          <h1>This match can no longer be edited.</h1>
          <p className="response-locked">The REQ has {response.effectiveStatus}. Your submitted option remains visible in its history.</p>
        </section>
      </AppShell>
    );
  }

  const initialValues: MatchOptionFields = {
    localityId: option.localityId,
    askingPrice: String(option.askingPrice),
    size: option.size === null ? "" : String(option.size),
    sizeUnit: option.sizeUnit ?? "sq yd",
    floor: option.floor ?? "",
    source: option.source ?? "",
    notes: option.notes ?? "",
  };

  return (
    <AppShell profile={profile} activeNav="my-reqs">
      <section className="match-page">
        <Link className="detail-back" href={`/requirements/${id}/my-response`}>← Your response</Link>
        <p className="post-kicker">Edit Match</p>
        <h1>Update this option.</h1>
        <MatchOptionForm requirementId={id} matchId={matchId} localities={localities} mode="edit" initialValues={initialValues} />
      </section>
    </AppShell>
  );
}
