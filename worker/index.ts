// The watcher (docs/adr/0002): reads the Source every 2 minutes and starts the
// GitHub build when the schedule changes; stores Subscribers and sends New
// Title Notifications when the build asks.
import { buildPushHTTPRequest } from "@pushforge/builder";
import type { NewTitleNotification } from "../src/notification.ts";
import { fetchSource, readSource } from "../src/source.ts";

export interface Env {
  /** Subscribers under "sub:<hash of endpoint>", plus the last schedule fingerprint. */
  WATCHER: KVNamespace;
  /** Space-separated origins the site is served from; the first is its own domain. */
  SITE_ORIGINS: string;
  GITHUB_REPO: string;
  GITHUB_WORKFLOW: string;
  CONTACT_EMAIL: string;
  GITHUB_TOKEN: string;
  NOTIFY_SECRET: string;
  VAPID_PRIVATE_JWK: string;
}

const SCHEDULE_HASH_KEY = "schedule-hash";
const SUBSCRIBER_PREFIX = "sub:";
/** Workers' free plan allows 50 outbound requests per invocation. */
const SUBSCRIBERS_PER_PAGE = 40;

type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
type PushTarget = Parameters<typeof buildPushHTTPRequest>[0]["subscription"];

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function watch(env: Env): Promise<void> {
  const showtimes = readSource(await fetchSource(env.CONTACT_EMAIL));
  // An empty or broken read is the build's problem to report; don't start it for nothing.
  if (showtimes.length === 0) return;
  const hash = await sha256(JSON.stringify(showtimes));
  if (hash === (await env.WATCHER.get(SCHEDULE_HASH_KEY))) return;

  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "oph-showtimes-watcher",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main", inputs: { force: false } }),
    },
  );
  if (!res.ok) throw new Error(`GitHub responded ${res.status}: ${await res.text()}`);
  await env.WATCHER.put(SCHEDULE_HASH_KEY, hash);
  console.log("Schedule changed; started the build.");
}

function isSubscription(value: unknown): value is Subscription {
  const s = value as Subscription;
  return (
    typeof s?.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    s.endpoint.length < 1000 &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string"
  );
}

async function notify(env: Env, notification: NewTitleNotification, cursor: string | null) {
  const page = await env.WATCHER.list<Subscription>({
    prefix: SUBSCRIBER_PREFIX,
    limit: SUBSCRIBERS_PER_PAGE,
    cursor: cursor ?? undefined,
  });
  let sent = 0;
  let removed = 0;
  await Promise.all(
    page.keys.map(async ({ name, metadata }) => {
      if (!metadata) return;
      const request = await buildPushHTTPRequest({
        privateJWK: env.VAPID_PRIVATE_JWK,
        subscription: metadata as unknown as PushTarget,
        message: { payload: notification, adminContact: `mailto:${env.CONTACT_EMAIL}`, options: { ttl: 86_400 } },
      });
      const res = await fetch(request.endpoint, { method: "POST", headers: request.headers, body: request.body });
      if (res.status === 404 || res.status === 410) {
        // The browser dropped this subscription.
        await env.WATCHER.delete(name);
        removed++;
      } else if (res.ok) {
        sent++;
      } else {
        console.error(`Push to ${new URL(request.endpoint).host} failed: ${res.status}`);
      }
    }),
  );
  return { sent, removed, cursor: page.list_complete ? null : page.cursor };
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(watch(env));
  },

  async fetch(request, env) {
    const origins = env.SITE_ORIGINS.split(/\s+/);
    const origin = request.headers.get("Origin") ?? "";
    const cors = {
      "Access-Control-Allow-Origin": origins.includes(origin) ? origin : origins[0]!,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "Not found" }, 404);

    const path = new URL(request.url).pathname;
    const body = await request.json().catch(() => null);

    if (path === "/subscribe") {
      if (!isSubscription(body)) return json({ error: "Not a push subscription" }, 400);
      const { endpoint, keys } = body;
      await env.WATCHER.put(SUBSCRIBER_PREFIX + (await sha256(endpoint)), "", { metadata: { endpoint, keys } });
      return json({ ok: true });
    }
    if (path === "/unsubscribe") {
      const endpoint = (body as { endpoint?: unknown })?.endpoint;
      if (typeof endpoint !== "string") return json({ error: "Missing endpoint" }, 400);
      await env.WATCHER.delete(SUBSCRIBER_PREFIX + (await sha256(endpoint)));
      return json({ ok: true });
    }
    if (path === "/notify") {
      if (request.headers.get("Authorization") !== `Bearer ${env.NOTIFY_SECRET}`) {
        return json({ error: "Unauthorized" }, 401);
      }
      const { notification, cursor } = (body ?? {}) as { notification?: NewTitleNotification; cursor?: string | null };
      if (!notification?.title || !notification.url) return json({ error: "Missing notification" }, 400);
      return json(await notify(env, notification, cursor ?? null));
    }
    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
