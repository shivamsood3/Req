import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FeedFilters } from "@/components/feed-filters";
import { PublicFeed } from "@/components/public-feed";
import { RequirementCard } from "@/components/requirement-card";
import { getSessionProfile } from "@/lib/auth";
import { canAccessArea, isProfileComplete } from "@/lib/auth-policy";
import { getActiveLocalities, getBrokerLiveRequirements, getPublicPreviews } from "@/lib/data";
import { parseFeedFilters, type FeedSearchParams } from "@/lib/feed-filters";
import { requestTimestamp } from "@/lib/requirement-format";

export const metadata: Metadata = { title: "Live Market" };
export const dynamic = "force-dynamic";

export default async function BrokerHomePage({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
  const { user, profile } = await getSessionProfile();
  const localities = await getActiveLocalities();
  const filters = parseFeedFilters(
    await searchParams,
    localities.map((locality) => locality.slug),
  );
  const generatedAt = requestTimestamp();

  if (!user) {
    const publicItems = await getPublicPreviews(filters);
    return (
      <PublicFeed
        items={publicItems}
        localities={localities}
        filters={filters}
        generatedAt={generatedAt}
        basePath="/home"
      />
    );
  }

  if (!profile || !isProfileComplete(profile)) redirect("/profile-setup");
  if (profile.status === "pending") redirect("/pending");
  if (!canAccessArea(profile, "broker")) redirect("/access-suspended");

  const items = await getBrokerLiveRequirements(filters);

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
          <Link href="/post">Post a REQ</Link>
        </section>
      )}
    </AppShell>
  );
}
