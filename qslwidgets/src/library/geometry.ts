import type { Point, Dimensions, PolygonLabel } from "./types";

export const getDistance = (
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

export const snap = (
  cursor: Point,
  polygon: PolygonLabel,
  dimensions: Dimensions
): Point => {
  if (polygon.points.length == 0) return cursor;
  const start: Point = polygon.points[0];
  const distance = Math.sqrt(getDistance(start, cursor, dimensions));
  if (distance > 10) return cursor;
  return start;
};

export const convertCoordinates = (
  point: Point,
  element: HTMLElement | null
): Point => {
  if (!element) {
    throw Error("Requested mouse position without a ref.");
  }
  const { x, y, width, height } = element.getBoundingClientRect();
  return {
    x: (point.x - window.scrollX - x) / width,
    y: (point.y - window.scrollY - y) / height,
  };
};

export const simplify = (raw: Point[], cursor?: Point) => {
  const points = cursor ? raw.concat([cursor]) : raw;
  const [xmin, ymin, xmax, ymax] = [Math.min, Math.max]
    .map((agg) =>
      ["x", "y"].map((k) =>
        agg.apply(Math, points.map((p) => p[k as "x" | "y"]) as number[])
      )
    )
    .flat() as number[];
  return { points, xmin, ymin, xmax, ymax };
};
