import { redirect } from "next/navigation";
import { PublicFeed } from "@/components/public-feed";
import { getSessionProfile } from "@/lib/auth";
import { resolvePostAuthRoute } from "@/lib/auth-policy";
import { getActiveLocalities, getPublicPreviews } from "@/lib/data";
import { parseFeedFilters, type FeedSearchParams } from "@/lib/feed-filters";
import { requestTimestamp } from "@/lib/requirement-format";

export const dynamic = "force-dynamic";

export default async function PublicHomePage({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
  const { user, profile } = await getSessionProfile();
  if (user) redirect(resolvePostAuthRoute(profile));

  const localities = await getActiveLocalities();
  const filters = parseFeedFilters(
    await searchParams,
    localities.map((locality) => locality.slug),
  );
  const items = await getPublicPreviews(filters);

  return (
    <PublicFeed
      items={items}
      localities={localities}
      filters={filters}
      generatedAt={requestTimestamp()}
    />
  );
}
