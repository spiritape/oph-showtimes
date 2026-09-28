// Inlined into every page so each page is a single request.

export const STYLES = `
:root{--free:#1f8a4c;--bg:#fbf9f4;--fg:#1d1b18;--muted:#6f6a62;--line:#e4dfd5;--accent:#2d2a8c;--accent-fg:#fff;--tag:#efeae0}
@media (prefers-color-scheme:dark){:root{--free:#5fd08f;--bg:#141312;--fg:#eeeae3;--muted:#9c968c;--line:#2b2926;--accent:#a9a6ff;--accent-fg:#141312;--tag:#26241f}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}
main,header,footer{max-width:40rem;margin:0 auto;padding:0 16px}
header{padding-top:24px;padding-bottom:8px}
h1{font-size:1.35rem;margin:0;letter-spacing:-.01em}
h1 a{color:inherit;text-decoration:none}
.sub{color:var(--muted);margin:2px 0 0;font-size:.9rem}
.theater{margin:6px 0 0;font-size:.85rem;color:var(--muted)}
.notify{margin:10px 0 0}
.notify button{font:inherit;font-size:.85rem;font-weight:600;padding:6px 12px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--fg);cursor:pointer}
.notify button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}
.notify button:disabled{opacity:.5}
.notify-tip{margin:6px 0 0;font-size:.8rem;color:var(--muted)}
.theater a{color:inherit;text-decoration-color:var(--line);text-underline-offset:3px}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0 4px}
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
.free{display:inline-flex;color:var(--free);margin-right:-4px}
.add-cal{display:inline-flex;padding:4px;border-radius:6px;line-height:0}
.add-cal:hover{background:var(--tag)}
a{color:var(--accent)}
.empty{color:var(--muted);padding:24px 0}
.title-name{font-size:1.6rem;text-transform:none;letter-spacing:-.01em;color:var(--fg);margin:16px 0 0}
.hero{width:100%;height:auto;aspect-ratio:1280/770;object-fit:cover;border-radius:8px;margin-top:8px;background:var(--tag)}
.facts{color:var(--muted);margin:8px 0}
.synopsis{margin:12px 0 0}
.past li{display:grid;grid-template-columns:5.2rem 1fr;gap:0 12px;padding:10px 0;border-bottom:1px solid var(--line);color:var(--muted)}
.past .time{grid-area:auto}
.past .name{color:var(--muted)}
.past-panel{display:none}
@media (min-width:66rem){.past-tab{display:none}
.past-panel{display:block;position:fixed;top:24px;left:calc(50% + 21rem);width:13rem;max-height:min(22rem,calc(100vh - 48px));overflow-y:auto;border:1px solid var(--line);border-radius:8px;padding:2px 12px 10px;font-size:.8rem;color:var(--muted)}
.past-panel h2{margin:10px 0 2px}
.past-panel h2 a{color:inherit;text-decoration:none}
.past-panel h3{font-size:.72rem;font-weight:600;margin:10px 0 2px;color:var(--muted)}
.past-panel li{display:flex;gap:6px;padding:2px 0}
.past-panel .time{font-weight:500;flex:none;width:4.2rem}
.past-panel .name{color:var(--muted);font-weight:500}}
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

// The "Notify me" button. Registers /sw.js, subscribes to Web Push with the
// watcher's public key and hands the subscription to the watcher. On an iPhone
// that hasn't added the site to its home screen, it explains how instead.
export const NOTIFY_SCRIPT = `(async()=>{const b=document.querySelector("[data-notify]"),tip=document.querySelector("[data-notify-tip]");if(!b)return;
const api=b.dataset.api,key=b.dataset.key,say=t=>{tip.textContent=t;tip.hidden=false};
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),home=navigator.standalone||matchMedia("(display-mode: standalone)").matches;
if(!("serviceWorker" in navigator)||!("PushManager" in window)){if(ios&&!home){b.hidden=false;b.onclick=()=>say("On iPhone: tap Share, then Add to Home Screen. Open OPH Showtimes from your home screen and tap this button again.")}return}
let reg,sub;try{reg=await navigator.serviceWorker.register("/sw.js");sub=await reg.pushManager.getSubscription()}catch(e){return}
const show=()=>{b.textContent=sub?"🔔 Notifications on":"🔔 Notify me of new titles";b.setAttribute("aria-pressed",String(!!sub))};show();b.hidden=false;
const post=(path,body)=>fetch(api+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>{if(!r.ok)throw new Error(r.status)});
b.onclick=async()=>{b.disabled=true;tip.hidden=true;try{if(sub){await post("/unsubscribe",{endpoint:sub.endpoint});await sub.unsubscribe();sub=null;say("Notifications are off.")}
else{if(await Notification.requestPermission()!=="granted"){say("Notifications are blocked for this site. You can allow them in your browser's site settings.");return}
sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await post("/subscribe",sub.toJSON());say("You'll get a notification when a new film or live show is announced.")}}
catch(e){say("Couldn't change notifications. Please try again.")}finally{b.disabled=false;show()}}})()`;
