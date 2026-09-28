import { CLIENT_SCRIPT, NOTIFY_SCRIPT, STYLES } from "./page-assets.ts";
import { THEATER } from "./theater.ts";
import { bookingLink, categoryLabel, googleCalendarUrl, isListed, thumbnailUrl, titlePath } from "./showtime.ts";
import { dayKey, dayLabel, timeLabel } from "./time.ts";
import type { ScheduledShowtime, Showtime, Title } from "./types.ts";

export type SiteConfig = {
  siteUrl: string;
  /** New Title Notifications; off when the watcher isn't configured. */
  notifications: { watcherUrl: string; vapidPublicKey: string } | null;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(opts: { title: string; description: string; body: string; config: SiteConfig; path: string }) {
  const { config } = opts;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.title)}</title><meta name="description" content="${escapeHtml(opts.description)}">
<link rel="canonical" href="${config.siteUrl}${opts.path}"><meta name="color-scheme" content="light dark">
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#2d2a8c">
<style>${STYLES}</style></head><body>
<header><h1><a href="/">OPH Showtimes</a></h1><p class="sub">An unofficial schedule for the Ojai Playhouse</p>
<p class="theater"><a href="${THEATER.mapsUrl}" rel="noopener">${THEATER.address}</a> · <a href="${THEATER.phoneHref}">${THEATER.phone}</a></p>${notifyButton(config)}</header>
<main>${opts.body}</main>
${footer()}
<script>${CLIENT_SCRIPT}</script>${config.notifications ? `<script>${NOTIFY_SCRIPT}</script>` : ""}</body></html>`;
}

// Hidden until the script has checked this browser can take notifications.
function notifyButton(config: SiteConfig) {
  const n = config.notifications;
  if (!n) return "";
  return `<p class="notify"><button type="button" data-notify data-api="${escapeHtml(n.watcherUrl)}" data-key="${escapeHtml(n.vapidPublicKey)}" hidden>🔔 Notify me of new titles</button></p><p class="notify-tip" data-notify-tip role="status" hidden></p>`;
}

function footer() {
  return `<footer>
<h3>About</h3>
<p>Not affiliated with the Ojai Playhouse. Times are Pacific and come from <a href="https://www.ojaiplayhouse.com/">ojaiplayhouse.com</a>, checked every 15 minutes. Always confirm there before you go. Follow the Playhouse on <a href="https://www.instagram.com/ojaiplayhouse">Instagram</a>.</p></footer>`;
}

function actions(title: Title, s: Showtime, config: SiteConfig) {
  const booking = bookingLink(s);
  const link = booking ? `<a class="book" href="${escapeHtml(booking.url)}" rel="noopener">${booking.label}</a>` : "";
  const free = booking?.free ? freeIcon(title.isFilm ? "Free screening" : "Free event") : "";
  const calendar = googleCalendarUrl({ title, showtime: s }, config.siteUrl);
  return `<span class="actions">${free}${link}<a class="add-cal" href="${escapeHtml(calendar)}" target="_blank" rel="noopener" title="Add to Google Calendar" aria-label="Add to Google Calendar">${CALENDAR_ICON}</a></span>`;
}

const CALENDAR_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3" fill="#fff" stroke="#4285f4" stroke-width="1.6"/><path d="M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2H3Z" fill="#4285f4"/><path d="M8 2.5v3M16 2.5v3" stroke="#4285f4" stroke-width="1.6" stroke-linecap="round"/><text x="12" y="18.2" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" font-weight="700" fill="#4285f4">31</text></svg>`;

// A small price tag, so free Showtimes stand out without another badge.
const freeIcon = (label: string) =>
  `<span class="free" role="img" aria-label="${label}" title="${label}"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8.6 1.5H14v5.4l-6.8 6.8a1.2 1.2 0 0 1-1.7 0L2.3 10.5a1.2 1.2 0 0 1 0-1.7Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="11" cy="4.5" r="1.1" fill="currentColor"/></svg></span>`;

const tag = (title: Title) => `<span class="tag">${escapeHtml(categoryLabel(title))}</span>`;

function thumbnail(title: Title) {
  const src = thumbnailUrl(title.imageUrl);
  return `<span class="thumb">${src ? `<img src="${escapeHtml(src)}" alt="" width="64" height="38" loading="lazy" decoding="async">` : ""}</span>`;
}

type RowStyle = { showTitle: boolean; showTag: boolean };

function showtimeRow(title: Title, s: Showtime, config: SiteConfig, style: RowStyle) {
  const heading = style.showTitle
    ? `<span><a class="name" href="${titlePath(title)}">${escapeHtml(title.name)}</a>${style.showTag ? tag(title) : ""}</span>`
    : `<span>${escapeHtml(dayLabel(s.startsAt))}</span>`;
  const price = s.price ? `<span class="price">${escapeHtml(s.price.replace(/\n/g, " · "))}</span>` : "";
  return `<li class="showtime${style.showTitle ? "" : " no-thumb"}" data-start="${s.startsAt}"><span class="time">${timeLabel(s.startsAt)}</span>${style.showTitle ? thumbnail(title) : ""}<span class="info">${heading}${price}</span>${actions(title, s, config)}</li>`;
}

function dayHeading(day: string, firstStart: string, now: Date) {
  if (day === dayKey(now)) return "Today";
  if (day === dayKey(new Date(now.getTime() + 86_400_000))) return "Tomorrow";
  return dayLabel(firstStart);
}

export type ScheduleFilter = "all" | "films" | "live";

const FILTERS: Record<ScheduleFilter, { label: string; path: string; pageTitle: string; include: (t: Title) => boolean }> = {
  all: { label: "Everything", path: "/", pageTitle: "OPH Showtimes", include: () => true },
  films: { label: "Films", path: "/films/", pageTitle: "Films · OPH Showtimes", include: (t) => t.isFilm },
  live: { label: "Live shows", path: "/live/", pageTitle: "Live shows · OPH Showtimes", include: (t) => !t.isFilm },
};

export const SCHEDULE_PAGES = Object.entries(FILTERS).map(([filter, f]) => ({
  filter: filter as ScheduleFilter,
  file: `${f.path.slice(1)}index.html`,
}));

export function renderSchedule(titles: Title[], config: SiteConfig, opts: { filter: ScheduleFilter; now: Date }) {
  const { now } = opts;
  const filter = FILTERS[opts.filter];
  const listed: ScheduledShowtime[] = titles
    .filter(filter.include)
    .flatMap((title) => title.showtimes.filter((s) => isListed(s, now)).map((showtime) => ({ title, showtime })))
    .sort((a, b) => a.showtime.startsAt.localeCompare(b.showtime.startsAt));
  const days = new Map<string, ScheduledShowtime[]>();
  for (const entry of listed) {
    const day = dayKey(entry.showtime.startsAt);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }

  // A Films-only list doesn't need a "Film" tag on every row.
  const style: RowStyle = { showTitle: true, showTag: opts.filter !== "films" };
  const list = [...days]
    .map(([day, entries]) => {
      const first = entries[0]!.showtime.startsAt;
      const rows = entries.map(({ title, showtime }) => showtimeRow(title, showtime, config, style));
      return `<section data-day="${day}"><h2 data-label="${escapeHtml(dayLabel(first))}">${dayHeading(day, first, now)}</h2><ul>${rows.join("")}</ul></section>`;
    })
    .join("");
  const nav = `<nav>${Object.entries(FILTERS)
    .map(([key, f]) => `<a href="${f.path}"${key === opts.filter ? ' aria-current="page"' : ""}>${f.label}</a>`)
    .join("")}</nav>`;
  return page({
    title: filter.pageTitle,
    description: "What's playing at the Ojai Playhouse: every upcoming Showtime, by day.",
    path: filter.path,
    config,
    body: `${nav}<div data-list>${list || '<p class="empty">Nothing scheduled right now.</p>'}</div>`,
  });
}

export function renderTitle(title: Title, config: SiteConfig, now: Date) {
  const upcoming = title.showtimes.filter((s) => isListed(s, now));
  const facts = [title.year, title.director, title.runtime, title.rating && `Rated ${title.rating}`].filter(
    (f): f is string => Boolean(f),
  );
  const body = `<article>
<h2 class="title-name">${escapeHtml(title.name)}${tag(title)}</h2>
${title.subtitle ? `<p class="sub">${escapeHtml(title.subtitle)}</p>` : ""}
${title.imageUrl ? `<img class="hero" src="${escapeHtml(title.imageUrl)}" alt="" width="1280" height="770" decoding="async">` : ""}
${facts.length ? `<p class="facts">${facts.map(escapeHtml).join(" · ")}</p>` : ""}
${title.synopsis ? `<p class="synopsis">${escapeHtml(title.synopsis)}</p>` : ""}
${title.livestreamUrl ? `<p><a href="${escapeHtml(title.livestreamUrl)}" rel="noopener">Watch the livestream</a></p>` : ""}
<h2>Showtimes</h2>
<div data-list>${
    upcoming.length
      ? `<ul>${upcoming.map((s) => showtimeRow(title, s, config, { showTitle: false, showTag: false })).join("")}</ul>`
      : `<p class="empty">No upcoming Showtimes. <a href="/">See what's playing</a>.</p>`
  }</div></article>`;
  return page({
    title: `${title.name} · OPH Showtimes`,
    description: title.synopsis?.slice(0, 160) ?? `${title.name} at the Ojai Playhouse`,
    path: titlePath(title),
    config,
    body,
  });
}

export function renderNotFound(config: SiteConfig) {
  return page({
    title: "Not found · OPH Showtimes",
    description: "Page not found",
    path: "/404",
    config,
    body: `<p class="empty">That page isn't here. It may have been a Title that finished a while ago. <a href="/">See what's playing</a>.</p>`,
  });
}
