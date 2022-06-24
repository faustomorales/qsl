import {
  TimeSeriesTarget,
  TimestampedLabel,
  IndexState,
  Labels,
  Config,
} from "./components/library/types";

import { Writable } from "svelte/store";

export type ActionType =
  | "next"
  | "prev"
  | "delete"
  | "ignore"
  | "unignore"
  | "save"
  | "label"
  | "index"
  | "";

interface BaseWidgetState<T, U, V> {
  states: {
    metadata?: { [key: string]: string };
    selected: boolean;
    visible: boolean;
    ignored: boolean;
    labeled: boolean;
    labels: Labels;
  }[];
  urls: V;
  message: string;
  type: T;
  config: Config;
  labels: U;
  action: ActionType;
  preload: string[];
  maxCanvasSize: number;
  maxViewHeight: number;
  idx: number;
  viewState: "transitioning" | "labeling" | "index";
  indexState: IndexState;
  buttons: {
    next: boolean;
    prev: boolean;
    save: boolean;
    config: boolean;
    delete: boolean;
    ignore: boolean;
    unignore: boolean;
  };
  base: {
    serverRoot: string;
    url: string;
  };
  progress: number;
  mode: "light" | "dark";
}

type ImageWidgetState = BaseWidgetState<"image", Labels, string[]>;
type VideoWidgetState = BaseWidgetState<"video", TimestampedLabel[], string[]>;
type TimeVideoState = BaseWidgetState<
  "time-series",
  Labels,
  TimeSeriesTarget[]
>;
export type WidgetState = VideoWidgetState | ImageWidgetState | TimeVideoState;

export const defaultWidgetState: WidgetState = {
  states: [],
  urls: [],
  type: "image",
  message: "",
  config: { image: [], regions: [] } as Config,
  labels: { image: {}, polygons: [], masks: [], boxes: [] } as Labels,
  action: "",
  preload: [] as string[],
  maxCanvasSize: 512 as number,
  maxViewHeight: 512 as number,
  idx: 0,
  viewState: "labeling",
  indexState: {
    rows: [],
    columns: [],
    rowsPerPage: 5,
    rowCount: 0,
    sortModel: [],
    page: 1,
  },
  buttons: {
    next: true,
    prev: true,
    save: true,
    config: true,
    delete: true,
    ignore: true,
    unignore: true,
  },
  base: {
    serverRoot: "",
    url: "",
  },
  progress: -1,
  mode: "light" as "light" | "dark",
};

export type Extractor = <V extends keyof WidgetState & string>(
  name: V
) => Writable<WidgetState[V]>;
