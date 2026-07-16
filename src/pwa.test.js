import { describe, expect, it } from "vitest";
import { getInstallPlatform, isIOSSafari, lockPortraitOrientation, shouldOfferInstallGuide, splashDuration } from "./pwa.js";

const safari = {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  platform: "iPhone",
  maxTouchPoints: 5,
  standalone: false,
};
const samsung = {
  userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S9280) AppleWebKit/537.36 SamsungBrowser/27.0 Chrome/125 Mobile Safari/537.36",
};

describe("cross-platform install guidance", () => {
  it("identifies iOS Safari, iOS Chrome, and Samsung Internet", () => {
    expect(isIOSSafari(safari)).toBe(true);
    expect(getInstallPlatform(safari)).toBe("ios-safari");
    expect(getInstallPlatform({ ...safari, userAgent: `${safari.userAgent} CriOS/125` })).toBe("ios-other");
    expect(getInstallPlatform(samsung)).toBe("samsung");
  });

  it("offers after a second visit or a completion and waits 14 days after dismissal", () => {
    const now = Date.UTC(2026, 6, 17);
    expect(shouldOfferInstallGuide({ navigatorLike: safari, visitCount: 1, now })).toBe(false);
    expect(shouldOfferInstallGuide({ navigatorLike: safari, visitCount: 2, now })).toBe(true);
    expect(shouldOfferInstallGuide({ navigatorLike: samsung, completed: true, now })).toBe(true);
    expect(shouldOfferInstallGuide({ navigatorLike: safari, visitCount: 2, dismissedAt: now - 13 * 86400000, now })).toBe(false);
    expect(shouldOfferInstallGuide({ navigatorLike: safari, visitCount: 2, dismissedAt: now - 15 * 86400000, now })).toBe(true);
  });

  it("never offers inside an installed web app", () => {
    expect(shouldOfferInstallGuide({ navigatorLike: { ...safari, standalone: true }, visitCount: 2 })).toBe(false);
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
    expect(await lockPortraitOrientation({ navigatorLike: {}, matchMediaLike: () => ({ matches: false }) })).toBe(false);
  });
});
