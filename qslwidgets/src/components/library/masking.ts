import {
  Point,
  Vec,
  Scale,
  Dimensions,
  Bitmap,
  ImageData,
  NodeStatus,
  VisitedNodeStatus,
  MaskLabel,
  MaskCandidatePoint,
} from "./types";

const hsvChannels = 3;
const maxSegmentationIters = 1_000_000;
const matchedValue = 255;

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

const add = <T extends Point>(p: T, d: Vec): T => {
  return { ...p, x: p.x + d.dx, y: p.y + d.dy };
};

// Adapted from https://github.com/bwiklund/flood-fill/blob/master/spec/flood-fill.spec.ts
type FloodFillOperations<T> = {
  equals: (a: T, b: T) => boolean;
  isInBounds: (point: MaskCandidatePoint) => boolean;
  getImageValue: (point: Point) => T | undefined;
  getMatchValue: (point: MaskCandidatePoint) => NodeStatus;
  setMatchValue: (point: MaskCandidatePoint, status: VisitedNodeStatus) => void;
};

const flood = <T>(
  targets: MaskCandidatePoint[],
  operations: FloodFillOperations<T>,
  limit?: number
) => {
  const queue = targets.filter((p) => operations.isInBounds(p));
  let count = 0;
  if (!limit) {
    return;
  }
  while (queue.length > 0 && count < limit) {
    const node = queue.shift()!;
    const candidates = directions
      .map((d, di) => {
        return {
          ...add(node, d),
          origin: node,
          direction: di,
        };
      })
      .filter(operations.isInBounds)
      .filter((c) => operations.getMatchValue(c) == "unknown");
    const matches = candidates.filter((c) => {
      const candidateValue = operations.getImageValue(c);
      const originValue = operations.getImageValue(c.origin);
      return (
        originValue !== undefined &&
        candidateValue !== undefined &&
        operations.equals(originValue, candidateValue)
      );
    });
    candidates.forEach((c) => operations.setMatchValue(c, "visited"));
    matches.forEach((m) => operations.setMatchValue(m, "matched"));
    queue.push(...matches);
    count += 1;
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
  maxSize: number
): ImageData => {
  const context = canvas.getContext("2d");
  const natural = getNaturalDimensions(img);
  if (!context) {
    throw Error("Failed to get a drawing context.");
  }
  const scale = maxSize / Math.max(natural.width, natural.height);
  canvas.width = Math.round(scale * natural.width);
  canvas.height = Math.round(scale * natural.height);
  context.filter = getComputedStyle(img).filter;
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
  } catch (e) {
    console.error(`Failed to load image, likely due to CORS issues: ${e}.`);
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

const cxcyFloat2x1y1Int = (
  point: Point,
  radius: Vec,
  dimensions: Dimensions
) => {
  const pointc = {
    x: Math.max(0, Math.round((point.x - radius.dx) * dimensions.width)),
    y: Math.max(0, Math.round((point.y - radius.dy) * dimensions.height)),
  };
  const kernelc = {
    dx: Math.min(
      Math.round(
        (2 * radius.dx + Math.min(0, point.x - radius.dx)) * dimensions.width
      ),
      dimensions.width - pointc.x
    ),
    dy: Math.min(
      Math.round(
        (2 * radius.dy + Math.min(0, point.y - radius.dy)) * dimensions.height
      ),
      dimensions.height - pointc.y
    ),
  };
  return {
    point: pointc,
    kernel: kernelc,
  };
};

const computeEdgePoints = (point: Point, kernel: Vec): MaskCandidatePoint[] => {
  return [
    Array.from(Array(kernel.dx).keys()).map((v) => {
      return [
        { x: v + point.x, y: point.y },
        { x: v + point.x, y: point.y + kernel.dy },
      ];
    }),
    Array.from(Array(kernel.dy).keys()).map((v) => {
      return [
        { y: v + point.y, x: point.x },
        { y: v + point.y, x: point.x + kernel.dx },
      ];
    }),
  ]
    .flat(2)
    .map((p) => {
      return {
        ...p,
        origin: point,
        direction: -1,
      };
    });
};

const blockFill = (map: Bitmap, point: Point, kernel: Vec, value: number) => {
  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x + kernel.dx > map.dimensions.width ||
    point.y + kernel.dy > map.dimensions.height
  ) {
    throw `Detected invalid block fill point/parameters. kernel: (${kernel.dx}, ${kernel.dy}), point: (${point.x}, ${point.y}), dimensions: (${map.dimensions.width}, ${map.dimensions.height})`;
  }
  const values = Array(kernel.dx).fill(value);
  Array.from(Array(kernel.dy).keys()).forEach((yi) => {
    map.values.set(values, (point.y + yi) * map.dimensions.width + point.x);
  });
};

const dilate = (map: Bitmap, kSize: Vec) => {
  for (let row = 0; row <= map.dimensions.height - kSize.dy; row++) {
    let col = 0;
    while (col <= map.dimensions.width - kSize.dx) {
      const corners = [
        { dx: 0, dy: 0 },
        { dx: kSize.dx, dy: 0 },
        kSize,
        { dx: 0, dy: kSize.dy },
      ].map((d) => (row + d.dy) * map.dimensions.width + col + d.dx);
      if (corners.every((index) => map.values[index] === matchedValue)) {
        blockFill(map, { x: col, y: row }, kSize, matchedValue);
        col += kSize.dx;
      } else {
        col += 1;
      }
    }
  }
};

const unfill = (point: Point, bitmap: Bitmap, radius: Vec) => {
  const converted = cxcyFloat2x1y1Int(point, radius, bitmap.dimensions);
  blockFill(bitmap, converted.point, converted.kernel, 0);
  return bitmap.values;
};

const fill = (
  point: Point,
  image: ImageData,
  options: {
    threshold: number;
    radius: Vec;
    previous?: Bitmap;
    inverse: boolean;
  }
): Uint8ClampedArray => {
  const threshold2 = options.threshold ** 2;
  if (
    options.previous &&
    image.width * image.height !== options.previous.values.length
  )
    throw `Incompatible dimensions for mask (${options.previous.values.length}) and canvas (${image.width}x${image.height}).`;
  if (options.inverse && options.previous) {
    return unfill(point, options.previous, options.radius);
  }
  const mask: Bitmap = {
    values: new Uint8ClampedArray(
      options.previous
        ? options.previous.dimensions.width * options.previous.dimensions.height
        : image.width * image.height
    ),
    dimensions: options.previous
      ? options.previous.dimensions
      : { height: image.height, width: image.width },
  };
  // It's possible that we need to edit
  // a mask that was originally drawn using
  // a differently sized canvas. This allows
  // for that conversion.
  const scale: Scale = {
    sx: mask.dimensions.width / image.width,
    sy: mask.dimensions.height / image.height,
  };
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
    getMatchValue: (point) => {
      const index = point2index(
        scalePoint(point, scale),
        mask.dimensions.width
      );
      const value = mask.values[index];
      switch (value) {
        case 0:
          return "unknown";
        case matchedValue:
          return "matched";
        default:
          if (
            point.direction < 0 ||
            value.toString(2).padStart(directions.length, "0")[
              point.direction
            ] === "0"
          ) {
            return "unknown";
          } else {
            return "visited";
          }
      }
    },
    setMatchValue: (point, status) => {
      const index = point2index(
        scalePoint(point, scale),
        mask.dimensions.width
      );
      switch (status) {
        case "matched":
          mask.values[index] = matchedValue;
          break;
        case "visited":
          const existing = mask.values[index]
            .toString(2)
            .padStart(directions.length, "0");
          const updated = parseInt(
            existing.substring(0, point.direction) +
              1 +
              existing.substring(point.direction + 1),
            2
          );
          mask.values[index] = updated;
          break;
        default:
          throw `Unsupported flood map setting passed: ${status}`;
      }
    },
  };
  const maskPt = cxcyFloat2x1y1Int(point, options.radius, mask.dimensions);
  const imagePt = cxcyFloat2x1y1Int(point, options.radius, image);
  blockFill(mask, maskPt.point, maskPt.kernel, matchedValue);
  flood<Uint8ClampedArray>(
    computeEdgePoints(imagePt.point, imagePt.kernel),
    operations,
    options.threshold > -1 && image.hsv ? maxSegmentationIters : 0
  );
  // Set mask to be matched if either the memo or the mask are matched.
  if (options.previous) {
    options.previous.values.forEach((v, i) => {
      if (v === matchedValue) {
        mask.values[i] = v;
      }
    });
  }
  if (options.radius && image.hsv) {
    dilate(mask, {
      dx: Math.round(options.radius.dx * mask.dimensions.width),
      dy: Math.round(options.radius.dy * mask.dimensions.height),
    });
  }
  return mask.values;
};

export const counts2values = (counts: number[]) =>
  new Uint8ClampedArray(
    counts
      .map((length, index) =>
        Array.from(Array(length).keys()).map(() =>
          index % 2 === 0 ? matchedValue : 0
        )
      )
      .flat()
  );

export const values2counts = (values: Uint8ClampedArray) =>
  values.reduce(
    (memo, value) => {
      if (((memo.length - 1) % 2 == 0) == (value == matchedValue)) {
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
      mask.map.values[
        Math.round(point.y * mask.map.dimensions.height) *
          mask.map.dimensions.width +
          Math.round(point.x * mask.map.dimensions.width)
      ] === matchedValue
    );
  });
};

export { img2hsv, fill, unfill };
