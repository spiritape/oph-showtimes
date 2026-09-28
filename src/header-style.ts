// The page header's look. Edited with the Header Editor artifact: its Save
// button stores these same fields, which are then copied in here.

export const FONTS = {
  system: 'system-ui,-apple-system,"Segoe UI",sans-serif',
  humanist: 'Avenir,"Avenir Next",Seravek,"Gill Sans",Candara,system-ui,sans-serif',
  rounded: 'ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold",system-ui,sans-serif',
  condensed: '"Avenir Next Condensed","Arial Narrow","Roboto Condensed",sans-serif-condensed,sans-serif',
  serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',
  didone: 'Didot,"Bodoni 72","Bodoni MT",Georgia,serif',
  slab: 'Rockwell,"Roboto Slab","Courier New",serif',
  mono: 'ui-monospace,"SF Mono",Menlo,Consolas,monospace',
} as const;

export type HeaderColors = { background: string; title: string; subtitle: string; address: string; button: string };

export type HeaderStyle = {
  titleText: string;
  subtitleText: string;
  titleFont: keyof typeof FONTS;
  textFont: keyof typeof FONTS;
  /** rem */
  titleSize: number;
  titleWeight: number;
  /** em */
  titleTracking: number;
  titleUppercase: boolean;
  align: "left" | "center";
  /** px above the title */
  paddingTop: number;
  /** px below the header's last line */
  paddingBottom: number;
  /** px between the title and the subtitle */
  gap: number;
  showSubtitle: boolean;
  showAddress: boolean;
  light: HeaderColors;
  dark: HeaderColors;
};

export const HEADER_STYLE: HeaderStyle = {
  titleText: "OPH Showtimes",
  subtitleText: "An unofficial schedule for the Ojai Playhouse.",
  titleFont: "slab",
  textFont: "humanist",
  titleSize: 1,
  titleWeight: 900,
  titleTracking: 0.07,
  titleUppercase: false,
  align: "center",
  paddingTop: 6,
  paddingBottom: 0,
  gap: 1,
  showSubtitle: true,
  showAddress: true,
  light: { background: "#fbf9f4", title: "#1d1b18", subtitle: "#6f6a62", address: "#6f6a62", button: "#1d1b18" },
  dark: { background: "#141312", title: "#7f94e1", subtitle: "#9c968c", address: "#5b5a57", button: "#db9824" },
};

const vars = (c: HeaderColors) =>
  `--h-bg:${c.background};--h-title:${c.title};--h-sub:${c.subtitle};--h-addr:${c.address};--h-btn:${c.button}`;

/** The header's CSS, from HEADER_STYLE. The background runs the full page width. */
export function headerCss(h: HeaderStyle = HEADER_STYLE) {
  return [
    `:root{${vars(h.light)}}`,
    `@media (prefers-color-scheme:dark){:root{${vars(h.dark)}}}`,
    `header{padding-top:${h.paddingTop}px;padding-bottom:${h.paddingBottom}px;text-align:${h.align};font-family:${FONTS[h.textFont]};background:var(--h-bg);box-shadow:0 0 0 100vmax var(--h-bg);clip-path:inset(0 -100vmax)}`,
    `header h1{font-family:${FONTS[h.titleFont]};font-size:${h.titleSize}rem;font-weight:${h.titleWeight};letter-spacing:${h.titleTracking}em;text-transform:${h.titleUppercase ? "uppercase" : "none"};color:var(--h-title);margin:0;text-wrap:balance}`,
    `header .sub{color:var(--h-sub);margin:${h.gap}px 0 0;font-size:.9rem}`,
    `header .theater{margin:6px 0 0;font-size:.85rem;color:var(--h-addr)}`,
    `header .notify button{color:var(--h-btn)}`,
  ].join("");
}
