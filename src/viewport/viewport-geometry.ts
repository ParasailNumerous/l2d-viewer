export interface FrameBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export function clampScale(scale: number): number {
  return Number(Math.min(40, Math.max(0.1, scale)).toFixed(3));
}

export function getFramingBounds(
  viewport: ViewportSize,
  target: ViewportSize,
): FrameBounds {
  const viewportAspectRatio = viewport.width / viewport.height;
  const targetAspectRatio = target.width / target.height;
  let width = viewport.width;
  let height = viewport.height;

  if (viewportAspectRatio > targetAspectRatio) {
    width = viewport.height * targetAspectRatio;
  } else {
    height = viewport.width / targetAspectRatio;
  }

  return {
    x: (viewport.width - width) / 2,
    y: (viewport.height - height) / 2,
    width,
    height,
  };
}

export function zoomAroundPoint(
  scale: number,
  pan: { x: number; y: number },
  point: { x: number; y: number },
  center: { x: number; y: number },
  nextScale: number,
): { scale: number; pan: { x: number; y: number } } {
  const clampedScale = clampScale(nextScale);
  const ratio = clampedScale / scale;

  return {
    scale: clampedScale,
    pan: {
      x: Math.round(pan.x + (point.x - center.x) * (1 - ratio)),
      y: Math.round(pan.y + (point.y - center.y) * (1 - ratio)),
    },
  };
}

export function getModelFitScale(
  frame: Pick<FrameBounds, "width" | "height">,
  bounds: Pick<FrameBounds, "width" | "height">,
): number {
  if (
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return 0;
  }

  return Math.min(frame.width / bounds.width, frame.height / bounds.height);
}

export function getModelScale(
  frame: Pick<FrameBounds, "width" | "height">,
  bounds: Pick<FrameBounds, "width" | "height">,
  scale: number,
): number {
  return getModelFitScale(frame, bounds) * scale;
}
