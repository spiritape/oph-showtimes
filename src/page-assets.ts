// Inlined into every page so each page is a single request.

export const STYLES = `
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
.showtime{display:grid;grid-template-columns:5.2rem 64px 1fr auto;grid-template-areas:"time thumb info actions";gap:0 12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
.showtime.no-thumb{grid-template-columns:5.2rem 1fr auto;grid-template-areas:"time info actions"}
.time{grid-area:time;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
.thumb{grid-area:thumb;width:64px;aspect-ratio:5/3;border-radius:4px;overflow:hidden;background:var(--tag)}
.thumb img{display:block;width:100%;height:100%;object-fit:cover}
.info{grid-area:info;display:flex;flex-direction:column;min-width:0}
.name{font-weight:600;color:var(--fg);text-decoration:none}
.name:hover{text-decoration:underline}
.price{color:var(--muted);font-size:.85rem}
.tag{display:inline-block;background:var(--tag);color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:2px;font-weight:500}
.actions{grid-area:actions;display:flex;gap:10px;align-items:center}
.book{background:var(--accent);color:var(--accent-fg);padding:6px 12px;border-radius:6px;text-decoration:none;font-size:.85rem;font-weight:600;white-space:nowrap}
.add-cal{color:var(--muted);font-size:.8rem}
a{color:var(--accent)}
.empty{color:var(--muted);padding:24px 0}
.title-name{font-size:1.6rem;text-transform:none;letter-spacing:-.01em;color:var(--fg);margin:16px 0 0}
.hero{width:100%;height:auto;aspect-ratio:1280/770;object-fit:cover;border-radius:8px;margin-top:8px;background:var(--tag)}
.facts{color:var(--muted);margin:8px 0}
.synopsis{margin:12px 0 0}
footer{color:var(--muted);font-size:.85rem;padding-top:32px;padding-bottom:40px}
footer h3{color:var(--fg);font-size:.95rem;margin:24px 0 6px}
@media (max-width:30rem){.showtime{grid-template-columns:4.2rem 56px 1fr;grid-template-areas:"time thumb info" "time thumb actions";align-items:start}.showtime.no-thumb{grid-template-columns:4.2rem 1fr;grid-template-areas:"time info" "time actions"}.thumb{width:56px}.actions{margin-top:8px}}
`.replace(/\n/g, "");

// Pages are only rebuilt when the schedule changes (or every 3 hours). Between
// rebuilds this hides Showtimes 30 minutes after they start (see
// LISTED_AFTER_START_MINUTES) and keeps the Today/Tomorrow headings right.
export const CLIENT_SCRIPT = `(()=>{const n=Date.now(),f=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles"}),k=d=>f.format(d),t=k(n),m=k(n+864e5);
document.querySelectorAll("[data-start]").forEach(e=>{if(Date.parse(e.dataset.start)+18e5<n)e.remove()});
document.querySelectorAll("[data-day]").forEach(s=>{if(!s.querySelector("[data-start]")){s.remove();return}const h=s.querySelector("h2");h.textContent=s.dataset.day===t?"Today":s.dataset.day===m?"Tomorrow":h.dataset.label});
const l=document.querySelector("[data-list]");if(l&&!l.querySelector("[data-start]"))l.innerHTML='<p class="empty">Nothing else scheduled right now.</p>'})()`;
