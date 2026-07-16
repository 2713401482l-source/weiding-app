import { describe, expect, it } from "vitest";
import {
  clampVolume,
  getFeedbackHapticDuration,
  interactionProfiles,
  isSamsungBrowser,
  railProfiles,
  resolveInteractionFeedback,
} from "./audioFeedback.js";

describe("shared audio feedback profiles", () => {
  it("clamps stored and user-provided volume safely", () => {
    expect(clampVolume(1.8)).toBe(1);
    expect(clampVolume(-0.4)).toBe(0);
    expect(clampVolume("0.75")).toBe(0.75);
    expect(clampVolume(undefined)).toBe(0.82);
  });

  it("keeps each state audible long enough for mobile speakers", () => {
    expect(railProfiles).toHaveLength(6);
    expect(railProfiles.every((profile) => profile.duration >= 0.08)).toBe(true);
    expect(new Set(railProfiles.map((profile) => profile.frequency)).size).toBe(6);
  });

  it("routes Samsung Internet through the HTML audio fallback", () => {
    expect(isSamsungBrowser("Mozilla/5.0 SamsungBrowser/28.0 Chrome/130.0 Mobile")).toBe(true);
    expect(isSamsungBrowser("Mozilla/5.0 CriOS/130.0 Mobile")).toBe(false);
  });

  it("uses directional phrases for semantic actions", () => {
    expect(interactionProfiles.navigate.notes.at(-1).frequency).toBeGreaterThan(interactionProfiles.navigate.notes[0].frequency);
    expect(interactionProfiles.back.notes.at(-1).frequency).toBeLessThan(interactionProfiles.back.notes[0].frequency);
    expect(interactionProfiles.danger.notes.at(-1).frequency).toBeLessThan(interactionProfiles.danger.notes[0].frequency);
    expect(interactionProfiles.pause.notes[0].frequency).toBe(interactionProfiles.pause.notes[1].frequency);
    expect(interactionProfiles.confirm.notes).toHaveLength(3);
  });

  it("maps control meaning without making disabled controls audible", () => {
    expect(resolveInteractionFeedback({ ariaLabel: "前进15秒" })).toBe("forward");
    expect(resolveInteractionFeedback({ ariaLabel: "暂停" })).toBe("pause");
    expect(resolveInteractionFeedback({ ariaLabel: "返回" })).toBe("back");
    expect(resolveInteractionFeedback({ text: "删除这次记录" })).toBe("danger");
    expect(resolveInteractionFeedback({ role: "switch", checked: false })).toBe("selectOn");
    expect(resolveInteractionFeedback({ role: "switch", checked: true })).toBe("selectOff");
    expect(resolveInteractionFeedback({ href: "#/records" })).toBe("navigate");
    expect(resolveInteractionFeedback({ disabled: true, text: "播放" })).toBeNull();
  });

  it("keeps destructive confirmation distinct but restrained", () => {
    expect(getFeedbackHapticDuration("danger")).toBeGreaterThan(getFeedbackHapticDuration("soft"));
    expect(getFeedbackHapticDuration("danger")).toBeLessThanOrEqual(20);
  });
});
