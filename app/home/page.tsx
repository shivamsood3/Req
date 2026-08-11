import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { FeedFilters } from "@/components/feed-filters";
import { RequirementCard } from "@/components/requirement-card";
import { requireApprovedBroker } from "@/lib/auth";
import { getActiveLocalities, getBrokerLiveRequirements } from "@/lib/data";
import { parseFeedFilters, type FeedSearchParams } from "@/lib/feed-filters";
import { requestTimestamp } from "@/lib/requirement-format";

export const metadata: Metadata = { title: "Live Market" };
export const dynamic = "force-dynamic";

export default async function BrokerHomePage({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
  const { user, profile } = await requireApprovedBroker();
  const localities = await getActiveLocalities();
  const filters = parseFeedFilters(
    await searchParams,
    localities.map((locality) => locality.slug),
  );
  const items = await getBrokerLiveRequirements(filters);
  const generatedAt = requestTimestamp();

  return (
    <AppShell profile={profile}>
      <section className="app-feed-heading">
        <h1 className="app-title">Live Market</h1>
        <p>South Delhi</p>
      </section>

      <FeedFilters
        key={JSON.stringify(filters)}
        basePath="/home"
        localities={localities}
        filters={filters}
      />

      {items.length > 0 ? (
        <section className="requirement-list" aria-label="Live requirements">
          {items.map((item) => (
            <RequirementCard
              item={item}
              generatedAt={generatedAt}
              currentBrokerId={user.id}
              key={item.id}
            />
          ))}
        </section>
      ) : (
        <section className="app-empty-state">
          <h2>No live REQs right now.</h2>
          <p>Have an active buyer?</p>
          <button type="button" disabled>
            Post a REQ
            <span>Available in Build 2</span>
          </button>
        </section>
      )}
    </AppShell>
  );
}
