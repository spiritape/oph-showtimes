import { dayKey, dayLabel, timeLabel } from "./time.ts";
import type { Showtime, Title } from "./types.ts";

export type SiteConfig = {
  siteUrl: string;
  buttondownUsername: string | null;
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const CSS = `
:root{--bg:#fbf9f4;--fg:#1d1b18;--muted:#6f6a62;--line:#e4dfd5;--accent:#2d2a8c;--accent-fg:#fff;--tag:#efeae0}
@media (prefers-color-scheme:dark){:root{--bg:#141312;--fg:#eeeae3;--muted:#9c968c;--line:#2b2926;--accent:#a9a6ff;--accent-fg:#141312;--tag:#26241f}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}
main,header,footer{max-width:40rem;margin:0 auto;padding:0 16px}
header{padding-top:24px;padding-bottom:8px}
h1{font-size:1.35rem;margin:0;letter-spacing:-.01em}
h1 a{color:inherit;text-decoration:none}
.sub{color:var(--muted);margin:2px 0 0;font-size:.9rem}
nav{display:flex;gap:6px;margin:16px 0 4px}
nav a{padding:6px 12px;border-radius:99px;border:1px solid var(--line);color:var(--fg);text-decoration:none;font-size:.9rem}
nav a[aria-current]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
h2{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:28px 0 4px;font-weight:600}
ul{list-style:none;margin:0;padding:0}
li.s{display:grid;grid-template-columns:5.2rem 1fr auto;gap:2px 12px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--line)}
.t{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
.n{font-weight:600;color:var(--fg);text-decoration:none}
.n:hover{text-decoration:underline}
.m{grid-column:2;color:var(--muted);font-size:.85rem}
.tag{display:inline-block;background:var(--tag);color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:2px;font-weight:500}
.b{grid-row:1/span 2;grid-column:3;align-self:center;display:flex;gap:10px;align-items:center}
.btn{background:var(--accent);color:var(--accent-fg);padding:6px 12px;border-radius:6px;text-decoration:none;font-size:.85rem;font-weight:600;white-space:nowrap}
.cal{color:var(--muted);font-size:.8rem}
a{color:var(--accent)}
.empty{color:var(--muted);padding:24px 0}
.hero{width:100%;height:auto;aspect-ratio:1280/770;object-fit:cover;border-radius:8px;margin-top:8px;background:var(--tag)}
.facts{color:var(--muted);margin:8px 0}
.syn{margin:12px 0 0}
footer{color:var(--muted);font-size:.85rem;padding-top:32px;padding-bottom:40px}
footer h3{color:var(--fg);font-size:.95rem;margin:24px 0 6px}
form{display:flex;gap:8px;flex-wrap:wrap}
input[type=email]{flex:1;min-width:12rem;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);font:inherit}
button{background:var(--fg);color:var(--bg);border:0;border-radius:6px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer}
@media (max-width:30rem){li.s{grid-template-columns:4.6rem 1fr}.b{grid-row:auto;grid-column:2;margin-top:6px}}
`.replace(/\n/g, "");

// Hides Showtimes 30 minutes after they start and relabels Today/Tomorrow,
// since pages are only rebuilt every few hours.
const SCRIPT = `(()=>{const n=Date.now(),f=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles"}),k=d=>f.format(d),t=k(n),m=k(n+864e5);
document.querySelectorAll("[data-start]").forEach(e=>{if(Date.parse(e.dataset.start)+18e5<n)e.remove()});
document.querySelectorAll("[data-day]").forEach(s=>{if(!s.querySelector("[data-start]")){s.remove();return}const h=s.querySelector("h2");if(s.dataset.day===t)h.textContent="Today";else if(s.dataset.day===m)h.textContent="Tomorrow";else h.textContent=h.dataset.label});
const l=document.querySelector("[data-list]");if(l&&!l.querySelector("[data-start]"))l.innerHTML='<p class="empty">Nothing else scheduled right now.</p>'})()`;

function page(opts: { title: string; description: string; body: string; config: SiteConfig; path: string }) {
  const { config } = opts;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.title)}</title><meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${config.siteUrl}${opts.path}"><meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎞</text></svg>">
<style>${CSS}</style></head><body>
<header><h1><a href="/">OPH Showtimes</a></h1><p class="sub">An unofficial schedule for the Ojai Playhouse</p></header>
<main>${opts.body}</main>
${footer(config)}
<script>${SCRIPT}</script></body></html>`;
}

function footer(config: SiteConfig) {
  const host = config.siteUrl.replace(/^https?:\/\//, "");
  const signup = config.buttondownUsername
    ? `<h3>Get an email when new titles are announced</h3>
<form action="https://buttondown.com/api/emails/embed-subscribe/${esc(config.buttondownUsername)}" method="post">
<input type="email" name="email" placeholder="you@example.com" required aria-label="Email address"><button>Subscribe</button></form>`
    : "";
  return `<footer>${signup}
<h3>Add to your calendar</h3>
<p><a href="webcal://${host}/calendar/all.ics">Everything</a> · <a href="webcal://${host}/calendar/films.ics">Films only</a> · <a href="/calendar/all.ics">download .ics</a></p>
<h3>About</h3>
<p>Not affiliated with the Ojai Playhouse. Times are Pacific and come from <a href="https://www.ojaiplayhouse.com/">ojaiplayhouse.com</a>, checked every few hours. Always confirm there before you go. Follow the Playhouse on <a href="https://www.instagram.com/ojaiplayhouse">Instagram</a>.</p>
<p>145 E. Ojai Ave, Ojai · Box office opens 60 minutes before showtime at 107 S. Signal St.</p></footer>`;
}

function actions(s: Showtime) {
  const link = s.ticketUrl
    ? `<a class="btn" href="${esc(s.ticketUrl)}" rel="noopener">Tickets</a>`
    : s.rsvpUrl
      ? `<a class="btn" href="${esc(s.rsvpUrl)}" rel="noopener">RSVP</a>`
      : "";
  return `<span class="b">${link}<a class="cal" href="/ics/${esc(s.id)}.ics" title="Add to calendar">+ Cal</a></span>`;
}

function showtimeRow(title: Title, s: Showtime, withName: boolean) {
  const tag = title.isFilm || !title.category ? "" : `<span class="tag">${esc(title.category)}</span>`;
  const name = withName ? `<a class="n" href="/t/${title.slug}/">${esc(title.name)}</a>${tag}` : `<span>${esc(dayLabel(s.startsAt))}</span>`;
  const meta = s.price ? `<span class="m">${esc(s.price.replace(/\n/g, " · "))}</span>` : "";
  return `<li class="s" data-start="${s.startsAt}"><span class="t">${timeLabel(s.startsAt)}</span>${name}${meta}${actions(s)}</li>`;
}

export function renderSchedule(titles: Title[], config: SiteConfig, filmsOnly: boolean) {
  const rows = titles
    .filter((t) => !filmsOnly || t.isFilm)
    .flatMap((t) => t.showtimes.map((s) => ({ t, s })))
    .sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt));
  const days = new Map<string, typeof rows>();
  for (const r of rows) days.set(dayKey(r.s.startsAt), [...(days.get(dayKey(r.s.startsAt)) ?? []), r]);

  const list = [...days]
    .map(([day, rs]) => {
      const label = dayLabel(rs[0]!.s.startsAt);
      return `<section data-day="${day}"><h2 data-label="${esc(label)}">${esc(label)}</h2><ul>${rs.map(({ t, s }) => showtimeRow(t, s, true)).join("")}</ul></section>`;
    })
    .join("");
  const nav = `<nav><a href="/"${filmsOnly ? "" : ' aria-current="page"'}>Everything</a><a href="/films/"${filmsOnly ? ' aria-current="page"' : ""}>Films only</a></nav>`;
  return page({
    title: filmsOnly ? "Films · OPH Showtimes" : "OPH Showtimes",
    description: "What's playing at the Ojai Playhouse: every upcoming screening and event, by day.",
    path: filmsOnly ? "/films/" : "/",
    config,
    body: `${nav}<div data-list>${list || '<p class="empty">Nothing scheduled right now.</p>'}</div>`,
  });
}

export function renderTitle(title: Title, config: SiteConfig, now: Date) {
  const upcoming = title.showtimes.filter((s) => Date.parse(s.startsAt) + 30 * 60_000 > now.getTime());
  const facts = [title.year, title.director, title.runtime, title.rating && `Rated ${title.rating}`].filter(Boolean);
  const cat = title.isFilm || !title.category ? "" : `<span class="tag">${esc(title.category)}</span>`;
  const body = `<article>
<h2 style="font-size:1.6rem;text-transform:none;letter-spacing:-.01em;color:var(--fg);margin:16px 0 0">${esc(title.name)}${cat}</h2>
${title.subtitle ? `<p class="sub">${esc(title.subtitle)}</p>` : ""}
${title.imageUrl ? `<img class="hero" src="${esc(title.imageUrl)}" alt="" width="1280" height="770" decoding="async">` : ""}
${facts.length ? `<p class="facts">${facts.map((f) => esc(f!)).join(" · ")}</p>` : ""}
${title.synopsis ? `<p class="syn">${esc(title.synopsis)}</p>` : ""}
${title.livestreamUrl ? `<p><a href="${esc(title.livestreamUrl)}" rel="noopener">Watch the livestream</a></p>` : ""}
<h2>Showtimes</h2>
<div data-list>${
    upcoming.length
      ? `<ul>${upcoming.map((s) => showtimeRow(title, s, false)).join("")}</ul>`
      : `<p class="empty">No upcoming Showtimes. <a href="/">See what's playing</a>.</p>`
  }</div></article>`;
  return page({
    title: `${title.name} · OPH Showtimes`,
    description: title.synopsis?.slice(0, 160) ?? `${title.name} at the Ojai Playhouse`,
    path: `/t/${title.slug}/`,
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
