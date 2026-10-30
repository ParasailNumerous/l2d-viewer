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

export interface Point {
  x: number;
  y: number;
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

/**
 * Zooms around a screen point while pan is stored in view units.
 * The rendered model origin is `frameCenter + pan * modelScale`.
 */
export function zoomViewAroundPoint(
  scale: number,
  pan: Point,
  point: Point,
  frameCenter: Point,
  modelScale: number,
  nextScale: number,
): { scale: number; pan: Point } {
  const clampedScale = clampScale(nextScale);
  const ratio = clampedScale / scale;
  const nextModelScale = modelScale * ratio;

  if (
    !Number.isFinite(modelScale) ||
    modelScale <= 0 ||
    !Number.isFinite(nextModelScale) ||
    nextModelScale <= 0
  ) {
    return { scale: clampedScale, pan };
  }

  return {
    scale: clampedScale,
    pan: {
      x: Math.round(
        pan.x + ((point.x - frameCenter.x) * (1 - ratio)) / nextModelScale,
      ),
      y: Math.round(
        pan.y + ((point.y - frameCenter.y) * (1 - ratio)) / nextModelScale,
      ),
    },
  };
}

export function getModelPosition(
  frame: FrameBounds,
  pan: Point,
  modelScale: number,
): Point {
  return {
    x: frame.x + frame.width / 2 + pan.x * modelScale,
    y: frame.y + frame.height / 2 + pan.y * modelScale,
  };
}

export function getPanStepSpeed(baseSpeed: number, modelScale: number): number {
  if (!Number.isFinite(modelScale) || modelScale <= 0) return 0;
  return Math.max(baseSpeed / modelScale, 1);
}

export function getExportModelPosition(
  exportSize: ViewportSize,
  pan: Point,
  modelScale: number,
  scaleMultiplier: number,
): Point {
  return {
    x: exportSize.width / 2 + pan.x * modelScale * scaleMultiplier,
    y: exportSize.height / 2 + pan.y * modelScale * scaleMultiplier,
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
