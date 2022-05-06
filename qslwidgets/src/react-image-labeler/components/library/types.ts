export type Point = { x: number; y: number };
export type Vec = { dx: number; dy: number };
export type Scale = { sx: number; sy: number };
export type Dimensions = {
  width: number;
  height: number;
};
// Taken from https://mstn.github.io/2018/06/08/fixed-size-arrays-in-typescript/
export type FixedSizeArray<N extends number, T> = N extends 0
  ? never[]
  : {
      0: T;
      length: N;
    } & ReadonlyArray<T>;

export interface LabelData {
  [key: string]: string[];
}

export interface PolygonLabel {
  points: Point[];
  labels: LabelData;
}

export interface AlignedBoxLabel {
  pt1: Point;
  pt2?: Point;
  labels: LabelData;
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

export interface MaskLabel<T extends Map> {
  map: T;
  labels: LabelData;
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
export type NodeValue = 0 | 127 | 255;
export type NodeStatus = "unknown" | VisitedNodeStatus;
export type NodeStatusColorMap = Record<NodeStatus, FixedSizeArray<4, number>>;
export interface Labels {
  image?: LabelData;
  polygons?: PolygonLabel[];
  masks?: MaskLabel<RLEMap>[];
  boxes?: AlignedBoxLabel[];
  dimensions?: Dimensions;
}

export interface DraftState {
  cursor: CursorData;
  labels: DraftLabels;
  dirty: boolean;
  canvas: CanvasData | null;
  drawing: DrawingState;
}

export interface BaseLabelerProps<T, U> {
  config?: Config;
  target?: U;
  labels?: T;
  options?: {
    progress?: number;
    maxCanvasSize?: number;
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
  };
}

export type TimestampedLabel = {
  timestamp: number;
  labels: Labels;
  end?: number;
};

export interface ImageLabelerProps extends BaseLabelerProps<Labels, string> {
  preload?: string[];
  metadata?: { [key: string]: string };
  maxViewHeight?: number;
}

export interface VideoLabelerProps
  extends BaseLabelerProps<TimestampedLabel[], string> {
  metadata?: { [key: string]: string };
  maxViewHeight?: number;
}

export interface BatchEntry {
  metadata?: { [key: string]: string };
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
