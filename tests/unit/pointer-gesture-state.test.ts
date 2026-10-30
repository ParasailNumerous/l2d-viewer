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
    const initial = getPinchGesture(
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      1,
      { x: 0, y: 0 },
    );

    expect(
      getPinchTransform(
        initial,
        { x: 10, y: 0 },
        { x: 10, y: 200 },
        { x: 0, y: 50 },
      ),
    ).toEqual({ scale: 2, pan: { x: 10, y: 50 } });
  });

  it("applies the frame-center anchoring term", () => {
    const initial = getPinchGesture(
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      1,
      { x: 0, y: 0 },
    );

    expect(
      getPinchTransform(
        initial,
        { x: 10, y: 0 },
        { x: 10, y: 200 },
        { x: 0, y: 0 },
      ),
    ).toEqual({ scale: 2, pan: { x: 10, y: 0 } });
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
        { x: 150, y: 50 },
        { x: 150, y: 250 },
        { x: 100, y: 100 },
      ),
    ).toEqual({ scale: 2, pan: { x: -30, y: -10 } });
  });

  it("keeps scale and follows the midpoint when the initial distance is zero", () => {
    const initial = getPinchGesture(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      1,
      { x: 0, y: 0 },
    );

    expect(
      getPinchTransform(
        initial,
        { x: 5, y: 5 },
        { x: 5, y: 5 },
        { x: 100, y: 100 },
      ),
    ).toEqual({ scale: 1, pan: { x: 5, y: 5 } });
  });
});

describe("getPanFromPointer", () => {
  it("offsets the initial pan by the pointer movement", () => {
    expect(
      getPanFromPointer(
        { x: 10, y: -5 },
        { x: 100, y: 100 },
        { x: 130, y: 90 },
      ),
    ).toEqual({ x: 40, y: -15 });
  });
});
