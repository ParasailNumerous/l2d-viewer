export type TileItemSemantics = "button" | "gridcell";

export function getTileItemSemantics(
  gridcell: boolean,
  role: string | null,
): TileItemSemantics {
  return gridcell || role === "gridcell" ? "gridcell" : "button";
}
