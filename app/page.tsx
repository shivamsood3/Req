import { PublicFeed } from "@/components/public-feed";
import { getPublicPreviews } from "@/lib/data";

export const revalidate = 60;

export default async function PublicHomePage() {
  const items = await getPublicPreviews();
  return <PublicFeed items={items} />;
}
