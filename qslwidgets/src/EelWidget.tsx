import React from "react";
import ReactDOM from "react-dom";

declare global {
  interface Window {
    eel: any;
  }
}
import { WidgetState, CommonWidget, defaultWidgetState } from "./CommonWidget";

window.eel.set_host("ws://localhost:8080");

interface SynchronizedVariable<T extends keyof WidgetState & string> {
  value: WidgetState[T];
  set: (value: WidgetState[T]) => void;
}

interface SyncEvent<T extends keyof WidgetState> {
  key: T;
  value: WidgetState[T];
}

const useModelState = <T extends keyof WidgetState>(
  key: T
): SynchronizedVariable<T> => {
  const [value, setValue] = React.useState(defaultWidgetState[key]);
  // Initialize to the state in Python.
  React.useEffect(() => window.eel.init(key)(setValue), [key]);

  // Create a setter that will synchronize Python to the desired
  // value.
  const set = React.useCallback(
    (updated: WidgetState[T]) =>
      window.eel.sync(key, updated)(() => setValue(updated)),
    [key]
  );
  const sync = React.useCallback(
    (event: CustomEvent<SyncEvent<T>>) =>
      event.detail.key === key ? setValue(event.detail.value) : undefined,
    [key]
  );
  React.useEffect(() => {
    document.addEventListener("sync", sync as EventListener, false);
    return () => {
      document.removeEventListener("sync", sync as EventListener, false);
    };
  }, [sync]);
  return {
    value,
    set,
  };
};

const App: React.FC = () => {
  const pysync = React.useCallback(
    <T extends keyof WidgetState>(key: T, value: WidgetState[T]) => {
      document.dispatchEvent(
        new CustomEvent<SyncEvent<T>>("sync", {
          detail: { key, value },
        })
      );
    },
    []
  );
  window.eel.expose(pysync, "sync");
  return <CommonWidget extract={useModelState} />;
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
