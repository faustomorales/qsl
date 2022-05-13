import React from "react";
import {
  Box,
  ThemeProvider,
  ScopedCssBaseline,
  createTheme,
} from "@mui/material";
import {
  ImageLabeler,
  VideoLabeler,
  Labels,
  Config,
  BatchImageLabeler,
  TimestampedLabel,
  MediaIndex,
  Labeler,
} from "./react-image-labeler";
import GlobalLabelerContext from "./react-image-labeler/components/GlobalLabelerContext";

interface BaseWidgetState<T, U> {
  states: {
    metadata?: { [key: string]: string };
    selected: boolean;
    visible: boolean;
    ignored: boolean;
    labeled: boolean;
    labels: Labels;
  }[];
  urls: string[];
  message: string;
  type: T;
  config: Config;
  labels: U;
  action:
    | "next"
    | "prev"
    | "delete"
    | "ignore"
    | "unignore"
    | "save"
    | "label"
    | "index"
    | "";
  preload: string[];
  maxCanvasSize: number;
  maxViewHeight: number;
  idx: number;
  viewState: "transitioning" | "labeling" | "index";
  mediaIndex: {
    rows: { [key: string]: string | number; id: number }[];
    columns: { field: string; headerName: string; type: "number" | "string" }[];
  };
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

type ImageWidgetState = BaseWidgetState<"image", Labels>;
type VideoWidgetState = BaseWidgetState<"video", TimestampedLabel[]>;
type WidgetState = VideoWidgetState | ImageWidgetState;

const defaultWidgetState: WidgetState = {
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
  mediaIndex: { rows: [], columns: [] },
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

interface CommonWidgetProps {
  extract: <V extends keyof WidgetState & string>(
    name: V
  ) => {
    value: WidgetState[V];
    set: (val: WidgetState[V], options?: any) => void;
  };
}

const InnerCommonWidget: React.FC<CommonWidgetProps> = ({ extract }) => {
  const { setToast } = React.useContext(GlobalLabelerContext);
  const config = extract("config");
  const states = extract("states");
  const urls = extract("urls");
  const type = extract("type");
  const labels = extract("labels");
  const action = extract("action");
  const progress = extract("progress");
  const mode = extract("mode");
  const buttons = extract("buttons");
  const preload = extract("preload");
  const maxCanvasSize = extract("maxCanvasSize");
  const maxViewHeight = extract("maxViewHeight");
  const viewState = extract("viewState");
  const mediaIndex = extract("mediaIndex");
  const idx = extract("idx");
  const message = extract("message");
  React.useEffect(() => {
    if (message.value !== "") {
      setToast(message.value);
      message.set("");
    }
  }, [message.value, setToast]);
  const common = {
    config: {
      image: config.value?.image || [],
      regions: config.value?.regions || [],
    },
    preload: preload.value,
    options: {
      progress: progress.value,
      maxCanvasSize: maxCanvasSize.value,
      showNavigation: true,
    },
    callbacks: {
      onSave: buttons.value.save
        ? (updated: any) => {
            labels.set(updated);
            action.set("save");
          }
        : undefined,
      onSaveConfig: buttons.value.config ? config.set : undefined,
      onNext: buttons.value.next ? () => action.set("next") : undefined,
      onPrev: buttons.value.prev ? () => action.set("prev") : undefined,
      onDelete: buttons.value.delete ? () => action.set("delete") : undefined,
      onIgnore: buttons.value.ignore ? () => action.set("ignore") : undefined,
      onUnignore: buttons.value.unignore
        ? () => action.set("unignore")
        : undefined,
      onShowIndex: () => action.set("index"),
    },
  };
  return (
    <ThemeProvider
      theme={createTheme({
        palette: {
          mode: mode.value || "light",
        },
      })}
    >
      <ScopedCssBaseline>
        <Box style={{ padding: 16 }}>
          <Box hidden={viewState.value !== "index"}>
            <MediaIndex
              grid={mediaIndex.value}
              idx={idx.value}
              label={(newIdx) => {
                idx.set(newIdx);
                action.set("label");
              }}
            />
          </Box>
          {states.value.length === 0 ||
          viewState.value === "index" ? null : states.value.length == 1 ? (
            type.value === "image" ? (
              <ImageLabeler
                {...common}
                maxViewHeight={maxViewHeight.value}
                labels={(labels.value || {}) as Labels}
                target={
                  viewState.value === "transitioning" ? undefined : urls.value[0]
                }
                metadata={
                  viewState.value === "transitioning"
                    ? {}
                    : states.value[0].metadata
                }
              />
            ) : (
              <VideoLabeler
                {...common}
                maxViewHeight={maxViewHeight.value}
                labels={
                  (Array.isArray(labels.value)
                    ? labels.value
                    : []) as TimestampedLabel[]
                }
                target={urls.value[0]}
                metadata={
                  viewState.value === "transitioning"
                    ? {}
                    : states.value[0].metadata
                }
              />
            )
          ) : (
            <BatchImageLabeler
              {...common}
              labels={(labels.value || {}) as Labels}
              target={urls.value}
              states={viewState.value === "transitioning" ? [] : states.value}
              setStates={(newStates) => states.set(newStates)}
            />
          )}
        </Box>
      </ScopedCssBaseline>
    </ThemeProvider>
  );
};

const CommonWidget: React.FC<CommonWidgetProps> = (props) => (
  <Labeler>
    <InnerCommonWidget {...props} />
  </Labeler>
);

export { CommonWidget, WidgetState, defaultWidgetState };
