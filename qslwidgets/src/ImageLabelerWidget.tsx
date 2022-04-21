import React from "react";
import ReactDOM from "react-dom";
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
import { uniqueId } from "lodash";
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
  const id = React.useMemo(() => uniqueId("qslwidgetid"), []);

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
      onSave: buttons.value["save"]
        ? (newLabels: any) => {
            labels.set(newLabels);
            updated.set(Date.now());
          }
        : undefined,
      onSaveConfig: buttons.value["config"] ? config.set : undefined,
      onNext: buttons.value["next"] ? () => action.set("next") : undefined,
      onPrev: buttons.value["prev"] ? () => action.set("prev") : undefined,
      onDelete: buttons.value["delete"]
        ? () => action.set("delete")
        : undefined,
      onIgnore: buttons.value["ignore"]
        ? () => action.set("ignore")
        : undefined,
      onUnignore: buttons.value["unignore"]
        ? () => action.set("unignore")
        : undefined,
    },
  };
  return (
    <Labeler
      style={{
        padding: 16,
        backgroundColor: mode.value == "dark" ? "rgb(18, 18, 18)" : "white",
      }}
      mode={mode.value}
      id={id}
    >
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
  );
};

class ImageLabelerModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: ImageLabelerModel.model_name,
      _model_module: ImageLabelerModel.model_module,
      _model_module_version: ImageLabelerModel.model_module_version,
      _view_name: ImageLabelerModel.view_name,
      _view_module: ImageLabelerModel.view_module,
      _view_module_version: ImageLabelerModel.view_module_version,
      ...DEFAULT_PROPERTIES,
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = "ImageLabelerModel";
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = "ImageLabelerView"; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

class ImageLabelerView extends DOMWidgetView {
  render() {
    this.el.classList.add("qsl-image-labeler-widget");
    const component = React.createElement(Widget, {
      model: this.model,
    });
    ReactDOM.render(component, this.el);
  }
}

export { ImageLabelerModel, ImageLabelerView };
