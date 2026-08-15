"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedBroker } from "@/lib/auth";
import { notificationTargetUrl, type NotificationType } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function openNotification(formData: FormData) {
  await requireApprovedBroker();
  const id = String(formData.get("notification_id") ?? "");
  if (!UUID.test(id)) redirect("/notifications");

  const supabase = await createClient();
  if (!supabase) redirect("/notifications");
  const { data, error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: id,
  });

  revalidatePath("/notifications");
  const row = data?.[0] as
    | { type: NotificationType; entity_type: string; entity_id: string | null }
    | undefined;
  if (error || !row) redirect("/notifications");
  redirect(notificationTargetUrl(row.type, row.entity_type, row.entity_id));
}

export async function markAllNotificationsRead() {
  await requireApprovedBroker();
  const supabase = await createClient();
  if (supabase) await supabase.rpc("mark_all_notifications_read");
  revalidatePath("/notifications");
  redirect("/notifications");
}
