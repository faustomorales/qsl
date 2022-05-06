import {
  Point,
  Vec,
  Scale,
  Dimensions,
  Bitmap,
  CanvasData,
  NodeValue,
  NodeStatus,
  VisitedNodeStatus,
  MaskLabel,
} from "./types";

const hsvChannels = 3;
const maxSegmentationIters = 1_000_000;

const nodeStatusToValue: Record<NodeStatus, NodeValue> = {
  unknown: 0,
  visited: 127,
  matched: 255,
};
const valueToNodeStatus: Record<NodeValue, NodeStatus> = {
  0: "unknown",
  127: "visited",
  255: "matched",
};

const directions: Vec[] = [
  { dx: 0, dy: -1 }, // North
  { dx: -1, dy: 0 }, // West
  { dx: 0, dy: 1 }, // South
  { dx: 1, dy: 0 }, //  East
];

// Taken from https://stackoverflow.com/a/53187807
export function findLastIndex<T>(
  array: Array<T>,
  predicate: (value: T, index: number, obj: T[]) => boolean
): number {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
}

const add = (p: Point, d: Vec): Point => {
  return { x: p.x + d.dx, y: p.y + d.dy };
};

// Adapted from https://github.com/bwiklund/flood-fill/blob/master/spec/flood-fill.spec.ts
type FloodFillOperations<T> = {
  equals: (a: T, b: T) => boolean;
  isInBounds: (point: Point) => boolean;
  getImageValue: (point: Point) => T | undefined;
  getMatchValue: (point: Point) => NodeStatus;
  setMatchValue: (point: Point, status: VisitedNodeStatus) => void;
};

const fill = <T>(
  targets: Point[],
  operations: FloodFillOperations<T>,
  limit?: number
) => {
  const queue = targets.filter((p) => operations.isInBounds(p));
  // If we're out of bounds or if this
  // location already matches, return.
  if (queue.length == 0) return;
  const targetValues = queue
    .map(operations.getImageValue)
    .filter((value) => !!value);
  queue.forEach((t) => operations.setMatchValue(t, "matched"));
  if (targetValues.length === 0) return;
  let count = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    const candidates = directions
      .map((d) => add(node, d))
      .filter(operations.isInBounds)
      .filter((c) => operations.getMatchValue(c) == "unknown");
    const matches = candidates.filter((c) => {
      const comparisonValue = operations.getImageValue(c);
      return (
        comparisonValue !== undefined &&
        targetValues.some(
          (targetValue) =>
            targetValue && operations.equals(comparisonValue, targetValue)
        )
      );
    });
    candidates.forEach((c) => operations.setMatchValue(c, "visited"));
    matches.forEach((m) => operations.setMatchValue(m, "matched"));
    queue.push(...matches);
    count += 1;
    if (limit !== undefined && count > limit) {
      return;
    }
  }
};

const rgb2hsv = (...rgb: number[]) => {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    s = max === 0 ? 0 : d / max,
    v = max / 255,
    scale = 6 * d;
  let h: number;

  switch (max) {
    case min:
      h = 0;
      break;
    case r:
      h = (g - b + d * (g < b ? 6 : 0)) / scale;
      break;
    case g:
      h = (b - r + d * 2) / scale;
      break;
    case b:
      h = (r - g + d * 4) / scale;
      break;
    default:
      throw "Failed to select appropriate value for h.";
  }
  return [h, s, v].map((v) => Math.min(Math.round(v * 255), 255));
};

const getNaturalDimensions = (
  media: HTMLImageElement | HTMLVideoElement
): Dimensions => {
  return {
    width:
      media.nodeName === "VIDEO"
        ? (media as HTMLVideoElement).videoWidth
        : (media as HTMLImageElement).naturalWidth,
    height:
      media.nodeName === "VIDEO"
        ? (media as HTMLVideoElement).videoHeight
        : (media as HTMLImageElement).naturalHeight,
  };
};

const img2hsv = (
  img: HTMLImageElement | HTMLVideoElement,
  canvas: HTMLCanvasElement,
  max_size: number
): CanvasData => {
  const context = canvas.getContext("2d");
  const natural = getNaturalDimensions(img);
  if (!context) {
    throw Error("Failed to get a drawing context.");
  }
  const scale = max_size / Math.max(natural.width, natural.height);
  canvas.width = Math.round(scale * natural.width);
  canvas.height = Math.round(scale * natural.height);
  context.drawImage(
    img,
    0,
    0,
    natural.width,
    natural.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  try {
    const data = Array.from(
      context.getImageData(0, 0, canvas.width, canvas.height).data
    );
    return {
      hsv: new Uint8ClampedArray(
        Array.from(Array(canvas.width * canvas.height).keys())
          .map((i) => rgb2hsv(...data.slice(i * 4, i * 4 + 3)))
          .flat()
      ),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    console.error("Failed to load image, likely due to CORS issues.");
    return { width: canvas.width, height: canvas.height };
  }
};

const point2index = (point: Point, width: number): number => {
  return point.y * width + point.x;
};

const compare = (
  hsv0: number[],
  hsv1: number[],
  threshold2: number
): boolean => {
  if (hsv0.length !== 3 || hsv1.length !== 3) {
    throw "These points do not have the same number of color values.";
  }
  const [h0, s0, v0] = hsv0;
  const [h1, s1, v1] = hsv1;
  const dh = Math.min(Math.abs(h1 - h0), 255 - Math.abs(h1 - h0)) * 2;
  const ds = Math.abs(s1 - s0);
  const dv = Math.abs(v1 - v0);
  const distance = dh * dh + ds * ds + dv * dv;
  return distance <= threshold2;
};

const scalePoint = (point: Point, scale: Scale) => {
  return {
    x: Math.round(point.x * scale.sx),
    y: Math.round(point.y * scale.sy),
  };
};

const fillHsv = (
  point: Point,
  image: CanvasData,
  options: {
    threshold: number;
    previous?: Bitmap;
    radius?: Vec;
  }
): Uint8ClampedArray => {
  const threshold2 = options.threshold ** 2;
  if (
    options.previous &&
    image.width * image.height !== options.previous.values.length
  )
    throw `Incompatible dimensions for mask (${options.previous.values.length}) and canvas (${image.width}x${image.height}).`;
  const maskDimensions = options.previous
    ? options.previous.dimensions
    : { height: image.height, width: image.width };
  const mask = new Uint8ClampedArray(
    maskDimensions.width * maskDimensions.height
  );
  const pointInt = {
    x: Math.round(point.x * image.width),
    y: Math.round(point.y * image.height),
  };
  // It's possible that we need to edit
  // a mask that was originally drawn using
  // a differently sized canvas. This allows
  // for that conversion.
  const scale: Scale = {
    sx: maskDimensions.width / image.width,
    sy: maskDimensions.height / image.height,
  };
  const radiusInt: Vec = options.radius
    ? {
        dx: Math.round(options.radius.dx * image.width),
        dy: Math.round(options.radius.dy * image.height),
      }
    : {
        dx: 0,
        dy: 0,
      };
  const matchedValue = nodeStatusToValue["matched"];
  const operations: FloodFillOperations<Uint8ClampedArray> = {
    equals: (a, b) => compare(Array.from(a), Array.from(b), threshold2),
    isInBounds: (point) =>
      point.x < image.width &&
      point.y < image.height &&
      point.x >= 0 &&
      point.y >= 0,
    getImageValue: (point) => {
      const start = point2index(point, image.width) * hsvChannels;
      return image.hsv?.slice(start, start + hsvChannels);
    },
    getMatchValue: (point) =>
      valueToNodeStatus[
        mask[
          point2index(scalePoint(point, scale), maskDimensions.width)
        ] as NodeValue
      ],
    setMatchValue: (point, status) =>
      (mask[point2index(scalePoint(point, scale), maskDimensions.width)] =
        nodeStatusToValue[status]),
  };
  let points: Point[] = [];
  for (let dx = 0; dx <= radiusInt.dx; dx++) {
    for (let dy = 0; dy <= radiusInt.dy; dy++) {
      points = points.concat(
        (dx === 0 ? [dx] : [dx, -dx])
          .map((dxc) =>
            (dy === 0 ? [dy] : [dy, -dy]).map((dyc) => {
              return { x: pointInt.x + dxc, y: pointInt.y + dyc };
            })
          )
          .flat()
      );
    }
  }
  fill<Uint8ClampedArray>(points, operations, maxSegmentationIters);
  // Set mask to be matched if either the memo or the mask are matched.
  if (options.previous) {
    options.previous.values.forEach((v, i) => {
      if (v === matchedValue) {
        mask[i] = v;
      }
    });
  }
  return mask;
};

export const counts2values = (counts: number[]) =>
  new Uint8ClampedArray(
    counts
      .map((length, index) =>
        Array.from(Array(length).keys()).map(() => (index % 2 === 0 ? 255 : 0))
      )
      .flat()
  );

export const values2counts = (values: Uint8ClampedArray) =>
  values.reduce(
    (memo, value) => {
      if (((memo.length - 1) % 2 == 0) == (value == 255)) {
        memo[memo.length - 1] += 1;
      } else {
        memo.push(1);
      }
      return memo;
    },
    [0]
  );

export const findMaskByPoint = (
  point: Point,
  masks: MaskLabel<Bitmap>[]
): number => {
  return findLastIndex(masks, (mask) => {
    return (
      valueToNodeStatus[
        mask.map.values[
          Math.round(point.y * mask.map.dimensions.height) *
            mask.map.dimensions.width +
            Math.round(point.x * mask.map.dimensions.width)
        ] as NodeValue
      ] == "matched"
    );
  });
};

export {
  img2hsv,
  fillHsv,
  nodeStatusToValue,
  valueToNodeStatus,
  CanvasData,
  NodeValue,
  NodeStatus,
};
