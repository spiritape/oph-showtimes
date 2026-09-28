import { categoryLabel, titlePath } from "./showtime.ts";
import { dayLabel, timeLabel } from "./time.ts";
import type { Title } from "./types.ts";

/** What a Subscriber sees, and where tapping it goes. */
export type NewTitleNotification = { title: string; body: string; url: string };

/** One New Title Notification covering every New Title found in a check. */
export function composeNotification(newTitles: Title[], siteUrl: string): NewTitleNotification {
  const [only] = newTitles;
  if (newTitles.length === 1 && only) {
    const first = only.showtimes[0]!.startsAt;
    return {
      title: `New at the Playhouse: ${only.name}`,
      body: `${categoryLabel(only)} · first showing ${dayLabel(first)}, ${timeLabel(first)}`,
      url: siteUrl + titlePath(only),
    };
  }
  return {
    title: `${newTitles.length} new at the Playhouse`,
    body: newTitles.map((t) => t.name).join(", "),
    url: `${siteUrl}/`,
  };
}
