// The page header's look, and the site's buttons. Edited with the Header
// Editor artifact: its Save button stores these same fields, which are then
// copied in here.

type Font = { label: string; stack: string; /** Google Fonts css2 family spec; absent for fonts already on devices. */ google?: string };

export const FONTS = {
  system: { label: "System", stack: 'system-ui,-apple-system,"Segoe UI",sans-serif' },
  humanist: { label: "Humanist", stack: 'Avenir,"Avenir Next",Seravek,"Gill Sans",Candara,system-ui,sans-serif' },
  rounded: { label: "Rounded", stack: 'ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold",system-ui,sans-serif' },
  condensed: { label: "Condensed", stack: '"Avenir Next Condensed","Arial Narrow","Roboto Condensed",sans-serif-condensed,sans-serif' },
  serif: { label: "Serif", stack: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif' },
  didone: { label: "Didone", stack: 'Didot,"Bodoni 72","Bodoni MT",Georgia,serif' },
  slab: { label: "Slab", stack: 'Rockwell,"Roboto Slab","Courier New",serif' },
  mono: { label: "Mono", stack: 'ui-monospace,"SF Mono",Menlo,Consolas,monospace' },
  fraunces: { label: "Fraunces", stack: '"Fraunces",Georgia,serif', google: "Fraunces:wght@100..900" },
  playfair: { label: "Playfair", stack: '"Playfair Display",Georgia,serif', google: "Playfair+Display:wght@400..900" },
  dmserif: { label: "DM Serif", stack: '"DM Serif Display",Georgia,serif', google: "DM+Serif+Display" },
  baskerville: { label: "Baskerville", stack: '"Libre Baskerville",Baskerville,Georgia,serif', google: "Libre+Baskerville:wght@400;700" },
  abril: { label: "Abril", stack: '"Abril Fatface",Didot,Georgia,serif', google: "Abril+Fatface" },
  limelight: { label: "Limelight", stack: '"Limelight",Georgia,serif', google: "Limelight" },
  poiret: { label: "Poiret", stack: '"Poiret One",system-ui,sans-serif', google: "Poiret+One" },
  righteous: { label: "Righteous", stack: '"Righteous",system-ui,sans-serif', google: "Righteous" },
  bebas: { label: "Bebas", stack: '"Bebas Neue","Arial Narrow",sans-serif', google: "Bebas+Neue" },
  oswald: { label: "Oswald", stack: '"Oswald","Arial Narrow",sans-serif', google: "Oswald:wght@200..700" },
  archivo: { label: "Archivo Black", stack: '"Archivo Black",system-ui,sans-serif', google: "Archivo+Black" },
  syne: { label: "Syne", stack: '"Syne",system-ui,sans-serif', google: "Syne:wght@400..800" },
  worksans: { label: "Work Sans", stack: '"Work Sans",system-ui,sans-serif', google: "Work+Sans:wght@100..900" },
  rubik: { label: "Rubik", stack: '"Rubik",system-ui,sans-serif', google: "Rubik:wght@300..900" },
  dmsans: { label: "DM Sans", stack: '"DM Sans",system-ui,sans-serif', google: "DM+Sans:wght@100..900" },
  plexmono: { label: "Plex Mono", stack: '"IBM Plex Mono",ui-monospace,monospace', google: "IBM+Plex+Mono:wght@400;600;700" },
} satisfies Record<string, Font>;

export type FontKey = keyof typeof FONTS;

/** Marks free Showtimes next to their RSVP button: 16×16 SVG shapes drawn in currentColor, or a text badge. */
export const FREE_ICONS = {
  tag: '<path d="M8.6 1.5H14v5.4l-6.8 6.8a1.2 1.2 0 0 1-1.7 0L2.3 10.5a1.2 1.2 0 0 1 0-1.7Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="11" cy="4.5" r="1.1" fill="currentColor"/>',
  ticket: '<path d="M2 4.5h12v2.2a1.5 1.5 0 0 0 0 2.6v2.2H2V9.3a1.5 1.5 0 0 0 0-2.6Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10.5 5v6" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1.2 1.3"/>',
  gift: '<rect x="2.25" y="5.75" width="11.5" height="3" rx=".6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.25 8.75v4.5h9.5v-4.5M8 5.75v7.5M8 5.75C6.8 3 4.5 3 4.8 4.7c.2 1 2 1.05 3.2 1.05Zm0 0c1.2-2.75 3.5-2.75 3.2-1.05-.2 1-2 1.05-3.2 1.05Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  sparkle: '<path d="M8 1.5 9.5 6.5l5 1.5-5 1.5L8 14.5l-1.5-5-5-1.5 5-1.5Z" fill="currentColor"/>',
  heart: '<path d="M8 13.5S2 10 2 5.8A3 3 0 0 1 8 4.5a3 3 0 0 1 6 1.3C14 10 8 13.5 8 13.5Z" fill="currentColor"/>',
  badge: "",
  none: "",
} as const;

export type FreeIcon = keyof typeof FREE_ICONS;

/** The shape of one kind of button. Sizes in px, except `size` (rem). */
export type ButtonShape = {
  radius: number;
  borderWidth: number;
  weight: number;
  size: number;
  padX: number;
  padY: number;
  uppercase: boolean;
};

export type HeaderColors = {
  background: string;
  title: string;
  subtitle: string;
  address: string;
  notifyText: string;
  notifyBg: string;
  notifyBorder: string;
  pillText: string;
  pillBg: string;
  pillBorder: string;
  pillActiveText: string;
  pillActiveBg: string;
  ticketText: string;
  ticketBg: string;
  ticketBorder: string;
  /** The icon beside free Showtimes' RSVP buttons */
  freeIcon: string;
  /** The first day's heading in the list ("Today", or the soonest day) */
  firstDay: string;
  backText: string;
  backBg: string;
  backBorder: string;
  footerText: string;
  footerHeading: string;
  footerLink: string;
  /** Free screenings and events (RSVP buttons). */
  rsvpText: string;
  rsvpBg: string;
  rsvpBorder: string;
};

/** The Back button on Title pages. Its shape is `back`, its colors `back*`. */
export type BackButton = {
  label: string;
  /** Above the Title's name, below its Showtimes, or both */
  position: "top" | "bottom" | "both";
  align: "left" | "center" | "right";
  /** px above the button */
  gap: number;
};

/** The footer at the bottom of every page. */
export type FooterStyle = {
  /** Left empty, the footer has no heading. */
  heading: string;
  /** Plain text; [words](https://…) makes a link and a blank line starts a new paragraph. */
  text: string;
  font: FontKey;
  align: "left" | "center";
  /** rem */
  size: number;
  /** px */
  paddingTop: number;
  paddingBottom: number;
};

/** Spacing in the schedule list, in px. */
export type ListStyle = {
  /** Above and below each Showtime row */
  rowPadding: number;
  /** Between a row's time, poster, details and buttons */
  columnGap: number;
  /** Above each day's heading */
  dayGap: number;
  /** Between a day's heading and its first row */
  headingGap: number;
  /** Poster width; phones get 7/8 of it */
  thumbWidth: number;
  dividers: boolean;
};

export type HeaderStyle = {
  titleText: string;
  subtitleText: string;
  titleFont: FontKey;
  textFont: FontKey;
  /** rem */
  titleSize: number;
  titleWeight: number;
  /** em */
  titleTracking: number;
  titleUppercase: boolean;
  align: "left" | "center";
  /** Spacing in px: above the title, below the header, at its sides, and between its lines. */
  paddingTop: number;
  paddingBottom: number;
  sidePadding: number;
  gap: number;
  addressGap: number;
  buttonGap: number;
  /** px between the header and the filter buttons */
  navGap: number;
  /** Where the filter buttons sit */
  navAlign: "left" | "center";
  showSubtitle: boolean;
  showAddress: boolean;
  buttonFont: FontKey;
  /** The Notify button has a fill; otherwise it's see-through. */
  notifyFilled: boolean;
  notify: ButtonShape;
  pills: ButtonShape;
  tickets: ButtonShape;
  back: ButtonShape;
  backButton: BackButton;
  list: ListStyle;
  freeIcon: FreeIcon;
  footer: FooterStyle;
  light: HeaderColors;
  dark: HeaderColors;
};

export const HEADER_STYLE: HeaderStyle = {
  titleText: "OPH Showtimes",
  subtitleText: "An unofficial schedule for the Ojai Playhouse.",
  titleFont: "humanist",
  textFont: "humanist",
  titleSize: 1,
  titleWeight: 900,
  titleTracking: 0.07,
  titleUppercase: false,
  align: "center",
  paddingTop: 14,
  paddingBottom: 0,
  sidePadding: 16,
  gap: 0,
  addressGap: 0,
  buttonGap: 3,
  navGap: 16,
  navAlign: "center",
  showSubtitle: true,
  showAddress: true,
  buttonFont: "humanist",
  notifyFilled: true,
  notify: { radius: 40, borderWidth: 1, weight: 500, size: 0.8, padX: 12, padY: 4, uppercase: false },
  pills: { radius: 40, borderWidth: 1, weight: 300, size: 0.8, padX: 10, padY: 3, uppercase: false },
  tickets: { radius: 9, borderWidth: 1, weight: 600, size: 0.85, padX: 10, padY: 2, uppercase: true },
  freeIcon: "badge",
  footer: {
    heading: "Notice",
    text:
      "Not affiliated with the Ojai Playhouse. Times are Pacific and come from [ojaiplayhouse.com](https://www.ojaiplayhouse.com/). Always confirm event times before you go. Follow the Playhouse on [Instagram](https://www.instagram.com/ojaiplayhouse).",
    font: "system",
    align: "left",
    size: 0.8,
    paddingTop: 96,
    paddingBottom: 24,
  },
  back: { radius: 40, borderWidth: 1, weight: 500, size: 0.8, padX: 12, padY: 3, uppercase: true },
  backButton: { label: "← Back", position: "top", align: "center", gap: 14 },
  list: { rowPadding: 3, columnGap: 13, dayGap: 30, headingGap: 2, thumbWidth: 62, dividers: true },
  light: {
    background: "#fbf9f4",
    title: "#1d1b18",
    subtitle: "#6f6a62",
    address: "#6f6a62",
    notifyText: "#1d1b18",
    notifyBg: "#efeae0",
    notifyBorder: "#e4dfd5",
    pillText: "#1d1b18",
    pillBg: "#fbf9f4",
    pillBorder: "#e4dfd5",
    pillActiveText: "#fbf9f4",
    pillActiveBg: "#1d1b18",
    ticketText: "#ffffff",
    ticketBg: "#2d2a8c",
    ticketBorder: "#2d2a8c",
    freeIcon: "#1f8a4c",
    firstDay: "#6f6a62",
    backText: "#1d1b18",
    backBg: "#fbf9f4",
    backBorder: "#e4dfd5",
    footerText: "#6f6a62",
    footerHeading: "#1d1b18",
    footerLink: "#2d2a8c",
    rsvpText: "#ffffff",
    rsvpBg: "#f05537",
    rsvpBorder: "#f05537",
  },
  dark: {
    background: "#141312",
    title: "#7f94e1",
    subtitle: "#9c968c",
    address: "#5b5a57",
    notifyText: "#e5b738",
    notifyBg: "#26241f",
    notifyBorder: "#2b2926",
    pillText: "#eeeae3",
    pillBg: "#141312",
    pillBorder: "#2b2926",
    pillActiveText: "#141312",
    pillActiveBg: "#eeeae3",
    ticketText: "#ffffff",
    ticketBg: "#0131e4",
    ticketBorder: "#36a15b",
    freeIcon: "#5fd08f",
    firstDay: "#61d090",
    backText: "#e00000",
    backBg: "#000000",
    backBorder: "#2b2926",
    footerText: "#9c968c",
    footerHeading: "#eeeae3",
    footerLink: "#a9a6ff",
    rsvpText: "#ffffff",
    rsvpBg: "#f05537",
    rsvpBorder: "#f05537",
  },
};

const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const vars = (c: HeaderColors) =>
  Object.entries(c)
    .map(([k, v]) => `--h-${kebab(k)}:${v}`)
    .join(";");

const shape = (b: ButtonShape) =>
  `border-radius:${b.radius}px;border-width:${b.borderWidth}px;border-style:${b.borderWidth ? "solid" : "none"};font-weight:${b.weight};font-size:${b.size}rem;padding:${b.padY}px ${b.padX}px;text-transform:${b.uppercase ? "uppercase" : "none"};letter-spacing:${b.uppercase ? ".04em" : "normal"}`;

/** The header's and buttons' CSS, from HEADER_STYLE. The header background runs the full page width. */
export function headerCss(h: HeaderStyle = HEADER_STYLE) {
  const buttonFont = FONTS[h.buttonFont].stack;
  const l = h.list;
  const phoneThumb = Math.round(l.thumbWidth * 0.875);
  return [
    `:root{${vars(h.light)}}`,
    `@media (prefers-color-scheme:dark){:root{${vars(h.dark)}}}`,
    `header{padding:${h.paddingTop}px ${h.sidePadding}px ${h.paddingBottom}px;text-align:${h.align};font-family:${FONTS[h.textFont].stack};background:var(--h-background);box-shadow:0 0 0 100vmax var(--h-background);clip-path:inset(0 -100vmax)}`,
    `header h1{font-family:${FONTS[h.titleFont].stack};font-size:${h.titleSize}rem;font-weight:${h.titleWeight};letter-spacing:${h.titleTracking}em;text-transform:${h.titleUppercase ? "uppercase" : "none"};color:var(--h-title);margin:0;text-wrap:balance}`,
    `header .sub{color:var(--h-subtitle);margin:${h.gap}px 0 0;font-size:.9rem}`,
    `header .theater{margin:${h.addressGap}px 0 0;font-size:.85rem;color:var(--h-address)}`,
    `.notify{margin:${h.buttonGap}px 0 0}`,
    `.notify button{font-family:${buttonFont};${shape(h.notify)};color:var(--h-notify-text);border-color:var(--h-notify-border);background:${h.notifyFilled ? "var(--h-notify-bg)" : "transparent"}}`,
    `main>nav:first-child{margin-top:${h.navGap}px;justify-content:${h.navAlign === "center" ? "center" : "flex-start"}}`,
    `nav a{font-family:${buttonFont};${shape(h.pills)};color:var(--h-pill-text);background:var(--h-pill-bg);border-color:var(--h-pill-border)}`,
    `nav a[aria-current]{color:var(--h-pill-active-text);background:var(--h-pill-active-bg);border-color:var(--h-pill-active-bg)}`,
    `.book{font-family:${buttonFont};${shape(h.tickets)};color:var(--h-ticket-text);background:var(--h-ticket-bg);border-color:var(--h-ticket-border)}`,
    `.book.rsvp{color:var(--h-rsvp-text);background:var(--h-rsvp-bg);border-color:var(--h-rsvp-border)}`,
    `[data-day] h2{margin:${l.dayGap}px 0 ${l.headingGap}px}`,
    `[data-list]>[data-day]:first-child h2{color:var(--h-first-day)}`,
    `.free{color:var(--h-free-icon)}`,
    `.back-row{text-align:${h.backButton.align};margin:${h.backButton.gap}px 0 0}`,
    `.back{font-family:${buttonFont};${shape(h.back)};color:var(--h-back-text);background:var(--h-back-bg);border-color:var(--h-back-border)}`,
    `footer{font-family:${FONTS[h.footer.font].stack};text-align:${h.footer.align};font-size:${h.footer.size}rem;padding-top:${h.footer.paddingTop}px;padding-bottom:${h.footer.paddingBottom}px;color:var(--h-footer-text)}`,
    `footer h3{color:var(--h-footer-heading)}`,
    `footer a{color:var(--h-footer-link)}`,
    `.showtime{padding:${l.rowPadding}px 0;column-gap:${l.columnGap}px;grid-template-columns:5.2rem ${l.thumbWidth}px 1fr auto;border-bottom-width:${l.dividers ? 1 : 0}px}`,
    `.thumb{width:${l.thumbWidth}px}`,
    `@media (max-width:30rem){.showtime{grid-template-columns:4.2rem ${phoneThumb}px 1fr}.thumb{width:${phoneThumb}px}}`,
  ].join("");
}

/** Google Fonts stylesheet for the fonts in use, or "" when all are already on devices. */
export function fontLinks(h: HeaderStyle = HEADER_STYLE) {
  const specs = [...new Set([FONTS[h.titleFont], FONTS[h.textFont], FONTS[h.buttonFont], FONTS[h.footer.font]].map((f: Font) => f.google).filter(Boolean))];
  if (!specs.length) return "";
  const href = `https://fonts.googleapis.com/css2?${specs.map((s) => `family=${s}`).join("&")}&display=swap`;
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${href}">`;
}
