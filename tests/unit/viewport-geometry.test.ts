import { describe, it, expect } from "vitest";

import {
  clampScale,
  getFramingBounds,
  getModelFitScale,
  getModelScale,
  zoomAroundPoint,
} from "../../src/viewport/viewport-geometry.js";

describe("clampScale", () => {
  it("clamps to the minimum", () => {
    expect(clampScale(0)).toBe(0.1);
  });

  it("rounds to three decimals", () => {
    expect(clampScale(1.23456)).toBe(1.235);
  });

  it("clamps to the maximum", () => {
    expect(clampScale(100)).toBe(40);
  });
});

describe("getFramingBounds", () => {
  it("letterboxes a 16:9 target in a square viewport", () => {
    expect(
      getFramingBounds({ width: 1000, height: 1000 }, { width: 16, height: 9 }),
    ).toEqual({ x: 0, y: 218.75, width: 1000, height: 562.5 });
  });

  it("pillarboxes a 1:1 target in a wide viewport", () => {
    expect(
      getFramingBounds({ width: 1000, height: 500 }, { width: 1, height: 1 }),
    ).toEqual({ x: 250, y: 0, width: 500, height: 500 });
  });
});

describe("zoomAroundPoint", () => {
  it("keeps the anchor point fixed", () => {
    expect(
      zoomAroundPoint(
        1,
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        { x: 50, y: 25 },
        2,
      ),
    ).toEqual({ scale: 2, pan: { x: -50, y: -25 } });
  });

  it("clamps the next scale", () => {
    expect(
      zoomAroundPoint(
        1,
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        100,
      ).scale,
    ).toBe(40);
  });
});

describe("getModelFitScale", () => {
  it("fits bounds inside the frame", () => {
    expect(
      getModelFitScale(
        { width: 1000, height: 1000 },
        { width: 500, height: 1000 },
      ),
    ).toBe(1);
  });

  it("returns zero for zero-size bounds", () => {
    expect(
      getModelFitScale(
        { width: 1000, height: 1000 },
        { width: 0, height: 1000 },
      ),
    ).toBe(0);
  });
});

describe("getModelScale", () => {
  it("multiplies the fit scale by the viewer scale", () => {
    expect(
      getModelScale(
        { width: 1000, height: 1000 },
        { width: 500, height: 1000 },
        0.9,
      ),
    ).toBe(0.9);
  });
});
