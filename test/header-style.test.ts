import { describe, expect, it } from "vitest";
import { fontLinks, headerCss, HEADER_STYLE, type HeaderStyle } from "../src/header-style.ts";

const style = (changes: Partial<HeaderStyle>): HeaderStyle => ({ ...HEADER_STYLE, ...changes });

describe("fontLinks", () => {
  it("loads nothing when every font is already on devices", () => {
    expect(fontLinks(style({ titleFont: "slab", textFont: "system", buttonFont: "humanist" }))).toBe("");
  });

  it("loads each web font in use once", () => {
    const links = fontLinks(style({ titleFont: "limelight", textFont: "dmsans", buttonFont: "dmsans" }));
    expect(links).toContain("family=Limelight&family=DM+Sans:wght@100..900&display=swap");
    expect(links.match(/DM\+Sans/g)).toHaveLength(1);
  });
});

describe("headerCss", () => {
  it("gives dark mode its own colors", () => {
    const css = headerCss(style({ light: { ...HEADER_STYLE.light, title: "#111111" }, dark: { ...HEADER_STYLE.dark, title: "#eeeeee" } }));
    expect(css).toMatch(/^:root\{[^}]*--h-title:#111111/);
    expect(css).toContain("@media (prefers-color-scheme:dark){:root{");
    expect(css).toMatch(/prefers-color-scheme:dark\)\{:root\{[^}]*--h-title:#eeeeee/);
  });

  it("drops the border and row lines when they're set to zero or off", () => {
    const css = headerCss(style({ tickets: { ...HEADER_STYLE.tickets, borderWidth: 0 }, list: { ...HEADER_STYLE.list, dividers: false } }));
    expect(css).toMatch(/\.book\{[^}]*border-style:none/);
    expect(css).toMatch(/\.showtime\{[^}]*border-bottom-width:0px/);
  });

  it("shrinks posters to 7/8 on phones", () => {
    const css = headerCss(style({ list: { ...HEADER_STYLE.list, thumbWidth: 80 } }));
    expect(css).toContain("@media (max-width:30rem){.showtime{grid-template-columns:4.2rem 70px 1fr}.thumb{width:70px}}");
  });
});
