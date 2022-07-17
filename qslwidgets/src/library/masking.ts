import type {
  ImageData,
  Point,
  Dimensions,
  Bitmap,
  RLEMap,
  MaskLabel,
} from "./types";

import init, { Image, Mask } from "./wasmtools";

init().then(() => {
  console.log("WASM module initialized.");
});

const matchedValue = 255;

// Taken from https://stackoverflow.com/a/53187807
const findLastIndex = <T>(
  array: Array<T>,
  predicate: (value: T, index: number, obj: T[]) => boolean
): number => {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
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
  let data: Uint8ClampedArray | undefined;
  try {
    data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch (e) {
    console.error(`Failed to load image, likely due to CORS issues: ${e}.`);
    data = undefined;
  }
  return new Image(data, canvas.width, canvas.height);
};

const rle2bmp = (rlemap: RLEMap): Bitmap => {
  return new Mask(
    new Uint8ClampedArray(
      rlemap.counts
        .map((length, index) =>
          Array.from(Array(length).keys()).map(() =>
            index % 2 === 0 ? matchedValue : 0
          )
        )
        .flat()
    ),
    rlemap.dimensions.width,
    rlemap.dimensions.height
  );
};

const bmp2rle = (bitmap: Bitmap): RLEMap => {
  return {
    counts: bitmap.contents().reduce(
      (memo, value) => {
        if (((memo.length - 1) % 2 == 0) == (value == matchedValue)) {
          memo[memo.length - 1] += 1;
        } else {
          memo.push(1);
        }
        return memo;
      },
      [0]
    ),
    dimensions: bitmap.dimensions(),
  };
};

const findMaskByPoint = (point: Point, masks: MaskLabel<Bitmap>[]): number => {
  return findLastIndex(
    masks,
    (mask) => mask.map.get(point.x, point.y) === matchedValue
  );
};

export { Image, Mask, img2hsv, findMaskByPoint, bmp2rle, rle2bmp };
