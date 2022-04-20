import React from "react";
import { WidgetModel } from "@jupyter-widgets/base";

/**
 *
 * @param name property name in the Python model object.
 * @returns model state and set state function.
 */
const useModelState = <
  WidgetModelState extends { [key: string]: any },
  T extends keyof WidgetModelState & string
>(
  name: T,
  model: WidgetModel
): {
  value: WidgetModelState[T];
  set: (val: WidgetModelState[T], options?: any) => void;
} => {
  const [value, setState] = React.useState<WidgetModelState[T]>(
    model?.get(name)
  );
  useModelEvent(
    model,
    `change:${name}`,
    (model) => {
      setState(model.get(name));
    },
    [name]
  );

  function set(val: WidgetModelState[T], options?: any) {
    model?.set(name, val, options);
    model?.save_changes();
  }

  return { value, set };
};

export const useModelStateExtractor = <
  WidgetModelState extends { [key: string]: any }
>(
  model: WidgetModel
) => {
  return <T extends keyof WidgetModelState & string>(name: T) => {
    return useModelState<WidgetModelState, T>(name, model);
  };
};

/**
 * Subscribes a listener to the model event loop.
 * @param event String identifier of the event that will trigger the callback.
 * @param callback Action to perform when event happens.
 * @param deps Dependencies that should be kept up to date within the callback.
 */
const useModelEvent = (
  model: WidgetModel,
  event: string,
  callback: {
    (model: WidgetModel, event: Backbone.EventHandler): void;
  },
  deps?: React.DependencyList | undefined
) => {
  React.useEffect(() => {
    const callbackWrapper = (e: Backbone.EventHandler) =>
      model && callback(model, e);
    model?.on(event, callbackWrapper);
    return () => void model?.unbind(event, callbackWrapper);
  }, (deps || []).concat([model]));
};

export { useModelState, useModelEvent };
