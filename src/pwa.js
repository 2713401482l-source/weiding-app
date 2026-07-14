const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

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

export function isStandaloneApp(navigatorLike = globalThis.navigator, matchMediaLike = globalThis.matchMedia) {
  return Boolean(navigatorLike?.standalone || matchMediaLike?.("(display-mode: standalone)")?.matches);
}

export function shouldOfferIOSInstall({
  navigatorLike = globalThis.navigator,
  matchMediaLike = globalThis.matchMedia,
  eligible = false,
  dismissedAt = 0,
  now = Date.now(),
} = {}) {
  if (!eligible || !isIOSSafari(navigatorLike) || isStandaloneApp(navigatorLike, matchMediaLike)) return false;
  return !dismissedAt || now - Number(dismissedAt) >= THIRTY_DAYS;
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
