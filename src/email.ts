import { categoryLabel, titlePath } from "./showtime.ts";
import { dayLabel, timeLabel } from "./time.ts";
import type { Title } from "./types.ts";

export type Alert = { subject: string; body: string };

/** One New Title Alert covering every new Title found in a run. */
export function composeAlert(newTitles: Title[], siteUrl: string): Alert {
  const names = newTitles.map((t) => t.name);
  const subject =
    names.length <= 2
      ? `New at the Playhouse: ${names.join(", ")}`
      : `New at the Playhouse: ${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  const lines = newTitles.map((t) => {
    const first = t.showtimes[0]!;
    return `- ${t.name} (${categoryLabel(t)}): first showing ${dayLabel(first.startsAt)}, ${timeLabel(first.startsAt)}. ${siteUrl}${titlePath(t)}`;
  });
  const body = [
    "Just announced at the Ojai Playhouse:",
    "",
    ...lines,
    "",
    `Full schedule: ${siteUrl}/`,
    "",
    "OPH Showtimes is an unofficial schedule and isn't affiliated with the Ojai Playhouse. Always confirm times at ojaiplayhouse.com.",
  ].join("\n");
  return { subject, body };
}

export async function sendAlert(alert: Alert, apiKey: string): Promise<void> {
  const res = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ subject: alert.subject, body: alert.body, status: "about_to_send" }),
  });
  if (!res.ok) throw new Error(`Buttondown responded ${res.status}: ${await res.text()}`);
}
