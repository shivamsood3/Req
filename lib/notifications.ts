import webPush, { type PushSubscription } from "web-push";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export type NotificationType =
  | "new_match"
  | "connected"
  | "req_expiring"
  | "access_approved";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  entity_type: "requirement" | "account";
  entity_id: string | null;
  event_key: string;
  read_at: string | null;
  push_sent_at: string | null;
  created_at: string;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  label: string;
  title: string;
  body: string;
  entityType: "requirement" | "account";
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  targetUrl: string;
};

export function notificationTargetUrl(
  type: NotificationType,
  entityType: string,
  entityId: string | null,
) {
  if (type === "access_approved") return "/home";
  if (entityType !== "requirement" || !entityId) return "/notifications";
  if (type === "new_match") return `/requirements/${entityId}/matches`;
  if (type === "connected") return `/requirements/${entityId}/my-response`;
  if (type === "req_expiring") return `/requirements/${entityId}`;
  return "/notifications";
}

export function notificationLabel(type: NotificationType) {
  return type.replaceAll("_", " ").toUpperCase();
}

export function serializeNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    label: notificationLabel(row.type),
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
    targetUrl: notificationTargetUrl(row.type, row.entity_type, row.entity_id),
  };
}

export async function getNotifications(): Promise<AppNotification[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error("Unable to load notifications");
  return ((data ?? []) as NotificationRow[]).map(serializeNotification);
}

export async function getUnreadNotificationCount() {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("get_unread_notification_count");
  if (error || typeof data !== "number") return 0;
  return data;
}

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function hasVapidConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configureWebPush() {
  if (!hasVapidConfig()) return false;
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

function toPushSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

function safePushPayload(notification: NotificationRow) {
  return JSON.stringify({
    title: "REQ",
    body: notification.body,
    url: notificationTargetUrl(
      notification.type,
      notification.entity_type,
      notification.entity_id,
    ),
  });
}

async function cleanupInvalidSubscription(id: string) {
  const supabase = createAdminClient();
  if (!supabase) return;
  await supabase.from("push_subscriptions").delete().eq("id", id);
}

export async function sendPushForNotificationIds(notificationIds: string[]) {
  if (notificationIds.length === 0 || !configureWebPush()) return { sent: 0, removed: 0 };
  const supabase = createAdminClient();
  if (!supabase) return { sent: 0, removed: 0 };

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .in("id", notificationIds)
    .is("push_sent_at", null);
  if (error || !notifications?.length) return { sent: 0, removed: 0 };

  let sent = 0;
  let removed = 0;

  for (const notification of notifications as NotificationRow[]) {
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", notification.user_id);

    for (const subscription of (subscriptions ?? []) as PushSubscriptionRow[]) {
      try {
        await webPush.sendNotification(
          toPushSubscription(subscription),
          safePushPayload(notification),
        );
        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error
          ? Number(error.statusCode)
          : 0;
        if (statusCode === 404 || statusCode === 410) {
          await cleanupInvalidSubscription(subscription.id);
          removed += 1;
        }
      }
    }

    await supabase
      .from("notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", notification.id);
  }

  return { sent, removed };
}

export async function sendPushForEventKey(eventKey: string) {
  const supabase = createAdminClient();
  if (!supabase) return { sent: 0, removed: 0 };
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("event_key", eventKey)
    .is("push_sent_at", null)
    .limit(1);
  const id = data?.[0]?.id as string | undefined;
  return id ? sendPushForNotificationIds([id]) : { sent: 0, removed: 0 };
}
