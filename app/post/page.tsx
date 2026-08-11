import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PostRequirementForm } from "@/components/post-requirement-form";
import { requireApprovedBroker } from "@/lib/auth";
import { getActiveLocalities } from "@/lib/data";

export const metadata: Metadata = { title: "Post a REQ" };
export const dynamic = "force-dynamic";

export default async function PostRequirementPage() {
  const { profile } = await requireApprovedBroker();
  const localities = await getActiveLocalities();

  return (
    <AppShell profile={profile}>
      <section className="post-page">
        <Link className="detail-back" href="/home">← Live Market</Link>
        <p className="post-kicker">Post a REQ</p>
        <h1>What does your buyer need?</h1>

        {localities.length > 0 ? (
          <PostRequirementForm localities={localities} />
        ) : (
          <div className="post-unavailable" role="status">
            <h2>Posting is temporarily unavailable.</h2>
            <p>No active locations are available right now. Please try again later.</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
