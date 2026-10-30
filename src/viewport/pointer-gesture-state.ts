import { clampScale } from "./viewport-geometry.js";

export interface PointerPosition {
  x: number;
  y: number;
}

export interface PinchGesture {
  distance: number;
  midpoint: PointerPosition;
  scale: number;
  pan: PointerPosition;
}

export function getPinchGesture(
  first: PointerPosition,
  second: PointerPosition,
  scale: number,
  pan: PointerPosition,
): PinchGesture {
  return {
    distance: Math.hypot(first.x - second.x, first.y - second.y),
    midpoint: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    },
    scale,
    pan,
  };
}

export function getPinchTransform(
  initial: PinchGesture,
  first: PointerPosition,
  second: PointerPosition,
  frameCenter: PointerPosition,
): { scale: number; pan: PointerPosition } {
  const distance = Math.hypot(first.x - second.x, first.y - second.y);
  const midpoint = {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };

  if (initial.distance <= 0) {
    return {
      scale: initial.scale,
      pan: {
        x: Math.round(
          initial.pan.x + (midpoint.x - initial.midpoint.x),
        ),
        y: Math.round(
          initial.pan.y + (midpoint.y - initial.midpoint.y),
        ),
      },
    };
  }

  const nextScale = clampScale(
    initial.scale * (distance / initial.distance),
  );
  const ratio = nextScale / initial.scale;
  const initialCenter = {
    x: frameCenter.x + initial.pan.x,
    y: frameCenter.y + initial.pan.y,
  };

  return {
    scale: nextScale,
    pan: {
      x: Math.round(
        initial.pan.x +
        (midpoint.x - initial.midpoint.x) +
        (initial.midpoint.x - initialCenter.x) * (1 - ratio),
      ),
      y: Math.round(
        initial.pan.y +
        (midpoint.y - initial.midpoint.y) +
        (initial.midpoint.y - initialCenter.y) * (1 - ratio),
      ),
    },
  };
}

export function getPanFromPointer(
  initialPan: PointerPosition,
  start: PointerPosition,
  current: PointerPosition,
): PointerPosition {
  return {
    x: Math.round(initialPan.x + current.x - start.x),
    y: Math.round(initialPan.y + current.y - start.y),
  };
}
