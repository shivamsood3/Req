import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireApprovedBroker } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { formatElapsed, requestTimestamp } from "@/lib/requirement-format";
import { markAllNotificationsRead, openNotification } from "./actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { profile } = await requireApprovedBroker();
  const notifications = await getNotifications();
  const now = requestTimestamp();
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <AppShell profile={profile} activeNav={null}>
      <section className="notifications-heading">
        <div>
          <p className="app-kicker">REQ</p>
          <h1 className="app-title">Notifications</h1>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsRead}>
            <button className="clear-all" type="submit">Mark all as read</button>
          </form>
        ) : null}
      </section>

      {notifications.length ? (
        <section className="notification-list" aria-label="Notifications">
          {notifications.map((notification) => (
            <form action={openNotification} key={notification.id}>
              <input type="hidden" name="notification_id" value={notification.id} />
              <button className="notification-row" type="submit">
                <span className={notification.readAt ? "notification-read-dot" : "notification-unread-dot"} aria-hidden="true" />
                <span>
                  <strong>{notification.label}</strong>
                  <small>{notification.body}</small>
                  <em>{formatElapsed(notification.createdAt, now)}</em>
                </span>
              </button>
            </form>
          ))}
        </section>
      ) : (
        <section className="app-empty-state">
          <h2>No notifications yet.</h2>
        </section>
      )}
    </AppShell>
  );
}
