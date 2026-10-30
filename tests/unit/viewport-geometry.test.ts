import { describe, it, expect } from "vitest";

import {
  clampScale,
  getExportModelPosition,
  getFramingBounds,
  getModelFitScale,
  getModelPosition,
  getModelScale,
  getPanStepSpeed,
  zoomViewAroundPoint,
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

describe("getModelPosition", () => {
  it("offsets the frame center by pan scaled to screen units", () => {
    expect(
      getModelPosition(
        { x: 10, y: 20, width: 100, height: 50 },
        { x: 2, y: -3 },
        4,
      ),
    ).toEqual({ x: 68, y: 33 });
  });
});

describe("zoomViewAroundPoint", () => {
  it("zooms around the given point with pan in view units", () => {
    expect(
      zoomViewAroundPoint(
        1,
        { x: 0, y: 0 },
        { x: 40, y: 20 },
        { x: 0, y: 0 },
        2,
        2,
      ),
    ).toEqual({ scale: 2, pan: { x: -10, y: -5 } });
  });

  it("clamps the next scale", () => {
    expect(
      zoomViewAroundPoint(
        1,
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        1,
        100,
      ),
    ).toEqual({ scale: 40, pan: { x: 0, y: 0 } });
  });

  it("leaves pan unchanged when the model scale is invalid", () => {
    expect(
      zoomViewAroundPoint(
        1,
        { x: 5, y: 6 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        0,
        2,
      ),
    ).toEqual({ scale: 2, pan: { x: 5, y: 6 } });
  });

  it("keeps the world point under the cursor anchored after zooming", () => {
    const scale = 1;
    const pan = { x: 10, y: -4 };
    const frameCenter = { x: 200, y: 150 };
    const point = { x: 260, y: 180 };
    const modelScale = 3;
    const nextScale = 1.5;

    const result = zoomViewAroundPoint(
      scale,
      pan,
      point,
      frameCenter,
      modelScale,
      nextScale,
    );

    expect(result).toEqual({ scale: 1.5, pan: { x: 3, y: -7 } });

    // World point under the cursor before the zoom, in model units.
    const worldX = (point.x - frameCenter.x - pan.x * modelScale) / modelScale;
    const worldY = (point.y - frameCenter.y - pan.y * modelScale) / modelScale;

    const nextModelScale = modelScale * (nextScale / scale);
    const renderedX =
      frameCenter.x + result.pan.x * nextModelScale + worldX * nextModelScale;
    const renderedY =
      frameCenter.y + result.pan.y * nextModelScale + worldY * nextModelScale;

    expect(Math.abs(renderedX - point.x)).toBeLessThanOrEqual(2.5);
    expect(Math.abs(renderedY - point.y)).toBeLessThanOrEqual(2.5);
  });
});

describe("getPanStepSpeed", () => {
  it("divides the base speed by the model scale", () => {
    expect(getPanStepSpeed(10, 2)).toBe(5);
  });

  it("never goes below one unit per step", () => {
    expect(getPanStepSpeed(10, 20)).toBe(1);
  });

  it("returns zero for an invalid model scale", () => {
    expect(getPanStepSpeed(10, 0)).toBe(0);
    expect(getPanStepSpeed(10, -1)).toBe(0);
  });
});

describe("getExportModelPosition", () => {
  it("scales pan by the model scale and export multiplier", () => {
    expect(
      getExportModelPosition(
        { width: 1920, height: 1080 },
        { x: 3, y: -2 },
        2,
        1.5,
      ),
    ).toEqual({ x: 969, y: 534 });
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
