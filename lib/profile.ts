import { createClient } from "./supabase/server";

export type ProfileStats = {
  reqsPosted: number;
  matchesSubmitted: number;
};

type ProfileStatsRow = {
  reqs_posted: number;
  matches_submitted: number;
};

export async function getProfileStats(): Promise<ProfileStats> {
  const supabase = await createClient();
  if (!supabase) return { reqsPosted: 0, matchesSubmitted: 0 };
  const { data, error } = await supabase.rpc("get_profile_stats");
  if (error) return { reqsPosted: 0, matchesSubmitted: 0 };
  const row = (data?.[0] as ProfileStatsRow | undefined) ?? null;
  return {
    reqsPosted: row?.reqs_posted ?? 0,
    matchesSubmitted: row?.matches_submitted ?? 0,
  };
}
