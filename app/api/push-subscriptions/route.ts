import { NextRequest, NextResponse } from "next/server";
import { requireApprovedBroker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function pushKeys(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const keys = (value as { keys?: { p256dh?: unknown; auth?: unknown } }).keys;
  const endpoint = (value as { endpoint?: unknown }).endpoint;
  if (typeof endpoint !== "string" || typeof keys?.p256dh !== "string" || typeof keys.auth !== "string") {
    return null;
  }
  if (!endpoint.startsWith("https://") || endpoint.length > 2048) return null;
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth };
}

export async function POST(request: NextRequest) {
  const { user } = await requireApprovedBroker();
  const parsed = pushKeys(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.endpoint,
      p256dh: parsed.p256dh,
      auth: parsed.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return NextResponse.json({ error: "Subscription could not be saved" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { user } = await requireApprovedBroker();
  const { endpoint } = await request.json().catch(() => ({ endpoint: "" }));
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
