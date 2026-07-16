const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

function getLocalPreviewPlatform(locationLike = globalThis.location) {
  if (!/^(localhost|127\.0\.0\.1)$/u.test(locationLike?.hostname || "")) return "";
  const value = new URLSearchParams(locationLike?.search || "").get("installPreview");
  return ["ios-safari", "ios-other", "samsung", "android"].includes(value) ? value : "";
}

function isLocalStandalonePreview(locationLike = globalThis.location) {
  return /^(localhost|127\.0\.0\.1)$/u.test(locationLike?.hostname || "")
    && new URLSearchParams(locationLike?.search || "").get("standalonePreview") === "1";
}

export function isAppleMobileBrowser(navigatorLike = globalThis.navigator) {
  if (!navigatorLike) return false;
  const userAgent = navigatorLike.userAgent || "";
  const platform = navigatorLike.platform || "";
  return /iPhone|iPad|iPod/i.test(userAgent)
    || (platform === "MacIntel" && Number(navigatorLike.maxTouchPoints) > 1);
}

export function isIOSSafari(navigatorLike = globalThis.navigator) {
  if (!isAppleMobileBrowser(navigatorLike)) return false;
  const userAgent = navigatorLike?.userAgent || "";
  return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
}

export function isAndroidBrowser(navigatorLike = globalThis.navigator) {
  return /Android/i.test(navigatorLike?.userAgent || "");
}

export function isMobileInstallBrowser(navigatorLike = globalThis.navigator) {
  return Boolean(getLocalPreviewPlatform()) || isAppleMobileBrowser(navigatorLike) || isAndroidBrowser(navigatorLike);
}

export function getInstallPlatform(navigatorLike = globalThis.navigator) {
  const preview = getLocalPreviewPlatform();
  if (preview) return preview;
  if (isAppleMobileBrowser(navigatorLike)) return isIOSSafari(navigatorLike) ? "ios-safari" : "ios-other";
  if (isAndroidBrowser(navigatorLike)) return /SamsungBrowser/i.test(navigatorLike?.userAgent || "") ? "samsung" : "android";
  return "unsupported";
}

export function isStandaloneApp(navigatorLike = globalThis.navigator, matchMediaLike = globalThis.matchMedia) {
  return Boolean(isLocalStandalonePreview() || navigatorLike?.standalone || matchMediaLike?.("(display-mode: standalone)")?.matches);
}

export function shouldOfferInstallGuide({
  navigatorLike = globalThis.navigator,
  matchMediaLike = globalThis.matchMedia,
  visitCount = 0,
  completed = false,
  dismissedAt = 0,
  now = Date.now(),
} = {}) {
  if ((!completed && Number(visitCount) < 2)
    || !isMobileInstallBrowser(navigatorLike)
    || isStandaloneApp(navigatorLike, matchMediaLike)) return false;
  return !dismissedAt || now - Number(dismissedAt) >= FOURTEEN_DAYS;
}

// Kept as a compatibility alias for older imports and saved tests.
export function shouldOfferIOSInstall(options = {}) {
  return shouldOfferInstallGuide({
    ...options,
    completed: options.completed ?? options.eligible ?? false,
  });
}

export function splashDuration(reducedMotion = false) {
  return reducedMotion ? 500 : 1850;
}

export async function lockPortraitOrientation({
  screenLike = globalThis.screen,
  navigatorLike = globalThis.navigator,
  matchMediaLike = globalThis.matchMedia,
} = {}) {
  if (!isStandaloneApp(navigatorLike, matchMediaLike) || typeof screenLike?.orientation?.lock !== "function") return false;
  try {
    await screenLike.orientation.lock("portrait-primary");
    return true;
  } catch {
    return false;
  }
}
