export type ArbitraryMetadata = { [key: string]: string };
export type Point = { x: number; y: number };
export type Vec = { dx: number; dy: number };
export interface MaskCandidatePoint extends Point {
  origin: Point;
  direction: number;
}
export type Scale = { sx: number; sy: number };
export type Dimensions = {
  width: number;
  height: number;
};

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

export interface Bitmap {
  dimensions: Dimensions;
  values: Uint8ClampedArray;
}

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
export interface ImageData {
  hsv?: Uint8ClampedArray;
  width: number;
  height: number;
}

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
  hiderequired?: boolean;
  freeformtag?: "input" | "textarea";
  layout?: "column" | "row";
}

export interface Config {
  image?: LabelConfig[];
  regions?: LabelConfig[];
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
}

export type TimestampedLabel = {
  timestamp: number;
  labels: Labels;
  end?: number;
};

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
  values: number[];
  dot?: {
    labelKey?: string;
  };
};

export interface TimeSeriesTarget {
  filename?: string;
  plots: {
    x: {
      name: string;
      height?: number;
      values: number[];
    };
    y: {
      animation?: number;
      limits?: {
        left?: AxisDomainDefinition;
        right?: AxisDomainDefinition;
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
    size?: Dimensions;
    areas?: {
      x1: number;
      x2: number;
      stroke?: string;
      strokeDashArray?: string;
      label: string;
      labelKey: string;
      labelVal: string;
    }[];
  }[];
}

export type MediaLoadState = "loading" | "loaded" | "error" | "empty";

export interface IndexState {
  rows: {
    [key: string]: number | string | null;
    qslId: number;
  }[];
  columns: { field: string; type: "string" | "number"; headerName: string }[];
  rowCount: number;
  rowsPerPage: number;
  sortModel: { field: string; sort: "asc" | "desc" }[];
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