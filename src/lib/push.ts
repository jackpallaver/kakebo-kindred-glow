import { supabase } from "@/integrations/supabase/client";

/** VAPID application server public key — public by design. */
export const VAPID_PUBLIC_KEY =
  "BLlc-g7pmQ1zb1jbxL0wDtYm3ZOjg8YQELAgbHwG8aW3i9ev_sWg3vRdTD--w9kw06U2n-qdDbfHQ3PuPN00tYg";

const SW_URL = "/push-sw.js";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enablePush(userId: string, language: string): Promise<void> {
  if (!isPushSupported()) throw new Error("unsupported");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
  const p256dh = json.keys?.p256dh ?? bufferToBase64Url(sub.getKey("p256dh"));
  const auth = json.keys?.auth ?? bufferToBase64Url(sub.getKey("auth"));

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh, auth, language },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
}

export async function disablePush(userId: string): Promise<void> {
  const sub = await getExistingSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  } else {
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);
  }
}

export async function sendTestNotification(title: string, body: string): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  if (!reg) return false;
  await reg.showNotification(title, { body, icon: "/icon-192.png", tag: "kakebo-test" });
  return true;
}