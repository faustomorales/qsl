import React from 'react';
import { WidgetModel } from '@jupyter-widgets/base';

/**
 *
 * @param name property name in the Python model object.
 * @returns model state and set state function.
 */
const useModelState = <
  WidgetModelState extends { [key: string]: any },
  T extends keyof WidgetModelState
>(
  name: string & T,
  model: WidgetModel
): [WidgetModelState[T], (val: WidgetModelState[T], options?: any) => void] => {
  const [state, setState] = React.useState<WidgetModelState[T]>(
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

  function updateModel(val: WidgetModelState[T], options?: any) {
    model?.set(name, val, options);
    model?.save_changes();
  }

  return [state, updateModel];
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
