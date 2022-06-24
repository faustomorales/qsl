import { WidgetModel } from "@jupyter-widgets/base";
import { PageConfig } from "@jupyterlab/coreutils";
import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from "@jupyter-widgets/base";
import { Writable, writable, get } from "svelte/store";
import { WidgetState, defaultWidgetState } from "./types";
import { MODULE_NAME, MODULE_VERSION } from "./version";
import CommonWidget from "./CommonWidget.svelte";

const buildAttributeStore = <
  WidgetModelState extends { [key: string]: any },
  T extends keyof WidgetModelState & string
>(
  name: T,
  model: WidgetModel
): Writable<WidgetModelState[T]> => {
  const store: Writable<WidgetModelState[T]> = writable(model.get(name));
  let unsubscribe: () => void;
  const subscribe = () => {
    unsubscribe = store.subscribe((value) => {
      model.set(name, value);
      model.save_changes();
    });
  };
  subscribe();
  model.on("change:" + name, () => {
    const value = model.get(name);
    if (value != get(store)) {
      if (unsubscribe) unsubscribe();
      store.set(value);
      subscribe();
    }
  });
  return store;
};

const buildModelStateExtractor = <
  WidgetModelState extends { [key: string]: any }
>(
  model: WidgetModel
) => {
  return <T extends keyof WidgetModelState & string>(name: T) => {
    return buildAttributeStore<WidgetModelState, T>(name, model);
  };
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
      ...defaultWidgetState,
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
    const extract = buildModelStateExtractor<WidgetState>(this.model);
    const base = extract("base");
    const baseIntervalId = setInterval(() => {
      const serverRoot = PageConfig.getOption("serverRoot");
      const url = PageConfig.getBaseUrl();
      if (serverRoot && url) {
        base.set({
          serverRoot,
          url,
        });
        clearInterval(baseIntervalId);
      }
    }, 100);
    new CommonWidget({
      target: this.el,
      props: { extract },
    });
  }
}

export { MediaLabelerModel, MediaLabelerView };
