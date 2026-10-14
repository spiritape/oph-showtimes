import { categoryLabel, thumbnailUrl, titlePath } from "./showtime.ts";
import { dayLabel, timeLabel } from "./time.ts";
import type { Title } from "./types.ts";

/**
 * What a Subscriber sees, and where tapping it goes. The app also opens the
 * Title in-app when there's only one, and shows the first New Title's poster.
 */
export type NewTitleNotification = { title: string; body: string; url: string; titleSlug?: string; imageUrl?: string };

/** One New Title Notification covering every New Title found in a check. */
export function composeNotification(newTitles: Title[], siteUrl: string): NewTitleNotification {
  const [only] = newTitles;
  // Notification attachments are size-limited, so ask for a 600px version when the host can make one.
  const poster = newTitles.find((t) => t.imageUrl)?.imageUrl ?? null;
  const imageUrl = thumbnailUrl(poster, 600) ?? poster;
  const image = imageUrl ? { imageUrl } : {};
  if (newTitles.length === 1 && only) {
    const first = only.showtimes[0]!.startsAt;
    return {
      title: `New at the Playhouse: ${only.name}`,
      body: `${categoryLabel(only)} · first showing ${dayLabel(first)}, ${timeLabel(first)}`,
      url: siteUrl + titlePath(only),
      titleSlug: only.slug,
      ...image,
    };
  }
  return {
    title: `${newTitles.length} new at the Playhouse`,
    body: newTitles.map((t) => t.name).join(", "),
    url: `${siteUrl}/`,
    ...image,
  };
}
