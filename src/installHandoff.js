const PREFIX = "WEIDING_TRANSFER_V1:";
const MAX_PAYLOAD_LENGTH = 240000;
const SETTINGS_KEYS = new Set([
  "theme", "recordsEnabled", "breathing", "haptics", "interfaceSounds",
  "interfaceVolume", "playbackVolume", "audioProfileVersion", "reducedEffects",
  "voiceVolume", "ambienceVolume", "fullscreen", "burnInputLayout",
]);

function bytesToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return globalThis.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64ToBytes(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = globalThis.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function cleanSettings(settings) {
  return Object.fromEntries(Object.entries(settings || {}).filter(([key, value]) => (
    SETTINGS_KEYS.has(key) && ["string", "number", "boolean"].includes(typeof value)
  )));
}

function cleanRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.slice(0, 500).filter((record) => record && typeof record === "object" && typeof record.id === "string").map((record) => {
    const clean = {};
    Object.entries(record).forEach(([key, value]) => {
      if (["string", "number", "boolean"].includes(typeof value)) clean[key] = typeof value === "string" ? value.slice(0, 20000) : value;
    });
    return clean;
  });
}

export function createInstallHandoff({ records = [], settings = {}, exportedAt = Date.now() } = {}) {
  const json = JSON.stringify({ version: 1, exportedAt, records: cleanRecords(records), settings: cleanSettings(settings) });
  if (json.length > MAX_PAYLOAD_LENGTH) throw new Error("transfer_too_large");
  return `${PREFIX}${bytesToBase64(new TextEncoder().encode(json))}`;
}

export function parseInstallHandoff(text) {
  try {
    const source = String(text || "").trim();
    if (!source.startsWith(PREFIX) || source.length > MAX_PAYLOAD_LENGTH * 2) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(source.slice(PREFIX.length))));
    if (parsed?.version !== 1 || !Array.isArray(parsed.records) || !parsed.settings || typeof parsed.settings !== "object") return null;
    return { version: 1, exportedAt: Number(parsed.exportedAt) || 0, records: cleanRecords(parsed.records), settings: cleanSettings(parsed.settings) };
  } catch {
    return null;
  }
}

export function mergeInstallHandoff(currentRecords = [], currentSettings = {}, handoff) {
  if (!handoff) return { records: currentRecords, settings: currentSettings };
  const ids = new Set(handoff.records.map((record) => record.id));
  return {
    records: [...handoff.records, ...currentRecords.filter((record) => !ids.has(record.id))],
    settings: { ...currentSettings, ...handoff.settings },
  };
}

export const installHandoffPrefix = PREFIX;
