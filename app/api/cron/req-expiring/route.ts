import { NextRequest, NextResponse } from "next/server";
import { sendPushForNotificationIds } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !expected) {
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }
  if (expected && request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 503 });

  const { data, error } = await supabase.rpc("generate_req_expiring_notifications");
  if (error) return NextResponse.json({ error: "Reminder generation failed" }, { status: 500 });

  const ids = ((data ?? []) as { notification_id: string }[]).map((row) => row.notification_id);
  const push = await sendPushForNotificationIds(ids);

  return NextResponse.json({
    created: ids.length,
    push,
  });
}
