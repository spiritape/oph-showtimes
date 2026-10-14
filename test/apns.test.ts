import { describe, expect, it } from "vitest";
import { apnsPayload, apnsToken, isAppSubscription } from "../worker/apns.ts";

describe("apnsPayload", () => {
  it("asks iOS to let the app attach the poster, and says which Title to open", () => {
    expect(
      apnsPayload({
        title: "New at the Playhouse: Digger",
        body: "Film · first showing Thu, Oct 1, 7:00 PM",
        url: "https://ojaishowtimes.com/t/digger/",
        titleSlug: "digger",
        imageUrl: "https://img.example/digger",
      }),
    ).toEqual({
      aps: {
        alert: { title: "New at the Playhouse: Digger", body: "Film · first showing Thu, Oct 1, 7:00 PM" },
        sound: "default",
        "mutable-content": 1,
      },
      url: "https://ojaishowtimes.com/t/digger/",
      titleSlug: "digger",
      imageUrl: "https://img.example/digger",
    });
  });

  it("leaves out what a notification doesn't have", () => {
    expect(apnsPayload({ title: "Test", body: "Hi", url: "https://ojaishowtimes.com/" })).not.toHaveProperty("titleSlug");
  });
});

describe("isAppSubscription", () => {
  it("accepts a hex push token and its environment", () => {
    expect(isAppSubscription({ token: "a1".repeat(32), environment: "production" })).toBe(true);
    expect(isAppSubscription({ token: "a1".repeat(32), environment: "staging" })).toBe(false);
    expect(isAppSubscription({ token: "not hex", environment: "sandbox" })).toBe(false);
  });
});

describe("apnsToken", () => {
  it("signs an ES256 token Apple can verify with the key's public half", async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
    const key = `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----\n`;

    const token = await apnsToken({ key, keyId: "ABC123DEFG", teamId: "5GL46QLKSS", topic: "x" }, 1_791_950_000);
    const [header, claims, signature] = token.split(".") as [string, string, string];
    const json = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString());
    expect(json(header)).toEqual({ alg: "ES256", kid: "ABC123DEFG" });
    expect(json(claims)).toEqual({ iss: "5GL46QLKSS", iat: 1_791_950_000 });
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      Buffer.from(signature, "base64url"),
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(valid).toBe(true);
  });
});
