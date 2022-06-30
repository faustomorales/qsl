import type { WidgetModel, ISerializers } from "@jupyter-widgets/base";
import { PageConfig } from "@jupyterlab/coreutils";
import { DOMWidgetModel, DOMWidgetView } from "@jupyter-widgets/base";
import { MODULE_NAME, MODULE_VERSION } from "../version";
import Widget, {
  defaultWidgetState,
  buildAttributeStoreFactory,
} from "./common";

const buildModelStateExtractor = (model: WidgetModel) => {
  return buildAttributeStoreFactory((name, set) => {
    const callback = () => set(model.get(name));
    const key = "change:" + name;
    model.on(key, callback);
    let enabled = true;
    return {
      set: (value) => {
        if (enabled) {
          model.set(name, value);
          model.save_changes();
        }
      },
      default: model.get(name),
      destroy: () => model.off(key, callback),
      enable: () => (enabled = true),
      disable: () => (enabled = false),
    };
  });
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
    const extract = buildModelStateExtractor(this.model);
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
    new Widget({
      target: this.el,
      props: { extract },
    });
  }
}

export { MediaLabelerModel, MediaLabelerView };
