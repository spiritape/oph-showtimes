// Sends notifications to app installs through Apple's Push Notification
// service (docs/adr/0003). Authenticates with a token signed by the team's
// APNs key, which Apple lets us reuse for up to an hour.
import type { NewTitleNotification } from "../src/notification.ts";

/** An app install's push token. Debug builds register with Apple's sandbox. */
export type AppSubscription = { token: string; environment: "sandbox" | "production" };

export type ApnsConfig = {
  /** The .p8 key's contents, as downloaded from the Apple Developer site. */
  key: string;
  keyId: string;
  teamId: string;
  /** The app's bundle ID. */
  topic: string;
};

export function isAppSubscription(value: unknown): value is AppSubscription {
  const s = value as AppSubscription;
  return (
    typeof s?.token === "string" &&
    /^[0-9a-f]{64,200}$/i.test(s.token) &&
    (s.environment === "sandbox" || s.environment === "production")
  );
}

/** What the app receives: the alert, plus where tapping goes and the poster to show. */
export function apnsPayload(n: NewTitleNotification) {
  return {
    aps: { alert: { title: n.title, body: n.body }, sound: "default", "mutable-content": 1 },
    url: n.url,
    ...(n.titleSlug ? { titleSlug: n.titleSlug } : {}),
    ...(n.imageUrl ? { imageUrl: n.imageUrl } : {}),
  };
}

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** A signed provider token (ES256 JWT) for APNs. */
export async function apnsToken(config: ApnsConfig, issuedAt: number): Promise<string> {
  const der = Uint8Array.from(atob(config.key.replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const encode = (part: object) => base64url(new TextEncoder().encode(JSON.stringify(part)));
  const unsigned = `${encode({ alg: "ES256", kid: config.keyId })}.${encode({ iss: config.teamId, iat: issuedAt })}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64url(signature)}`;
}

/** Sends one notification. "gone" means Apple says the token will never work again. */
export async function sendToApp(
  subscription: AppSubscription,
  notification: NewTitleNotification,
  config: ApnsConfig,
  token: string,
): Promise<"sent" | "gone" | "failed"> {
  const host = subscription.environment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const res = await fetch(`https://${host}/3/device/${subscription.token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${token}`,
      "apns-topic": config.topic,
      "apns-push-type": "alert",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 86_400),
    },
    body: JSON.stringify(apnsPayload(notification)),
  });
  if (res.ok) return "sent";
  const reason = ((await res.json().catch(() => ({}))) as { reason?: string }).reason;
  if (res.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered") return "gone";
  console.error(`APNs (${subscription.environment}) failed: ${res.status} ${reason ?? ""}`);
  return "failed";
}
