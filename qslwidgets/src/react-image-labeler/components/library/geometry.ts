import { CursorData, DrawingState, Point, Dimensions } from "./types";

export const computeDistance = (
  pt1: Point,
  pt2: Point,
  dimensions?: Dimensions
): number =>
  Math.pow((pt1.x - pt2.x) * (dimensions ? dimensions.width : 1), 2) +
  Math.pow((pt1.y - pt2.y) * (dimensions ? dimensions.height : 1), 2);
export const isPolygonClosed = (candidate: Point, points?: Point[]) => {
  if (!points || points.length === 0) return false;
  const start = points[0];
  if (candidate.x === start.x && candidate.y === start.y) return true;
  return false;
};

export const snapPolygonCoords = (
  cursor: CursorData,
  drawing: DrawingState,
  dimensions: Dimensions
): CursorData => {
  if (
    !drawing.active ||
    drawing.mode !== "polygons" ||
    drawing.active.region.points.length == 0
  )
    return cursor;
  const start: Point = drawing.active.region.points[0];
  const distance = Math.sqrt(
    computeDistance(start, cursor.coords!, dimensions)
  );
  if (distance > 10) return cursor;
  return {
    ...cursor,
    coords: start,
  };
};
