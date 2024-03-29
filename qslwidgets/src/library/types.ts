import type { Writable, Readable } from "svelte/store";
import type { Image, Mask } from "./wasmtools";

export type ArbitraryMetadata = { [key: string]: string | number };
export type Point = { x: number; y: number };
export type Vec = { dx: number; dy: number };
export type Scale = { sx: number; sy: number };
export type Dimensions = {
  width: number;
  height: number;
};

export type ImageData = Image;

export interface LabelData {
  [key: string]: string[];
}

interface BaseRegionLabel {
  labels: LabelData;
  metadata?: ArbitraryMetadata;
  readonly?: boolean;
}

export interface PolygonLabel extends BaseRegionLabel {
  points: Point[];
}

export interface AlignedBoxLabel extends BaseRegionLabel {
  pt1: Point;
  pt2?: Point;
}

export interface RLEMap {
  dimensions: Dimensions;
  counts: number[];
}

export type Bitmap = Mask;

type Map = RLEMap | Bitmap;

export interface MaskLabel<T extends Map> extends BaseRegionLabel {
  map: T;
}

export interface DraftLabels {
  image: LabelData;
  polygons: PolygonLabel[];
  masks: MaskLabel<Bitmap>[];
  boxes: AlignedBoxLabel[];
  dimensions?: Dimensions;
}

export type DrawingState = {
  radius: number;
  threshold: number;
} & (
  | {
      mode: "polygons";
      active?: { editable: boolean; region: PolygonLabel };
    }
  | {
      mode: "masks";
      active?: { editable: boolean; region: MaskLabel<Bitmap> };
    }
  | {
      mode: "boxes";
      active?: { editable: boolean; region: AlignedBoxLabel };
    }
);

export interface Option {
  name: string;
  displayName?: string;
  shortcut?: string;
}

export interface LabelConfig {
  name: string;
  displayName?: string;
  options?: Option[];
  multiple: boolean;
  freeform: boolean;
  required?: boolean;
  disabled?: boolean;
  panelrow?: number;
  shortcut?: string;
  hiderequired?: boolean;
  freeformtag?: "input" | "textarea";
  layout?: "column" | "row";
}

export interface RegionLabelConfig extends LabelConfig {
  defaults?: string[];
}

export interface Config {
  image?: LabelConfig[];
  regions?: RegionLabelConfig[];
}

export type DrawingMode = "polygons" | "boxes" | "masks";

export type VisitedNodeStatus = "visited" | "matched";
export type NodeStatus = "unknown" | VisitedNodeStatus;
export interface Labels {
  image?: LabelData;
  polygons?: PolygonLabel[];
  masks?: MaskLabel<RLEMap>[];
  boxes?: AlignedBoxLabel[];
  dimensions?: Dimensions;
}

export interface DraftState {
  labels: DraftLabels;
  dirty: boolean;
  image: ImageData | null;
  drawing: DrawingState;
  timestampInfo?: TimestampInfo | TimestampInfoWithMatch;
}

export interface TimestampInfo {
  timestamp: number;
  end?: number;
}

export interface TimestampInfoWithMatch extends TimestampInfo {
  end: number;
  match: {
    timestamp: number;
    end: number;
  };
}

export interface TimestampedLabel extends TimestampInfo {
  labels: Labels;
}

export interface TimestampedLabelWithMatch extends TimestampInfoWithMatch {
  labels: Labels;
  end: number;
  match: {
    timestamp: number;
    end: number;
  };
}

export interface BatchEntry {
  metadata?: ArbitraryMetadata;
  labels: Labels;
  visible: boolean;
  selected: boolean;
  ignored: boolean;
  labeled: boolean;
}

export type AxisDomainDefinition = ["dataMin" | number, "dataMax" | number];
export type Line = {
  name: string;
  color?: string;
  type?: string;
  axis?: "left" | "right";
  values: (number | string)[];
  style?: string;
  dot?: {
    labelKey?: string;
    labelMaxCount?: number;
    radius?: number;
  };
  annotations?: {
    x: number;
    radius?: number;
    style?: string;
  }[];
};

export type ImageStackTarget = {
  images: {
    name: string;
    target: string;
    metadata?: ArbitraryMetadata;
    alt?: string;
    transform: number[][];
  }[];
};

export interface ImageGroupTarget {
  images: {
    target?: string;
    metadata?: ArbitraryMetadata;
    group?: string;
  }[];
  onClick?: {
    [key: string]: string;
  };
}

export interface TimeSeriesTarget {
  filename?: string;
  plots: {
    config?: {
      areaLabelLocation?: "top" | "middle";
      areaLabelFontSize?: number;
    };
    x: {
      name: string;
      height?: number;
      values: number[];
      limits?: AxisDomainDefinition;
      precision?: number;
    };
    y: {
      animation?: number;
      limits?: {
        left?: AxisDomainDefinition;
        right?: AxisDomainDefinition;
      };
      precision?: {
        left?: number;
        right?: number;
      };
      widths?: {
        left?: number;
        right?: number;
      };
      labels?: {
        left?: string;
        right?: string;
      };
      lines: Line[];
    };
    size?: { width?: number; height?: number };
    areas?: (
      | {
          x1: number;
          x2: number;
          activeColor?: string;
          hoverColor?: string;
          inactiveColor?: string;
          stroke?: string;
          strokeWidth?: string;
          strokeDashArray?: string;
          label: string | string[];
          labelKey: string;
          labelVal: string;
        }
      | {
          x1: number;
          x2: number;
          activeColor?: string;
          hoverColor?: string;
          inactiveColor?: string;
          stroke?: string;
          strokeWidth?: string;
          strokeDashArray?: string;
          label: string | string[];
          labelKey: undefined;
          labelVal: undefined;
        }
    )[];
  }[];
}

export type MediaLoadState = "loading" | "loaded" | "error" | "empty";

export interface IndexState<T extends string | number> {
  rows: {
    [key: string]: number | string | null;
    qslId: T;
  }[];
  columns: { field: string; type: "string" | "number"; headerName: string }[];
  rowCount: number;
  rowsPerPage: number;
  sortModel: { field: string; sort: "asc" | "desc" }[];
  filterModel: { field: string; value?: string }[];
  page: number;
}

export interface ImageEnhancements {
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface RangeSliderMark {
  value: number;
  label?: string;
}

export interface ButtonConfig {
  text: string;
  event: string;
  shortcuts: {
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    key: string;
  }[];
  class?: string;
  tooltip: string;
  disabled: boolean;
  highlighted?: boolean;
  hidden?: boolean;
}

export type WidgetActions = {
  save?: boolean;
  next?: boolean;
  prev?: boolean;
  delete?: boolean;
  ignore?: boolean;
  unignore?: boolean;
  showIndex?: boolean;
};

export interface ControlMenuActions extends WidgetActions {
  selectAll?: boolean;
  selectNone?: boolean;
  download?: boolean;
  undo?: boolean;
}

export interface ToastEntry {
  duration: number;
  initial: number;
  next: number;
  pausable: boolean;
  dismissable: boolean;
  reversed: boolean;
  intro: { x: number };
  msg: string;
  id: number;
  classes: string[];
  theme: { [key: string]: string };
}

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

interface BaseWidgetState<Type, LabelType, UrlType> {
  states: {
    metadata?: { [key: string]: string };
    selected: boolean;
    visible: boolean;
    ignored: boolean;
    labeled: boolean;
    labels: Labels;
  }[];
  urls: UrlType[];
  message: string;
  type: Type;
  config: Config;
  labels: LabelType;
  action: ActionType;
  preload: string[];
  maxCanvasSize: number;
  maxViewHeight: number;
  idx: number;
  viewState: "transitioning" | "labeling" | "index";
  indexState: IndexState<string | number>;
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

type ImageGroupWidgetState = BaseWidgetState<
  "image-group",
  Labels,
  ImageGroupTarget
>;

export interface VideoSegmentVideo {
  target: string;
  metadata?: ArbitraryMetadata;
}

export interface VideoSegmentTarget {
  video1: VideoSegmentVideo;
  video2: VideoSegmentVideo;
}

type VideoSegmentPairingWidgetState = BaseWidgetState<
  "video-segment-pairs",
  TimestampedLabelWithMatch[],
  VideoSegmentTarget
>;

type ImageWidgetState = BaseWidgetState<"image", Labels, string>;
type VideoWidgetState = BaseWidgetState<"video", TimestampedLabel[], string>;
type TimeVideoState = BaseWidgetState<"time-series", Labels, TimeSeriesTarget>;
type ImageStackWidgetState = BaseWidgetState<
  "image-stack",
  Labels,
  ImageStackTarget
>;
export type WidgetState =
  | VideoWidgetState
  | ImageWidgetState
  | TimeVideoState
  | ImageGroupWidgetState
  | ImageStackWidgetState
  | VideoSegmentPairingWidgetState;

export type ForceableWritable<T> = Writable<T> & {
  set: (value: T, force?: boolean) => void;
};
export type Extractor = <V extends keyof WidgetState & string>(
  name: V
) => ForceableWritable<WidgetState[V]>;

export type ToastStore = Readable<ToastEntry[]> & {
  push: (msg: string, opts?: {}) => void;
  pop: (id: number) => void;
};

export type SharedStores = {
  id: string;
  toast: ToastStore;
  enhancements: Writable<ImageEnhancements>;
};

export type StackContentLayer = {
  size: Dimensions;
  transform: number[][];
};

export type StackContentState = {
  size: Dimensions;
  layers: StackContentLayer[];
};
