import { describe, it, expect } from "vitest";

import {
  getPanFromPointer,
  getPinchGesture,
  getPinchTransform,
} from "../../src/viewport/pointer-gesture-state.js";

describe("getPinchGesture", () => {
  it("records the initial distance, midpoint, scale, and pan", () => {
    expect(
      getPinchGesture({ x: 0, y: 0 }, { x: 0, y: 100 }, 1, { x: 4, y: 5 }),
    ).toEqual({
      distance: 100,
      midpoint: { x: 0, y: 50 },
      scale: 1,
      pan: { x: 4, y: 5 },
    });
  });
});

describe("getPinchTransform", () => {
  it("scales and follows midpoint movement when the frame center is the initial midpoint", () => {
    const initial = {
      distance: 100,
      midpoint: { x: 0, y: 50 },
      scale: 1,
      pan: { x: 0, y: 0 },
    };

    expect(
      getPinchTransform(
        initial,
        { x: 10, y: 0 },
        { x: 10, y: 200 },
        { x: 0, y: 50 },
        1,
      ),
    ).toEqual({ scale: 2, pan: { x: 5, y: 25 } });
  });

  it("anchors zoom with a non-zero frame center and pan", () => {
    const initial = {
      distance: 100,
      midpoint: { x: 150, y: 150 },
      scale: 1,
      pan: { x: 10, y: 20 },
    };

    expect(
      getPinchTransform(
        initial,
        { x: 50, y: 150 },
        { x: 250, y: 150 },
        { x: 100, y: 100 },
        1,
      ),
    ).toEqual({ scale: 2, pan: { x: -15, y: -5 } });
  });

  it("keeps scale and follows the midpoint when the initial distance is zero", () => {
    const initial = {
      distance: 0,
      midpoint: { x: 0, y: 0 },
      scale: 1,
      pan: { x: 0, y: 0 },
    };

    expect(
      getPinchTransform(
        initial,
        { x: 6, y: 6 },
        { x: 6, y: 6 },
        { x: 100, y: 100 },
        2,
      ),
    ).toEqual({ scale: 1, pan: { x: 3, y: 3 } });
  });
});

describe("getPanFromPointer", () => {
  it("converts the screen delta into view units", () => {
    expect(
      getPanFromPointer(
        { x: 10, y: -5 },
        { x: 100, y: 100 },
        { x: 130, y: 90 },
        2,
      ),
    ).toEqual({ x: 25, y: -10 });
  });

  it("leaves pan unchanged for an invalid model scale", () => {
    expect(
      getPanFromPointer(
        { x: 10, y: -5 },
        { x: 100, y: 100 },
        { x: 130, y: 90 },
        0,
      ),
    ).toEqual({ x: 10, y: -5 });
  });
});
