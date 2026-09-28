import { CLIENT_SCRIPT, STYLES } from "./page-assets.ts";
import { bookingLink, categoryLabel, isListed, titlePath } from "./showtime.ts";
import { dayKey, dayLabel, timeLabel } from "./time.ts";
import type { ScheduledShowtime, Showtime, Title } from "./types.ts";

export type SiteConfig = {
  siteUrl: string;
  buttondownUsername: string | null;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(opts: { title: string; description: string; body: string; config: SiteConfig; path: string }) {
  const { config } = opts;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.title)}</title><meta name="description" content="${escapeHtml(opts.description)}">
<link rel="canonical" href="${config.siteUrl}${opts.path}"><meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎞</text></svg>">
<style>${STYLES}</style></head><body>
<header><h1><a href="/">OPH Showtimes</a></h1><p class="sub">An unofficial schedule for the Ojai Playhouse</p></header>
<main>${opts.body}</main>
${footer(config)}
<script>${CLIENT_SCRIPT}</script></body></html>`;
}

function footer(config: SiteConfig) {
  const host = config.siteUrl.replace(/^https?:\/\//, "");
  const signup = config.buttondownUsername
    ? `<h3>Get an email when new titles are announced</h3>
<form action="https://buttondown.com/api/emails/embed-subscribe/${escapeHtml(config.buttondownUsername)}" method="post">
<input type="email" name="email" placeholder="you@example.com" required aria-label="Email address"><button>Subscribe</button></form>`
    : "";
  return `<footer>${signup}
<h3>Add to your calendar</h3>
<p><a href="webcal://${host}/calendar/all.ics">Everything</a> · <a href="webcal://${host}/calendar/films.ics">Films only</a></p>
<h3>About</h3>
<p>Not affiliated with the Ojai Playhouse. Times are Pacific and come from <a href="https://www.ojaiplayhouse.com/">ojaiplayhouse.com</a>, checked every few hours. Always confirm there before you go. Follow the Playhouse on <a href="https://www.instagram.com/ojaiplayhouse">Instagram</a>.</p></footer>`;
}

function actions(s: Showtime) {
  const booking = bookingLink(s);
  const link = booking ? `<a class="book" href="${escapeHtml(booking.url)}" rel="noopener">${booking.label}</a>` : "";
  return `<span class="actions">${link}<a class="add-cal" href="/ics/${escapeHtml(s.id)}.ics" title="Add to calendar">+ Cal</a></span>`;
}

const tag = (title: Title) => `<span class="tag">${escapeHtml(categoryLabel(title))}</span>`;

function showtimeRow(title: Title, s: Showtime, label: "title" | "title-no-tag" | "day") {
  const what =
    label === "day"
      ? `<span>${escapeHtml(dayLabel(s.startsAt))}</span>`
      : `<span><a class="name" href="${titlePath(title)}">${escapeHtml(title.name)}</a>${label === "title" ? tag(title) : ""}</span>`;
  const price = s.price ? `<span class="price">${escapeHtml(s.price.replace(/\n/g, " · "))}</span>` : "";
  return `<li class="showtime" data-start="${s.startsAt}"><span class="time">${timeLabel(s.startsAt)}</span>${what}${price}${actions(s)}</li>`;
}

function dayHeading(day: string, firstStart: string, now: Date) {
  if (day === dayKey(now)) return "Today";
  if (day === dayKey(new Date(now.getTime() + 86_400_000))) return "Tomorrow";
  return dayLabel(firstStart);
}

export function renderSchedule(titles: Title[], config: SiteConfig, opts: { filmsOnly: boolean; now: Date }) {
  const { filmsOnly, now } = opts;
  const listed: ScheduledShowtime[] = titles
    .filter((title) => !filmsOnly || title.isFilm)
    .flatMap((title) => title.showtimes.filter((s) => isListed(s, now)).map((showtime) => ({ title, showtime })))
    .sort((a, b) => a.showtime.startsAt.localeCompare(b.showtime.startsAt));
  const days = new Map<string, ScheduledShowtime[]>();
  for (const entry of listed) {
    const day = dayKey(entry.showtime.startsAt);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }

  const list = [...days]
    .map(([day, entries]) => {
      const first = entries[0]!.showtime.startsAt;
      const rows = entries.map(({ title, showtime }) => showtimeRow(title, showtime, filmsOnly ? "title-no-tag" : "title"));
      return `<section data-day="${day}"><h2 data-label="${escapeHtml(dayLabel(first))}">${dayHeading(day, first, now)}</h2><ul>${rows.join("")}</ul></section>`;
    })
    .join("");
  const nav = `<nav><a href="/"${filmsOnly ? "" : ' aria-current="page"'}>Everything</a><a href="/films/"${filmsOnly ? ' aria-current="page"' : ""}>Films only</a></nav>`;
  return page({
    title: filmsOnly ? "Films · OPH Showtimes" : "OPH Showtimes",
    description: "What's playing at the Ojai Playhouse: every upcoming Showtime, by day.",
    path: filmsOnly ? "/films/" : "/",
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
      ? `<ul>${upcoming.map((s) => showtimeRow(title, s, "day")).join("")}</ul>`
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
