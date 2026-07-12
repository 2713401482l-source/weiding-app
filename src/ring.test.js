import { describe, expect, it } from "vitest";
import { getNearestStateIndex } from "./ring.js";
import { states } from "./data.js";

const rect = { left: 0, top: 0, width: 200, height: 200 };

describe("getNearestStateIndex", () => {
  it("maps the six cardinal ring stops clockwise from the top", () => {
    expect(getNearestStateIndex(100, 0, rect)).toBe(0);
    expect(getNearestStateIndex(187, 50, rect)).toBe(1);
    expect(getNearestStateIndex(187, 150, rect)).toBe(2);
    expect(getNearestStateIndex(100, 200, rect)).toBe(3);
    expect(getNearestStateIndex(13, 150, rect)).toBe(4);
    expect(getNearestStateIndex(13, 50, rect)).toBe(5);
  });
});

describe("state taxonomy", () => {
  it("contains six unique user titles and required professional terms", () => {
    expect(states).toHaveLength(6);
    expect(new Set(states.map((state) => state.title)).size).toBe(6);
    expect(states.every((state) => state.term && state.description && state.scenes.length === 6)).toBe(true);
  });
});
