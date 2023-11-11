import { readable, get } from "svelte/store";
import { getStores } from "./instanceStores";
import type {
  Config,
  AlignedBoxLabel,
  Labels,
  DraftLabels,
  TimestampedLabel,
  LabelConfig,
  LabelData,
  Point,
  Bitmap,
  MediaLoadState,
  DraftState,
  TimestampInfoWithMatch,
  Dimensions,
  TimestampInfo,
} from "./types";
import { bmp2rle, rle2bmp } from "./masking";

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
        map: rle2bmp(m.map),
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
        map: bmp2rle(m.map),
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

export const computeDefaultRegionLabels = (config: Config): LabelData => {
  return config.regions
    ? Object.fromEntries(config.regions.map((r) => [r.name, r.defaults || []]))
    : {};
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
    const dimensions = bitmap.dimensions();
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const pixels = context.createImageData(dimensions.width, dimensions.height);
    const blankValues = [0, 0, 0, 0];
    const colorValues =
      color === "red"
        ? [255, 0, 0, 127]
        : color === "blue"
        ? [0, 0, 255, 127]
        : [255, 255, 0, 127];
    bitmap
      .contents()
      .forEach((v, i) =>
        pixels.data.set(v === 255 ? colorValues : blankValues, i * 4)
      );
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

export const processSelectionChange = <T>(
  value: T,
  selected: T[] | undefined,
  multiple: boolean,
  required?: boolean,
  options?: boolean
) =>
  selected && selected.indexOf(value) > -1
    ? multiple
      ? selected.filter((v) => v != value)
      : required
      ? selected
      : options
      ? []
      : [value]
    : multiple
    ? (selected || []).concat([value])
    : [value];

export const createContentLoader = <T, V>(options: {
  targets: (V | undefined)[];
  load: (event: any, target: V | undefined) => Promise<T>;
}) => {
  let state = {
    targets: options.targets,
    loadState: (options.targets.every((t) => t === undefined)
      ? "empty"
      : "loading") as MediaLoadState,
    mediaState: undefined as
      | undefined
      | {
          states: T[];
        },
  };
  let interim = options.targets.map(() => undefined as T | undefined);
  let apply: {
    resolve: (update: typeof state) => void;
    reject: (target: V | undefined) => void;
  };
  const promise = new Promise<typeof state>(
    (resolve, reject) => (apply = { reject, resolve })
  );
  const stores = getStores();
  return {
    callbacks: options.targets.map((target, targeti) => ({
      load: (event: Event) =>
        options.load(event, target).then(
          (mediaState: T) => {
            interim[targeti] = mediaState;
            if (interim.every((i) => i !== undefined)) {
              apply.resolve({
                ...state,
                loadState: "loaded",
                mediaState: { states: interim as T[] },
              });
            }
          },
          () => apply.reject(target)
        ),
      error: () => apply.reject(target),
    })),
    promise,
    state: readable(state, (set) => {
      promise.then(set, (t) => {
        set({ ...state, loadState: "error" });
        stores.toast.push(`An error occurred loading ${t}.`, {
          theme: {
            "--toastBackground": "var(--color3)",
            "--toastBarBackground": "#C53030",
          },
        });
      });
    }),
  };
};

export const undoable = <T>(
  initial: T,
  serialize?: (current: T) => T,
  deserialize?: (value: T) => T,
  destroy?: (remove: T[], keep: T[]) => void,
  length: number = 10,
  debounce: number = 500
) => {
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
  let lastSnapshotTime = Date.now();
  return {
    history: {
      undo: () => {
        if (history.length > 0) {
          current = history.pop() as T;
          if (deserialize) {
            current = deserialize(current);
          }
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
        const nextSnapshotTime = Date.now();
        let nextSnapshot: T = (serialize || structuredClone)(current);
        let remove: T[];
        // Debounce should not apply to the first item, since it's likely our "initial state"
        // and we do not want to overwrite it.
        if (
          nextSnapshotTime - lastSnapshotTime > debounce ||
          history.length == 1
        ) {
          // Get as many items as needed from the front of the array.
          remove = history.slice(0, -(length - 1));
          history = [...history.slice(-(length - 1)), nextSnapshot];
        } else {
          // Get the last item from the array, since we're just going
          // to treat that last snapshot as redundant.
          remove = history.slice(-1);
          history = [...history.slice(0, -1), nextSnapshot];
        }

        if (destroy) {
          destroy(remove, history);
        }
        lastSnapshotTime = nextSnapshotTime;
      },
      reset: (update: T) => {
        if (destroy) {
          destroy(history, [update]);
        }
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
const deallocateMaps = (remove: DraftState[], keep: DraftState[]) => {
  const [removeMaps, keepMaps] = [remove, keep].map((stateSet) =>
    stateSet
      .map((state) =>
        state.labels.masks
          .map((m) => m.map)
          .concat(
            state.drawing.active && state.drawing.mode === "masks"
              ? [state.drawing.active.region.map]
              : []
          )
      )
      .flat()
  );
  const maps = new Set(removeMaps.filter((m) => keepMaps.indexOf(m) == -1));
  maps.forEach((m) => m.free());
};
export const createDraftStore = () => {
  const inner = undoable<DraftState>(
    emptyDraftState,
    (state) => ({
      dirty: state.dirty,
      image: state.image,
      timestampInfo: structuredClone(state.timestampInfo),
      labels: {
        ...structuredClone(state.labels),
        masks: state.labels.masks,
      },
      drawing: {
        ...state.drawing,
        active: state.drawing.active
          ? state.drawing.mode === "masks"
            ? {
                region: {
                  ...structuredClone({
                    ...state.drawing.active.region,
                    map: undefined,
                  }),
                  map: state.drawing.active.region.map,
                },
                editable: state.drawing.active.editable,
              }
            : structuredClone(state.drawing.active)
          : undefined,
      } as any,
    }),
    undefined,
    deallocateMaps
  );
  const reset = (
    labels: Labels,
    timestampInfo?: TimestampInfo | TimestampInfoWithMatch
  ) => {
    const initial = get(inner.state);
    if (initial.image) {
      initial.image.free();
    }
    inner.state.reset({
      ...initial,
      dirty: false,
      image: null,
      labels: labels2draft(labels),
      timestampInfo,
    });
  };
  return {
    history: inner.history,
    draft: {
      ...inner.state,
      reset,
      export: (dimensions?: Dimensions) => ({
        ...draft2labels(get(inner.state).labels),
        dimensions,
      }),
    },
  };
};

export const labels4timestamp = (
  labels: TimestampedLabel[],
  timestamp: number
): { label: TimestampedLabel; exists: boolean } => {
  if (!labels)
    return {
      label: { timestamp, end: undefined, labels: { image: {} } },
      exists: false,
    };
  const existing = labels.filter((l) => l.timestamp === timestamp)[0];
  return {
    label: existing || {
      timestamp,
      end: undefined,
      labels: { image: {} },
    },
    exists: !!existing,
  };
};
