// The watcher (docs/adr/0002): reads the Source every 2 minutes and starts the
// GitHub build when the schedule changes; stores Subscribers (browsers and app
// installs, docs/adr/0003) and sends New Title Notifications when the build asks.
import { buildPushHTTPRequest } from "@pushforge/builder";
import type { NewTitleNotification } from "../src/notification.ts";
import {
  addRequest,
  loadRanking,
  parseRequest,
  renderRequestsPage,
  searchFilms,
  topFilms,
  withdrawRequest,
} from "./requests.ts";
import { apnsToken, isAppSubscription, sendToApp, type ApnsConfig, type AppSubscription } from "./apns.ts";
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
  /** The app's bundle ID. */
  APNS_TOPIC: string;
  /** The team's APNs key; until it's set, app installs are skipped. */
  APNS_KEY?: string;
  APNS_KEY_ID?: string;
  APNS_TEAM_ID?: string;
  /** For Film Requests: searching films and saving their details. */
  TMDB_API_KEY?: string;
  /** The private part of the Film Requests page's link: /requests/<secret>. */
  REQUESTS_SECRET?: string;
}

const SCHEDULE_HASH_KEY = "schedule-hash";
const SUBSCRIBER_PREFIX = "sub:";
/** Workers' free plan allows 50 outbound requests per invocation. */
const SUBSCRIBERS_PER_PAGE = 40;

type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
/** What's stored for each Subscriber: a browser's push subscription, or an app install's token. */
type SubscriberMetadata = Subscription | { apns: AppSubscription };
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

/** Browsers are keyed by their endpoint, app installs by their token. */
const subscriberKey = async (s: Subscription | { apns: AppSubscription }) =>
  SUBSCRIBER_PREFIX + (await sha256("apns" in s ? `apns:${s.apns.token}` : s.endpoint));

function apnsConfig(env: Env): ApnsConfig | null {
  const { APNS_KEY: key, APNS_KEY_ID: keyId, APNS_TEAM_ID: teamId, APNS_TOPIC: topic } = env;
  return key && keyId && teamId ? { key, keyId, teamId, topic } : null;
}

async function sendToBrowser(env: Env, subscription: Subscription, notification: NewTitleNotification) {
  const request = await buildPushHTTPRequest({
    privateJWK: env.VAPID_PRIVATE_JWK,
    subscription: subscription as unknown as PushTarget,
    message: { payload: notification, adminContact: `mailto:${env.CONTACT_EMAIL}`, options: { ttl: 86_400 } },
  });
  const res = await fetch(request.endpoint, { method: "POST", headers: request.headers, body: request.body });
  // 404 and 410 mean the browser dropped this subscription.
  if (res.status === 404 || res.status === 410) return "gone";
  if (res.ok) return "sent";
  console.error(`Push to ${new URL(request.endpoint).host} failed: ${res.status}`);
  return "failed";
}

/** "app" sends only to app installs, for testing app builds without bothering browser Subscribers. */
type Audience = "everyone" | "app";

async function notify(env: Env, notification: NewTitleNotification, cursor: string | null, audience: Audience) {
  const apns = apnsConfig(env);
  const token = apns && (await apnsToken(apns, Math.floor(Date.now() / 1000)));
  const page = await env.WATCHER.list<SubscriberMetadata>({
    prefix: SUBSCRIBER_PREFIX,
    limit: SUBSCRIBERS_PER_PAGE,
    cursor: cursor ?? undefined,
  });
  let sent = 0;
  let removed = 0;
  let failed = 0;
  await Promise.all(
    page.keys.map(async ({ name, metadata }) => {
      if (!metadata) return;
      let result: "sent" | "gone" | "failed";
      if ("apns" in metadata) {
        if (!apns || !token) return;
        result = await sendToApp(metadata.apns, notification, apns, token);
      } else {
        if (audience === "app") return;
        result = await sendToBrowser(env, metadata, notification);
      }
      if (result === "gone") {
        await env.WATCHER.delete(name);
        removed++;
      } else if (result === "sent") {
        sent++;
      } else {
        failed++;
      }
    }),
  );
  return { sent, removed, failed, cursor: page.list_complete ? null : page.cursor };
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
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET") {
      if (path === "/films/search") {
        const query = url.searchParams.get("q")?.trim() ?? "";
        if (!env.TMDB_API_KEY) return json({ error: "Film search isn't set up" }, 503);
        if (query.length < 2 || query.length > 100) return json({ films: [] });
        return json({ films: await searchFilms(env.TMDB_API_KEY, query) });
      }
      if (path === "/requests/top") {
        const films = topFilms(await loadRanking(env.WATCHER));
        // A minute's caching keeps busy moments cheap; a new request shows soon after.
        return new Response(JSON.stringify({ films }), {
          headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
        });
      }
      if (env.REQUESTS_SECRET && path === `/requests/${env.REQUESTS_SECRET}`) {
        const page = renderRequestsPage(await loadRanking(env.WATCHER), new Date());
        return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
      }
      return json({ error: "Not found" }, 404);
    }
    if (request.method !== "POST") return json({ error: "Not found" }, 404);

    const body = await request.json().catch(() => null);

    if (path === "/requests" || path === "/requests/withdraw") {
      const parsed = parseRequest(body);
      if (!parsed) return json({ error: "Expected { installId, tmdbId }" }, 400);
      if (path === "/requests/withdraw") {
        await withdrawRequest(env.WATCHER, parsed.installId, parsed.tmdbId);
        return json({ ok: true });
      }
      if (!env.TMDB_API_KEY) return json({ error: "Film Requests aren't set up" }, 503);
      return json({ film: await addRequest(env.WATCHER, env.TMDB_API_KEY, parsed.installId, parsed.tmdbId) });
    }

    if (path === "/subscribe") {
      // The app sends { apns: { token, environment } }; browsers send their push subscription.
      const app = (body as { apns?: unknown })?.apns;
      let metadata: SubscriberMetadata;
      if (isAppSubscription(app)) metadata = { apns: { token: app.token, environment: app.environment } };
      else if (isSubscription(body)) metadata = { endpoint: body.endpoint, keys: body.keys };
      else return json({ error: "Not a push subscription" }, 400);
      await env.WATCHER.put(await subscriberKey(metadata), "", { metadata });
      return json({ ok: true });
    }
    if (path === "/unsubscribe") {
      const { endpoint, apns } = (body ?? {}) as { endpoint?: unknown; apns?: { token?: unknown } };
      if (typeof apns?.token === "string") {
        await env.WATCHER.delete(await subscriberKey({ apns: { token: apns.token, environment: "production" } }));
      } else if (typeof endpoint === "string") {
        await env.WATCHER.delete(SUBSCRIBER_PREFIX + (await sha256(endpoint)));
      } else {
        return json({ error: "Missing endpoint or token" }, 400);
      }
      return json({ ok: true });
    }
    if (path === "/notify") {
      if (request.headers.get("Authorization") !== `Bearer ${env.NOTIFY_SECRET}`) {
        return json({ error: "Unauthorized" }, 401);
      }
      const { notification, cursor, audience } = (body ?? {}) as {
        notification?: NewTitleNotification;
        cursor?: string | null;
        audience?: Audience;
      };
      if (!notification?.title || !notification.url) return json({ error: "Missing notification" }, 400);
      return json(await notify(env, notification, cursor ?? null, audience === "app" ? "app" : "everyone"));
    }
    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
