import type { Writable } from "svelte/store";
import type { Config, Labels, WidgetState } from "../library/types";
import { writable, get } from "svelte/store";
import Widget from "../components/Widget.svelte";

const buildAttributeStoreFactory = <
  WidgetModelState extends { [key: string]: any },
  T extends keyof WidgetModelState & string
>(
  initializer: (
    name: T,
    set: (value: WidgetModelState[T]) => void
  ) => {
    default: WidgetModelState[T];
    set: (value: WidgetModelState[T]) => void;
    destroy: () => void;
    enable: () => void;
    disable: () => void;
  }
): ((name: T) => Writable<WidgetModelState[T]>) => {
  const stores: { [key: string]: Writable<WidgetModelState[T]> } = {};
  const inner = (name: T) => {
    let store: Writable<WidgetModelState[T]>;
    let unsubscribe: () => void;
    let subscribe: () => void;
    let external = initializer(name, (value) => {
      if (value != get(store)) {
        if (unsubscribe) unsubscribe();
        if (store) store.set(value);
        if (subscribe) subscribe();
      }
    });
    store = writable(external.default);
    subscribe = () => {
      external.disable();
      unsubscribe = store.subscribe(external.set);
      external.enable();
    };
    subscribe();
    return store;
  };
  return (name) => {
    if (!stores[name]) {
      stores[name] = inner(name);
    }
    return stores[name];
  };
};

const defaultWidgetState: WidgetState = {
  states: [],
  urls: [],
  type: "image",
  message: "",
  config: { image: [], regions: [] } as Config,
  labels: { image: {}, polygons: [], masks: [], boxes: [] } as Labels,
  action: "",
  preload: [] as string[],
  maxCanvasSize: 512 as number,
  maxViewHeight: 512 as number,
  idx: 0,
  viewState: "labeling",
  indexState: {
    rows: [],
    columns: [],
    rowsPerPage: 5,
    rowCount: 0,
    sortModel: [],
    page: 1,
  },
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

export default Widget;
export { buildAttributeStoreFactory, defaultWidgetState };
