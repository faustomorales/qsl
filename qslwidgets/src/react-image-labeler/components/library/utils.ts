import {
  AlignedBoxLabel,
  Labels,
  DraftLabels,
  TimestampedLabel,
  LabelConfig,
  Point,
  Bitmap,
} from "./types";
import { counts2values, values2counts } from "./flooding";

export const pct2css = (pct: number): string => `${100 * pct}%`;
export const insertOrAppend = <T>(
  arr: T[],
  item: T,
  idx: number,
  save: boolean
) =>
  (save ? [item] : []).concat(
    arr
      .slice(0, idx > -1 ? idx : undefined)
      .concat(idx > -1 ? arr.slice(idx + 1) : [])
  );
export const copy = (o: any) => {
  try {
    return JSON.parse(JSON.stringify(o));
  } catch {
    throw `Failed to copy object: ${o}`;
  }
};
export const labels2string = (labels: { [key: string]: string[] }) => {
  return Object.keys(labels)
    .filter((k) => labels[k].length == 1)
    .map((k) => `${k}: ${labels[k][0]}`)
    .join(", ");
};
export const epsilon = 1e-4;

export const labels2draft = (labels?: Labels): DraftLabels => {
  return {
    image: copy(labels?.image || {}),
    polygons: copy(labels?.polygons || []),
    masks: (labels?.masks || []).map((m) => {
      return {
        ...m,
        map: {
          dimensions: m.map.dimensions,
          values: counts2values(m.map.counts),
        },
      };
    }),
    dimensions: labels?.dimensions ? copy(labels.dimensions) : undefined,
    boxes: copy(labels?.boxes || []),
  };
};

export const fixBox = (box: AlignedBoxLabel): AlignedBoxLabel => {
  const pt1 = box.pt1;
  const pt2 = box.pt2 || box.pt1;
  return {
    ...box,
    pt1: {
      x: Math.min(pt1.x, pt2.x),
      y: Math.min(pt1.y, pt2.y),
    },
    pt2: {
      x: Math.max(pt1.x, pt2.x),
      y: Math.max(pt1.y, pt2.y),
    },
  };
};

export const draft2labels = (labels: DraftLabels): Labels => {
  return {
    ...labels,
    boxes: labels.boxes.map(fixBox),
    masks: labels.masks.map((m) => {
      return {
        ...m,
        map: {
          dimensions: m.map.dimensions,
          counts: values2counts(m.map.values),
        },
      };
    }),
  };
};

export const insertOrAppendByTimestamp = (
  current: TimestampedLabel,
  existing: TimestampedLabel[]
) => {
  return insertOrAppend(
    existing,
    current,
    existing.findIndex((i) => i.timestamp === current.timestamp),
    true
  ).sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
};

export const shortcutify = (initial: LabelConfig[]): LabelConfig[] => {
  let taken = initial.reduce(
    (memo, entry) =>
      entry.options
        ? memo.concat(
            entry.options
              .filter((o) => o.shortcut)
              .map((o) => o.shortcut) as string[]
          )
        : memo,
    [] as string[]
  );
  return initial.map((entry) => {
    return {
      ...entry,
      options: entry.options
        ? entry.options.map((option) => {
            let shortcut = option.shortcut;
            if (!shortcut) {
              shortcut = [...option.name.toLowerCase()].find(
                (c) => taken.indexOf(c) == -1
              );
              if (shortcut) {
                taken.push(shortcut);
              }
            }
            return { ...option, shortcut };
          })
        : undefined,
    };
  });
};

export const interpretPolygonPoints = (raw: Point[], cursor?: Point) => {
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

export const renderBitmapToCanvas = (
  bitmap: Bitmap,
  canvas: HTMLCanvasElement,
  color: "red" | "blue" | "yellow"
) => {
  if (!canvas) {
    return false;
  }
  let context = canvas.getContext("2d");
  if (context && bitmap) {
    canvas.width = bitmap.dimensions.width;
    canvas.height = bitmap.dimensions.height;
    const pixels = context.createImageData(
      bitmap.dimensions.width,
      bitmap.dimensions.height
    );
    const colorValues =
      color === "red"
        ? [255, 0, 0, 127]
        : color === "blue"
        ? [0, 0, 255, 127]
        : [255, 255, 0, 127];
    Uint8ClampedArray.from(
      Array.from(bitmap.values)
        .map((v) => (v === 255 ? colorValues : [0, 0, 0, 0]))
        .flat()
    ).forEach((v, i) => (pixels.data[i] = v));
    context.putImageData(pixels, 0, 0);
    return true;
  }
  return false;
};

export const buildOptions = (
  selected: string[] | undefined,
  config: LabelConfig
) =>
  config.options || config.multiple
    ? (config.options || [])
        .concat(
          selected
            ? selected
                .filter(
                  (s) =>
                    (config.options || []).findIndex((o) => o.name === s) == -1
                )
                .map((s) => {
                  return { name: s, shortcut: "" };
                })
            : []
        )
        .map((o) => {
          return {
            ...o,
            selected: selected && selected.indexOf(o.name) > -1,
            label: `${o.displayName || o.name} ${
              o.shortcut ? `(${o.shortcut})` : ""
            }`,
          };
        })
    : undefined;

export const delay = (amount: number) =>
  new Promise((resolve) => setTimeout(resolve, amount));

export const simulateClick = (target: HTMLElement | null, offset?: Point) =>
  new Promise<void>((resolve) => {
    if (!target) return;
    target.focus({ preventScroll: true });
    target.classList.add("active");
    const { x, y } = target.getBoundingClientRect();
    const args = {
      bubbles: true,
      cancelable: true,
      ...(offset
        ? {
            clientX: x + offset.x,
            clientY: y + offset.y,
          }
        : {}),
    };
    target.dispatchEvent(new MouseEvent("mousedown", args));
    target.dispatchEvent(new MouseEvent("mouseup", args));
    delay(100).then(() => {
      target.dispatchEvent(new MouseEvent("click", args));
      target.classList.remove("active");
      target.blur();
      resolve();
    });
  });

export const elementIsFocused = (
  element: HTMLElement,
  target?: EventTarget | null
) => {
  const active = document.activeElement;
  if (!active) {
    return false;
  }
  const parent1 = active.closest(".react-image-labeler");
  const parent2 = element.closest(".react-image-labeler");
  if (!parent1 || !parent2) {
    return false;
  }

  if (
    target &&
    target instanceof HTMLElement &&
    (target.nodeName === "TEXTAREA" ||
      (target.nodeName === "INPUT" &&
        (target as HTMLInputElement).type == "text"))
  ) {
    // We're typing into a form field and this field is *not* a checkbox
    // or radio element.
    return false;
  }
  return parent1.isSameNode(parent2);
};

export const focus = (element: HTMLElement) => {
  const parent = element.closest(".react-image-labeler");
  if (!parent) {
    return false;
  }
  const target = parent.querySelector(
    ".react-image-labeler-input-target.hidden"
  ) as HTMLElement;
  if (!target) {
    return false;
  }
  target.focus({ preventScroll: true });
  return true;
};
