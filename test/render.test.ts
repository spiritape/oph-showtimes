import { describe, expect, it } from "vitest";
import { richText } from "../src/render.ts";

describe("richText", () => {
  it("turns [words](url) into links", () => {
    expect(richText("Follow on [Instagram](https://www.instagram.com/ojaiplayhouse).")).toBe(
      '<p>Follow on <a href="https://www.instagram.com/ojaiplayhouse" rel="noopener">Instagram</a>.</p>',
    );
  });

  it("starts a new paragraph at each blank line", () => {
    expect(richText("One.\n\n  \nTwo.\nStill two.")).toBe("<p>One.</p><p>Two.\nStill two.</p>");
  });

  it("escapes HTML and only links web and email addresses", () => {
    expect(richText('<b>Hi</b> [x](javascript:alert(1)) [y](https://a.com/?q="z"&r=1)')).toBe(
      '<p>&lt;b&gt;Hi&lt;/b&gt; [x](javascript:alert(1)) <a href="https://a.com/?q=&quot;z&quot;&amp;r=1" rel="noopener">y</a></p>',
    );
  });
});
