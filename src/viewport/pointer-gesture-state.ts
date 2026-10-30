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
  modelScale: number,
): { scale: number; pan: PointerPosition } {
  const distance = Math.hypot(first.x - second.x, first.y - second.y);
  const midpoint = {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
  const dragX = midpoint.x - initial.midpoint.x;
  const dragY = midpoint.y - initial.midpoint.y;

  if (!Number.isFinite(modelScale) || modelScale <= 0) {
    return { scale: initial.scale, pan: { ...initial.pan } };
  }

  if (initial.distance <= 0) {
    return {
      scale: initial.scale,
      pan: {
        x: Math.round(initial.pan.x + dragX / modelScale),
        y: Math.round(initial.pan.y + dragY / modelScale),
      },
    };
  }

  const nextScale = clampScale(
    initial.scale * (distance / initial.distance),
  );
  const ratio = nextScale / initial.scale;
  const nextModelScale = modelScale * ratio;

  return {
    scale: nextScale,
    pan: {
      x: Math.round(
        initial.pan.x +
        dragX / nextModelScale +
        ((initial.midpoint.x - frameCenter.x) * (1 - ratio)) / nextModelScale,
      ),
      y: Math.round(
        initial.pan.y +
        dragY / nextModelScale +
        ((initial.midpoint.y - frameCenter.y) * (1 - ratio)) / nextModelScale,
      ),
    },
  };
}

export function getPanFromPointer(
  initialPan: PointerPosition,
  start: PointerPosition,
  current: PointerPosition,
  modelScale: number,
): PointerPosition {
  if (!Number.isFinite(modelScale) || modelScale <= 0) {
    return { x: initialPan.x, y: initialPan.y };
  }

  return {
    x: Math.round(initialPan.x + (current.x - start.x) / modelScale),
    y: Math.round(initialPan.y + (current.y - start.y) / modelScale),
  };
}
