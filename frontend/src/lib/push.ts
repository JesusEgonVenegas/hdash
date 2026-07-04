import { apiFetch } from "./api";

// VAPID public keys are base64url; PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

export function pushSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

type PublicKey = { enabled: boolean; publicKey: string };

export type PushStatus = { supported: boolean; serverEnabled: boolean; subscribed: boolean };

export async function getPushStatus(token: string): Promise<PushStatus> {
    if (!pushSupported()) return { supported: false, serverEnabled: false, subscribed: false };
    const { enabled } = await apiFetch<PublicKey>("/api/push/public-key", { token });
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return { supported: true, serverEnabled: enabled, subscribed: !!sub };
}

export async function enablePush(token: string): Promise<void> {
    const { enabled, publicKey } = await apiFetch<PublicKey>("/api/push/public-key", { token });
    if (!enabled) throw new Error("Push isn't configured on the server.");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notifications are blocked — allow them in your browser.");

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const json = sub.toJSON();
    await apiFetch("/api/push/subscribe", {
        method: "POST",
        token,
        body: { endpoint: json.endpoint, keys: json.keys },
    });
}

export async function disablePush(token: string): Promise<void> {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
        await apiFetch("/api/push/unsubscribe", { method: "POST", token, body: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe();
    }
}

export async function sendTestPush(token: string): Promise<void> {
    await apiFetch("/api/push/test", { method: "POST", token });
}
