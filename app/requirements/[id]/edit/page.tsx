import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EditRequirementForm } from "@/components/post-requirement-form";
import { requireApprovedBroker } from "@/lib/auth";
import { getActiveLocalities, getOwnRequirement } from "@/lib/data";
import type { CreateRequirementFields } from "@/lib/create-requirement";

export const metadata: Metadata = { title: "Edit REQ" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditRequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireApprovedBroker();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [requirement, localities] = await Promise.all([
    getOwnRequirement(id),
    getActiveLocalities(),
  ]);
  if (!requirement) notFound();

  if (requirement.effectiveStatus !== "live") {
    return (
      <AppShell profile={profile} activeNav="my-reqs">
        <section className="post-page">
          <Link className="detail-back" href={`/requirements/${id}`}>← View REQ</Link>
          <p className="post-kicker">Edit REQ</p>
          <h1>This REQ is no longer live.</h1>
          <div className="post-unavailable">
            <p>Expired or closed REQs cannot be edited. You can make it live again from My REQs.</p>
            <Link className="secondary-button" href="/my-reqs">Go to My REQs</Link>
          </div>
        </section>
      </AppShell>
    );
  }

  const initialValues: CreateRequirementFields = {
    localityIds: requirement.localityIds,
    propertyType: requirement.propertyTypeKey,
    budgetMin: String(requirement.budgetMin),
    budgetMax: String(requirement.budgetMax),
    sizeMin: requirement.sizeMin === null ? "" : String(requirement.sizeMin),
    sizeMax: requirement.sizeMax === null ? "" : String(requirement.sizeMax),
    sizeUnit: requirement.sizeUnit ?? "sq yd",
    floorPreference: requirement.floorPreference ?? "",
    buyerType: requirement.buyerType ?? "",
    urgency: requirement.urgency ?? "",
    notes: requirement.notes ?? "",
  };

  return (
    <AppShell profile={profile} activeNav="my-reqs">
      <section className="post-page">
        <Link className="detail-back" href={`/requirements/${id}`}>← View REQ</Link>
        <p className="post-kicker">Edit REQ</p>
        <h1>Update what your buyer needs.</h1>
        <EditRequirementForm
          requirementId={id}
          localities={localities}
          initialValues={initialValues}
        />
      </section>
    </AppShell>
  );
}
