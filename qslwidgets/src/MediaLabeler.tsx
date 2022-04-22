import React from "react";
import ReactDOM from "react-dom";
import {
  Box,
  ThemeProvider,
  ScopedCssBaseline,
  createTheme,
} from "@mui/material";
import { WidgetModel } from "@jupyter-widgets/base";
import { PageConfig } from "@jupyterlab/coreutils";
import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from "@jupyter-widgets/base";
import {
  ImageLabeler,
  VideoLabeler,
  Labels,
  Config,
  BatchImageLabeler,
  TimestampedLabel,
  Labeler,
} from "react-image-labeler";
import { useModelStateExtractor } from "./hooks";
import { MODULE_NAME, MODULE_VERSION } from "./version";

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
  updated: number;
  action: "next" | "prev" | "delete" | "ignore" | "unignore" | "";
  preload: string[];
  showNavigation: boolean;
  maxCanvasSize: number;
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

const DEFAULT_PROPERTIES: WidgetState = {
  states: [],
  urls: [],
  type: "image",
  transitioning: false,
  config: { image: [], regions: [] } as Config,
  labels: { image: {}, polygons: [], masks: [], boxes: [] } as Labels,
  updated: Date.now(),
  action: "" as "next" | "prev" | "delete" | "ignore" | "unignore" | "",
  preload: [] as string[],
  showNavigation: true,
  maxCanvasSize: 512 as number,
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

const Widget: React.FC<{
  model: WidgetModel;
}> = ({ model }) => {
  const extract = useModelStateExtractor<WidgetState>(model);
  const config = extract("config");
  const states = extract("states");
  const transitioning = extract("transitioning");
  const urls = extract("urls");
  const type = extract("type");
  const labels = extract("labels");
  const updated = extract("updated");
  const action = extract("action");
  const base = extract("base");
  const progress = extract("progress");
  const mode = extract("mode");
  const buttons = extract("buttons");
  const preload = extract("preload");
  const maxCanvasSize = extract("maxCanvasSize");
  const showNavigation = extract("showNavigation");

  React.useEffect(() => {
    base.set({
      serverRoot: PageConfig.getOption("serverRoot"),
      url: PageConfig.getBaseUrl(),
    });
  });
  const common = {
    config: {
      image: config.value?.image || [],
      regions: config.value?.regions || [],
    },
    preload: preload.value,
    options: {
      progress: progress.value,
      maxCanvasSize: maxCanvasSize.value,
      showNavigation: showNavigation.value,
    },
    callbacks: {
      onSave: buttons.value.save
        ? (newLabels: any) => {
            labels.set(newLabels);
            updated.set(Date.now());
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
        <Box style={{ padding: 16}}>
          <Labeler>
            {states.value.length === 0 ? null : states.value.length == 1 ? (
              type.value === "image" ? (
                <ImageLabeler
                  {...common}
                  labels={(labels.value || {}) as Labels}
                  target={urls.value[0]}
                  metadata={transitioning.value ? {} : states.value[0].metadata}
                />
              ) : (
                <VideoLabeler
                  {...common}
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

class MediaLabelerModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: MediaLabelerModel.model_name,
      _model_module: MediaLabelerModel.model_module,
      _model_module_version: MediaLabelerModel.model_module_version,
      _view_name: MediaLabelerModel.view_name,
      _view_module: MediaLabelerModel.view_module,
      _view_module_version: MediaLabelerModel.view_module_version,
      ...DEFAULT_PROPERTIES,
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = "MediaLabelerModel";
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = "MediaLabelerView"; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

class MediaLabelerView extends DOMWidgetView {
  render() {
    this.el.classList.add("qsl-image-labeler-widget");
    const component = React.createElement(Widget, {
      model: this.model,
    });
    ReactDOM.render(component, this.el);
  }
}

export { MediaLabelerModel, MediaLabelerView };
