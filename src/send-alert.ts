// Sends the queued New Title Alert, if any. Runs after the site is deployed so links work.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { ALERT_FILE } from "./paths.ts";
import { sendAlert, type Alert } from "./email.ts";

if (!existsSync(ALERT_FILE)) {
  console.log("No new Titles; nothing to send.");
} else {
  const alert: Alert = JSON.parse(readFileSync(ALERT_FILE, "utf8"));
  const key = process.env.BUTTONDOWN_API_KEY;
  if (!key) {
    console.log(`BUTTONDOWN_API_KEY not set; would have sent "${alert.subject}".`);
  } else {
    await sendAlert(alert, key);
    console.log(`Sent "${alert.subject}".`);
  }
  rmSync(ALERT_FILE);
}
