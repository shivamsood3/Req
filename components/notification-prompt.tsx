"use client";

import { useState } from "react";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function activeRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.ready;
}

export function NotificationPrompt({ variant = "post" }: { variant?: "post" | "settings" }) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [status, setStatus] = useState<NotificationPermission | "unsupported" | "missing">(() => {
    if (!publicKey) return "missing";
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("PushManager" in window) ||
      !("serviceWorker" in navigator)
    ) {
      return "unsupported";
    }
    return Notification.permission;
  });
  const [saving, setSaving] = useState(false);

  async function enable() {
    if (!publicKey || status === "unsupported" || status === "missing") return;
    setSaving(true);
    const permission = await Notification.requestPermission();
    setStatus(permission);
    if (permission !== "granted") {
      setSaving(false);
      return;
    }

    const registration = await activeRegistration();
    if (!registration) {
      setSaving(false);
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/push-subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    setSaving(false);
  }

  if (variant === "settings") {
    return (
      <section className="settings-panel">
        <div>
          <p className="settings-label">Browser notifications</p>
          <h2>
            {status === "granted" ? "Enabled" : status === "denied" ? "Blocked" : "Not enabled"}
          </h2>
          <p>
            {status === "denied"
              ? "Browser notifications are blocked. Change this in your browser settings to retry."
              : status === "granted"
                ? "You’ll get short alerts for matches, connections and expiring REQs."
                : "Enable alerts for matches, connections and expiring REQs."}
          </p>
        </div>
        {status === "default" ? (
          <button className="secondary-button" type="button" onClick={enable} disabled={saving}>
            {saving ? "Enabling…" : "Enable"}
          </button>
        ) : null}
      </section>
    );
  }

  if (status !== "default") return null;

  return (
    <section className="notification-card" role="status">
      <div>
        <h2>Get notified when brokers respond to your REQs.</h2>
        <p>Short browser alerts for new matches, connections and expiring REQs.</p>
      </div>
      <button className="secondary-button" type="button" onClick={enable} disabled={saving}>
        {saving ? "Enabling…" : "Enable notifications"}
      </button>
    </section>
  );
}
