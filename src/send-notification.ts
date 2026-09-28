// Sends the queued New Title Notification through the watcher Worker, one
// page of Subscribers at a time (see docs/adr/0002). Runs after deploy so the
// notification's link works.
import { existsSync, readFileSync, rmSync } from "node:fs";
import type { NewTitleNotification } from "./notification.ts";
import { NOTIFICATION_FILE } from "./paths.ts";

if (!existsSync(NOTIFICATION_FILE)) {
  console.log("No New Titles; nothing to send.");
  process.exit(0);
}
const notification: NewTitleNotification = JSON.parse(readFileSync(NOTIFICATION_FILE, "utf8"));
rmSync(NOTIFICATION_FILE);

const watcherUrl = process.env.WATCHER_URL;
const secret = process.env.NOTIFY_SECRET;
if (!watcherUrl || !secret) {
  console.log(`WATCHER_URL or NOTIFY_SECRET not set; would have sent "${notification.title}".`);
  process.exit(0);
}

let cursor: string | null = null;
let sent = 0;
let removed = 0;
do {
  const res = await fetch(`${watcherUrl}/notify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ notification, cursor }),
  });
  if (!res.ok) throw new Error(`Watcher responded ${res.status}: ${await res.text()}`);
  const page = (await res.json()) as { sent: number; removed: number; cursor: string | null };
  sent += page.sent;
  removed += page.removed;
  cursor = page.cursor;
} while (cursor);
console.log(`Sent "${notification.title}" to ${sent} Subscribers (${removed} expired subscriptions removed).`);
