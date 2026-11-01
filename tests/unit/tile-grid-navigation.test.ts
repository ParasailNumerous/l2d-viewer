import { describe, expect, it } from "vitest";

import {
  getGridColumnCount,
  getNextGridIndex,
  getSelectionChange,
} from "../../src/components/tile-grid/tile-grid-navigation";

describe("tile grid navigation", () => {
  it("normalizes the configured column count", () => {
    expect(getGridColumnCount(0, 4)).toBe(1);
    expect(getGridColumnCount(3, 4)).toBe(3);
    expect(getGridColumnCount(8, 3)).toBe(3);
  });

  it("moves within rows and columns without wrapping", () => {
    expect(getNextGridIndex(1, 8, 3, "ArrowRight")).toBe(2);
    expect(getNextGridIndex(2, 8, 3, "ArrowRight")).toBeNull();
    expect(getNextGridIndex(4, 8, 3, "ArrowDown")).toBe(7);
    expect(getNextGridIndex(7, 8, 3, "ArrowDown")).toBeNull();
    expect(getNextGridIndex(1, 8, 3, "ArrowUp")).toBeNull();
  });

  it("supports row and whole-grid Home/End", () => {
    expect(getNextGridIndex(4, 8, 3, "Home")).toBe(3);
    expect(getNextGridIndex(4, 8, 3, "End")).toBe(5);
    expect(getNextGridIndex(4, 8, 3, "Home", true)).toBe(0);
    expect(getNextGridIndex(4, 8, 3, "End", true)).toBe(7);
  });

  it("only reports a real selection change", () => {
    expect(getSelectionChange(1, 3, 4)).toEqual({ index: 3, selected: true });
    expect(getSelectionChange(1, 1, 4)).toBeNull();
    expect(getSelectionChange(1, 4, 4)).toBeNull();
  });
});
