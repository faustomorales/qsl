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
    const sync = () => set(model.get(name));
    const key = "change:" + name;
    model.on(key, sync);
    sync();
    return {
      set: (value) => {
        model.set(name, value);
        model.save_changes();
      },
      destroy: () => model.off(key, sync),
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
  protected destroyExtractors: () => void;

  render() {
    const { extract, destroy } = buildModelStateExtractor(this.model);
    this.destroyExtractors = destroy;
    extract("base").set(
      {
        serverRoot: PageConfig.getOption("serverRoot"),
        url: PageConfig.getBaseUrl(),
      },
      true
    );
    new Widget({
      target: this.el,
      props: { extract },
    });
  }

  remove(): void {
    super.remove();
    this.destroyExtractors();
  }
}

export { MediaLabelerModel, MediaLabelerView };
