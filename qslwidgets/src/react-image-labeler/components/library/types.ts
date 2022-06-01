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

export type DrawingState =
  | {
      mode: "polygons";
      active?: { idx: number; region: PolygonLabel };
    }
  | {
      mode: "masks";
      flood: boolean;
      active?: { idx: number; region: MaskLabel<Bitmap> };
    }
  | {
      mode: "boxes";
      active?: { idx: number; region: AlignedBoxLabel };
    };
export interface CanvasData {
  hsv?: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface CursorData {
  radius: number;
  threshold: number;
  coords: { x: number; y: number } | undefined;
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
  canvas: CanvasData | null;
  drawing: DrawingState;
}

export interface BaseLabelerProps<T, U> {
  config?: Config;
  target?: U;
  labels: T;
  options?: {
    progress?: number;
    maxCanvasSize?: number;
    maxViewHeight?: number;
    showNavigation?: boolean;
  };
  callbacks?: {
    onKeyboardEvent?: (event: KeyboardEvent) => void;
    onSave?: (labels: T) => void;
    onNext?: () => void;
    onPrev?: () => void;
    onDelete?: () => void;
    onIgnore?: () => void;
    onUnignore?: () => void;
    onSaveConfig?: (config: Config) => void;
    onShowIndex?: () => void;
  };
}

export type TimestampedLabel = {
  timestamp: number;
  labels: Labels;
  end?: number;
};

export interface ImageLabelerProps extends BaseLabelerProps<Labels, string> {
  preload?: string[];
  metadata?: ArbitraryMetadata;
}

export interface VideoLabelerProps
  extends BaseLabelerProps<TimestampedLabel[], string> {
  metadata?: ArbitraryMetadata;
}

export interface BatchEntry {
  metadata?: ArbitraryMetadata;
  labels: Labels;
  visible: boolean;
  selected: boolean;
  ignored: boolean;
  labeled: boolean;
}

export interface BatchImageLabelerProps
  extends BaseLabelerProps<Labels, (string | undefined)[]> {
  states: BatchEntry[];
  setStates: (states: BatchEntry[]) => void;
  columns?: number;
}

export type MediaRefs = {
  source: React.MutableRefObject<HTMLImageElement | HTMLVideoElement | null>;
  canvas: React.MutableRefObject<HTMLCanvasElement | null>;
};

type AxisDomainDefinition = ["dataMin" | number, "dataMax" | number];

export interface TimeSeriesTarget {
  plots: {
    x: {
      name: string;
      height?: number;
      values: number[];
      type?: "number" | "category";
      tickCount?: number;
      click?: string;
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
      types?: {
        left?: "number" | "category";
        right?: "number" | "category";
      };
      labels?: {
        left?: string;
        right?: string;
      };
      lines: {
        name: string;
        color?: string;
        type?: string;
        axis?: "left" | "right";
        values: number[];
        dot?: {
          labelKey?: string;
        };
      }[];
    };
    size?: Dimensions;
    areas?: {
      x1: number;
      x2: number;
      y1?: number;
      y2?: number;
      label: string;
      labelKey: string;
      labelVal: string;
    }[];
  }[];
}

export interface TimeSeriesLabelerProps
  extends BaseLabelerProps<Labels, TimeSeriesTarget> {
  target?: TimeSeriesTarget;
  metadata?: ArbitraryMetadata;
}

export type MediaLoadState = "loading" | "loaded" | "error";
