import { readable, get } from "svelte/store";
import { toast } from "./stores";
import {
  AlignedBoxLabel,
  Labels,
  DraftLabels,
  TimestampedLabel,
  LabelConfig,
  Point,
  Bitmap,
  MediaLoadState,
  DraftState,
} from "./types";
import { counts2values, values2counts } from "./masking";

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

export const sortBoxPoints = (box: AlignedBoxLabel): AlignedBoxLabel => {
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
    boxes: labels.boxes.map(sortBoxPoints),
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

export const findFocusTarget = (element: HTMLElement) =>
  element.closest(".qslwidgets-labeler");

export const elementIsFocused = (
  element: HTMLElement,
  target?: EventTarget | null
) => {
  const active = document.activeElement;
  if (!active) {
    return false;
  }
  const parent1 = findFocusTarget(active as HTMLElement);
  const parent2 = findFocusTarget(element);
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
  const same = parent1.isSameNode(parent2);
  return same;
};

export const focus = (element?: HTMLElement) => {
  if (!element) return false;
  const parent = findFocusTarget(element);
  if (!parent) {
    return false;
  }
  const target = parent.querySelector(".focus-target") as HTMLElement;
  if (!target) {
    return false;
  }
  target.focus({ preventScroll: true });
  return true;
};

export const processSelectionChange = (
  value: string,
  selected: string[] | undefined,
  multiple: boolean,
  required?: boolean
) =>
  selected && selected.indexOf(value) > -1
    ? multiple
      ? selected.filter((v) => v != value)
      : required
      ? selected
      : []
    : multiple
    ? (selected || []).concat([value])
    : [value];

export const createContentLoader = <T>(options: {
  target?: string;
  load: (event: any) => Promise<T>;
}) => {
  let state = {
    target: options.target,
    loadState: (options.target ? "loading" : "empty") as MediaLoadState,
    mediaState: undefined as T | undefined,
  };
  let apply: { resolve: (update: typeof state) => void; reject: () => void };
  const promise = new Promise<typeof state>(
    (resolve, reject) => (apply = { reject, resolve })
  );
  return {
    callbacks: {
      error: () => apply.reject(),
      load: (event: Event) =>
        options.load(event).then(
          (mediaState: T) =>
            apply.resolve({ ...state, mediaState, loadState: "loaded" }),
          () => apply.reject()
        ),
    },
    state: readable(state, (set) => {
      promise.then(set, () => {
        toast.push(`An error occurred loading ${options.target}`, {
          theme: {
            "--toastBackground": "var(--color3)",
            "--toastBarBackground": "#C53030",
          },
        });
      });
    }),
  };
};

export const undoable = <T>(initial: T) => {
  let count = 0;
  let subscribers: {
    state: { [key: number]: (state: T) => void };
    history: { [key: number]: (history: number) => void };
  } = {
    state: {},
    history: {},
  };
  let history: T[] = [];
  let current: T = initial;
  const notify = () => {
    Object.values(subscribers["state"]).forEach((subscriber) => {
      subscriber(current);
    });
    Object.values(subscribers["history"]).forEach((subscriber) =>
      subscriber(history.length)
    );
  };

  return {
    history: {
      undo: () => {
        if (history.length > 0) {
          current = history.pop() as T;
          notify();
        }
      },
      subscribe: (subscriber: (state: number) => void) => {
        subscribers["history"][count] = subscriber;
        subscriber(history.length);
        count = count + 1;
        return () => delete subscribers["history"][count - 1];
      },
    },
    state: {
      set: (update: T) => {
        current = update;
        notify();
      },
      snapshot: () => {
        history = [...history.slice(-9), structuredClone(current)];
      },
      reset: (update: T) => {
        history = [];
        current = update;
        notify();
      },
      subscribe: (subscriber: (state: T) => void) => {
        subscribers["state"][count] = subscriber;
        subscriber(current);
        count = count + 1;
        return () => delete subscribers["state"][count - 1];
      },
    },
  };
};

export const emptyDraftState: DraftState = {
  drawing: {
    mode: "boxes",
    radius: 5,
    threshold: -1,
  },
  dirty: false,
  labels: { image: {}, polygons: [], boxes: [], masks: [] },
  image: null,
};

export const createDraftStore = () => {
  const inner = undoable<DraftState>(emptyDraftState);
  const reset = (labels: Labels) =>
    inner.state.reset({
      ...get(inner.state),
      dirty: false,
      labels: labels2draft(labels),
    });
  return {
    history: inner.history,
    draft: {
      ...inner.state,
      reset,
      export: () => draft2labels(get(inner.state).labels),
    },
  };
};

export const labels4timestamp = (
  labels: TimestampedLabel[],
  timestamp: number
): TimestampedLabel => {
  if (!labels) return { timestamp, end: undefined, labels: { image: {} } };
  return (
    labels.filter((l) => l.timestamp === timestamp)[0] || {
      timestamp,
      end: undefined,
      labels: { image: {} },
    }
  );
};
