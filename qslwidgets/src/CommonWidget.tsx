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
  Labeler,
} from "react-image-labeler";

interface BaseWidgetState<T, U> {
  states: {
    metadata: { [key: string]: string };
    selected: boolean;
    visible: boolean;
    ignored: boolean;
    labeled: boolean;
    labels: Labels;
  }[];
  urls: string[];
  type: T;
  config: Config;
  transitioning: boolean;
  labels: U;
  action: "next" | "prev" | "delete" | "ignore" | "unignore" | "save" | "";
  preload: string[];
  maxCanvasSize: number;
  maxViewHeight: number;
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
  transitioning: false,
  config: { image: [], regions: [] } as Config,
  labels: { image: {}, polygons: [], masks: [], boxes: [] } as Labels,
  action: "",
  preload: [] as string[],
  maxCanvasSize: 512 as number,
  maxViewHeight: 512 as number,
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

const CommonWidget: React.FC<{
  extract: <V extends keyof WidgetState & string>(
    name: V
  ) => {
    value: WidgetState[V];
    set: (val: WidgetState[V], options?: any) => void;
  };
}> = ({ extract }) => {
  const config = extract("config");
  const states = extract("states");
  const transitioning = extract("transitioning");
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
          <Labeler>
            {states.value.length === 0 ? null : states.value.length == 1 ? (
              type.value === "image" ? (
                <ImageLabeler
                  {...common}
                  maxViewHeight={maxViewHeight.value}
                  labels={(labels.value || {}) as Labels}
                  target={urls.value[0]}
                  metadata={transitioning.value ? {} : states.value[0].metadata}
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
                  metadata={transitioning.value ? {} : states.value[0].metadata}
                />
              )
            ) : (
              <BatchImageLabeler
                {...common}
                labels={(labels.value || {}) as Labels}
                target={urls.value}
                states={transitioning.value ? [] : states.value}
                setStates={(newStates) => states.set(newStates)}
              />
            )}
          </Labeler>
        </Box>
      </ScopedCssBaseline>
    </ThemeProvider>
  );
};

export { CommonWidget, WidgetState, defaultWidgetState };
