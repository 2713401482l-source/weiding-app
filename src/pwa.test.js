import { describe, expect, it } from "vitest";
import { isIOSSafari, lockPortraitOrientation, shouldOfferIOSInstall, splashDuration } from "./pwa.js";

const safari = {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  platform: "iPhone",
  maxTouchPoints: 5,
  standalone: false,
};

describe("iOS install guidance", () => {
  it("detects iPhone Safari but excludes iOS Chrome", () => {
    expect(isIOSSafari(safari)).toBe(true);
    expect(isIOSSafari({ ...safari, userAgent: `${safari.userAgent} CriOS/125` })).toBe(false);
  });

  it("only offers after eligibility and respects the 30 day dismissal", () => {
    const now = Date.UTC(2026, 6, 15);
    expect(shouldOfferIOSInstall({ navigatorLike: safari, eligible: false, now })).toBe(false);
    expect(shouldOfferIOSInstall({ navigatorLike: safari, eligible: true, now })).toBe(true);
    expect(shouldOfferIOSInstall({ navigatorLike: safari, eligible: true, dismissedAt: now - 29 * 86400000, now })).toBe(false);
    expect(shouldOfferIOSInstall({ navigatorLike: safari, eligible: true, dismissedAt: now - 31 * 86400000, now })).toBe(true);
  });

  it("never offers inside an installed web app", () => {
    expect(shouldOfferIOSInstall({ navigatorLike: { ...safari, standalone: true }, eligible: true })).toBe(false);
  });
});

describe("splash timing", () => {
  it("uses the approved full and reduced motion durations", () => {
    expect(splashDuration(false)).toBe(1850);
    expect(splashDuration(true)).toBe(500);
  });
});

describe("installed app orientation", () => {
  it("requests portrait-primary for an installed app", async () => {
    let requested = "";
    const locked = await lockPortraitOrientation({
      navigatorLike: { standalone: true },
      matchMediaLike: () => ({ matches: false }),
      screenLike: { orientation: { lock: async (value) => { requested = value; } } },
    });
    expect(locked).toBe(true);
    expect(requested).toBe("portrait-primary");
  });

  it("does not request a lock in a regular browser tab", async () => {
    const locked = await lockPortraitOrientation({
      navigatorLike: { standalone: false },
      matchMediaLike: () => ({ matches: false }),
      screenLike: { orientation: { lock: async () => { throw new Error("should not run"); } } },
    });
    expect(locked).toBe(false);
  });
});
