export type TileGridNavigationKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End";

export interface TileGridSelection {
  index: number;
  selected: boolean;
}

export function getGridColumnCount(
  itemCount: number,
  columns: number,
): number {
  if (itemCount <= 0) return 1;
  return Math.max(1, Math.min(itemCount, Math.floor(columns) || 1));
}

export function getNextGridIndex(
  index: number,
  itemCount: number,
  columns: number,
  key: TileGridNavigationKey,
  ctrlKey = false,
): number | null {
  if (index < 0 || index >= itemCount || itemCount === 0) return null;

  const columnCount = getGridColumnCount(itemCount, columns);
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;

  switch (key) {
    case "ArrowLeft":
      return column > 0 ? index - 1 : null;
    case "ArrowRight":
      return column < columnCount - 1 && index + 1 < itemCount ? index + 1 : null;
    case "ArrowUp":
      return row > 0 ? index - columnCount : null;
    case "ArrowDown":
      return index + columnCount < itemCount ? index + columnCount : null;
    case "Home":
      return ctrlKey ? 0 : row * columnCount;
    case "End": {
      if (ctrlKey) return itemCount - 1;
      return Math.min(itemCount - 1, row * columnCount + columnCount - 1);
    }
  }
}

export function getSelectionChange(
  currentIndex: number,
  nextIndex: number,
  itemCount: number,
): TileGridSelection | null {
  if (
    nextIndex < 0 ||
    nextIndex >= itemCount ||
    nextIndex === currentIndex
  ) {
    return null;
  }
  return { index: nextIndex, selected: true };
}
