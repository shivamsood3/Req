import { PublicFeed } from "@/components/public-feed";
import { getActiveLocalities, getPublicPreviews } from "@/lib/data";
import { parseFeedFilters, type FeedSearchParams } from "@/lib/feed-filters";
import { requestTimestamp } from "@/lib/requirement-format";

export const revalidate = 60;

export default async function PublicHomePage({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
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
