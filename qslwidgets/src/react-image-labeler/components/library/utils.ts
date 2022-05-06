import {
  AlignedBoxLabel,
  Labels,
  DraftLabels,
  TimestampedLabel,
  LabelConfig,
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
