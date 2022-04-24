import React from "react";
import ReactDOM from "react-dom";
import { WidgetModel } from "@jupyter-widgets/base";
import { PageConfig } from "@jupyterlab/coreutils";
import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from "@jupyter-widgets/base";
import { useModelStateExtractor } from "./hooks";
import { CommonWidget, WidgetState, defaultWidgetState } from "./CommonWidget";
import { MODULE_NAME, MODULE_VERSION } from "./version";

const Widget: React.FC<{
  model: WidgetModel;
}> = ({ model }) => {
  const extract = useModelStateExtractor<WidgetState>(model);
  const base = extract("base");
  React.useEffect(() => {
    base.set({
      serverRoot: PageConfig.getOption("serverRoot"),
      url: PageConfig.getBaseUrl(),
    });
  });
  return <CommonWidget extract={extract} />;
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
    this.el.classList.add("qsl-image-labeler-widget");
    const component = React.createElement(Widget, {
      model: this.model,
    });
    ReactDOM.render(component, this.el);
  }
}

export { MediaLabelerModel, MediaLabelerView };
