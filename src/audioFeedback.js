export const interactionProfiles = {
  soft: { notes: [{ frequency: 520, duration: 0.07, peak: 0.066 }] },
  navigate: { notes: [{ frequency: 440, duration: 0.065, peak: 0.07 }, { frequency: 554.37, offset: 0.045, duration: 0.075, peak: 0.075 }] },
  selectOn: { notes: [{ frequency: 493.88, duration: 0.06, peak: 0.072 }, { frequency: 659.25, offset: 0.045, duration: 0.085, peak: 0.082 }] },
  selectOff: { notes: [{ frequency: 587.33, duration: 0.06, peak: 0.068 }, { frequency: 440, offset: 0.045, duration: 0.075, peak: 0.072 }] },
  confirm: { notes: [{ frequency: 523.25, duration: 0.065, peak: 0.078 }, { frequency: 659.25, offset: 0.043, duration: 0.075, peak: 0.084 }, { frequency: 783.99, offset: 0.09, duration: 0.095, peak: 0.09 }] },
  back: { notes: [{ frequency: 554.37, duration: 0.06, peak: 0.068 }, { frequency: 415.3, offset: 0.044, duration: 0.08, peak: 0.074 }] },
  dismiss: { notes: [{ frequency: 493.88, duration: 0.055, peak: 0.064 }, { frequency: 369.99, offset: 0.04, duration: 0.07, peak: 0.068 }] },
  play: { notes: [{ frequency: 392, duration: 0.07, peak: 0.074 }, { frequency: 523.25, offset: 0.05, duration: 0.095, peak: 0.084 }] },
  pause: { notes: [{ frequency: 493.88, duration: 0.048, peak: 0.07 }, { frequency: 493.88, offset: 0.064, duration: 0.06, peak: 0.074 }] },
  forward: { notes: [{ frequency: 493.88, duration: 0.05, peak: 0.07 }, { frequency: 659.25, offset: 0.035, duration: 0.07, peak: 0.078 }] },
  rewind: { notes: [{ frequency: 659.25, duration: 0.05, peak: 0.07 }, { frequency: 493.88, offset: 0.035, duration: 0.07, peak: 0.078 }] },
  edit: { notes: [{ frequency: 440, duration: 0.06, peak: 0.066 }, { frequency: 587.33, offset: 0.045, duration: 0.08, peak: 0.074 }] },
  danger: { notes: [{ frequency: 329.63, duration: 0.075, peak: 0.07 }, { frequency: 246.94, offset: 0.052, duration: 0.1, peak: 0.078 }] },
};

export const railProfiles = [
  { frequency: 392, overtone: 1.5, type: "sine", duration: 0.105, peak: 0.086 },
  { frequency: 440, overtone: 1.25, type: "triangle", duration: 0.095, peak: 0.082 },
  { frequency: 523.25, overtone: 1.125, type: "triangle", duration: 0.08, peak: 0.078 },
  { frequency: 293.66, overtone: 1.5, type: "sine", duration: 0.115, peak: 0.088 },
  { frequency: 349.23, overtone: 1.25, type: "sine", duration: 0.125, peak: 0.09 },
  { frequency: 261.63, overtone: 2, type: "sine", duration: 0.14, peak: 0.092 },
];

export function clampVolume(value, fallback = 0.82) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

export function resolveInteractionFeedback({
  explicit = "",
  disabled = false,
  role = "",
  ariaLabel = "",
  text = "",
  className = "",
  href = "",
  checked = false,
} = {}) {
  if (disabled || explicit === "none") return null;
  if (explicit && interactionProfiles[explicit]) return explicit;
  const meaning = `${ariaLabel} ${text} ${className}`.toLowerCase();
  if (/删除|清除|danger|delete|trash/.test(meaning)) return "danger";
  if (/后退\s*15|rewind|counterclockwise/.test(meaning)) return "rewind";
  if (/前进\s*15|快进|forward/.test(meaning)) return "forward";
  if (/暂停|pause/.test(meaning)) return "pause";
  if (/播放|继续|play/.test(meaning)) return "play";
  if (/返回|back/.test(meaning)) return "back";
  if (/关闭|取消|收起|dismiss|close/.test(meaning)) return "dismiss";
  if (/编辑|edit|pencil/.test(meaning)) return "edit";
  if (/保存|确认|完成|开始|进入|消散|试听|confirm|primary|ignite/.test(meaning)) return "confirm";
  if (role === "switch") return checked ? "selectOff" : "selectOn";
  if (role === "tab" || role === "option" || /segmented|setting-choice/.test(meaning)) return "selectOn";
  if (href || /persistent-tabs|menu-links|knowledge-link/.test(meaning)) return "navigate";
  return "soft";
}

export function getFeedbackHapticDuration(kind) {
  return {
    soft: 7,
    navigate: 9,
    selectOn: 11,
    selectOff: 8,
    confirm: 16,
    back: 9,
    dismiss: 7,
    play: 10,
    pause: 8,
    forward: 9,
    rewind: 9,
    edit: 9,
    danger: 18,
  }[kind] ?? 8;
}

let context;
let output;
const htmlTonePools = new Map();

export function isSamsungBrowser(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /SamsungBrowser\//i.test(userAgent);
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function getProfileNotes(profile) {
  if (profile.notes) return profile.notes.map((note) => ({
    offset: 0,
    overtone: 1.5,
    type: "sine",
    ...note,
  }));
  return [{
    offset: 0,
    frequency: profile.frequency,
    overtone: profile.overtone ?? 1.5,
    type: profile.type ?? "sine",
    duration: profile.duration,
    peak: profile.peak,
  }];
}

function getProfileDuration(profile) {
  return Math.max(...getProfileNotes(profile).map((note) => note.offset + note.duration));
}

function createToneDataUrl(profile) {
  const sampleRate = 22050;
  const notes = getProfileNotes(profile);
  const duration = getProfileDuration(profile);
  const sampleCount = Math.ceil(sampleRate * (duration + 0.018));
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const sample = notes.reduce((sum, note) => {
      const localTime = time - note.offset;
      if (localTime < 0 || localTime > note.duration) return sum;
      const fadeIn = Math.min(1, localTime / 0.012);
      const fadeOut = Math.max(0, 1 - localTime / note.duration);
      const envelope = fadeIn * fadeOut * fadeOut;
      const fundamental = Math.sin(2 * Math.PI * note.frequency * localTime);
      const overtone = Math.sin(2 * Math.PI * note.frequency * note.overtone * localTime) * 0.24;
      const amplitude = Math.min(0.42, note.peak * 4.45);
      return sum + (fundamental + overtone) / 1.24 * envelope * amplitude;
    }, 0);
    view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true);
  }
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function prepareHtmlTone(profile) {
  if (typeof Audio === "undefined") return null;
  if (!htmlTonePools.has(profile)) {
    const url = createToneDataUrl(profile);
    htmlTonePools.set(profile, {
      cursor: 0,
      players: Array.from({ length: 3 }, () => {
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.setAttribute?.("playsinline", "");
        return audio;
      }),
    });
  }
  return htmlTonePools.get(profile);
}

async function playHtmlTone(profile, volume) {
  const pool = prepareHtmlTone(profile);
  if (!pool) return false;
  const audio = pool.players[pool.cursor % pool.players.length];
  pool.cursor += 1;
  audio.volume = clampVolume(volume);
  try {
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function createOutput(audioContext) {
  const master = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor?.();
  master.gain.value = 1;
  if (compressor) {
    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.14;
    master.connect(compressor).connect(audioContext.destination);
  } else {
    master.connect(audioContext.destination);
  }
  return master;
}

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!context || context.state === "closed") {
    context = new AudioContextClass({ latencyHint: "interactive" });
    output = createOutput(context);
  }
  return context;
}

export async function unlockFeedbackAudio() {
  if (isSamsungBrowser()) {
    Object.values(interactionProfiles).forEach(prepareHtmlTone);
    railProfiles.forEach(prepareHtmlTone);
    return true;
  }
  const audioContext = getContext();
  if (!audioContext) return false;
  try {
    if (audioContext.state !== "running") await audioContext.resume();
    if (audioContext.state !== "running") return false;
    const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(output);
    source.start();
    return true;
  } catch {
    return false;
  }
}

async function playProfile(profile, volume) {
  if (isSamsungBrowser()) return playHtmlTone(profile, volume);
  const audioContext = getContext();
  if (!audioContext) return false;
  if (audioContext.state !== "running" && !(await unlockFeedbackAudio())) return false;
  const now = audioContext.currentTime;
  getProfileNotes(profile).forEach((note) => {
    const start = now + note.offset;
    const level = note.peak * clampVolume(volume);
    const gain = audioContext.createGain();
    const primary = audioContext.createOscillator();
    const overtone = audioContext.createOscillator();
    primary.type = note.type;
    overtone.type = "sine";
    primary.frequency.setValueAtTime(note.frequency, start);
    overtone.frequency.setValueAtTime(note.frequency * note.overtone, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
    primary.connect(gain);
    overtone.connect(gain);
    gain.connect(output);
    primary.start(start);
    overtone.start(start);
    primary.stop(start + note.duration + 0.02);
    overtone.stop(start + note.duration + 0.02);
  });
  return true;
}

export function playInteractionFeedback(kind = "soft", volume) {
  return playProfile(interactionProfiles[kind] ?? interactionProfiles.soft, volume);
}

export function playRailFeedback(index, volume) {
  return playProfile(railProfiles[index] ?? railProfiles[0], volume);
}

export function getFeedbackAudioState() {
  return context?.state ?? "uninitialized";
}
