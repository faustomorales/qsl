import type { Writable } from "svelte/store";
import type { Config, Labels, WidgetState } from "../library/types";
import { writable, get } from "svelte/store";
import Widget from "../components/Widget.svelte";

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
    filterModel: [],
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

const buildAttributeStoreFactory = <
  WidgetModelState extends { [key: string]: any },
  T extends keyof WidgetModelState & string
>(
  initializer: (
    name: T,
    set: (value: WidgetModelState[T] | null) => void
  ) => {
    set: (value: WidgetModelState[T] | null) => void;
    destroy: () => void;
  }
): {
  extract: (name: T) => Writable<WidgetModelState[T] | null> & {
    set: (value: WidgetModelState[T] | null, force: boolean) => void;
  };
  destroy: () => void;
} => {
  const stores: { [key: string]: Writable<WidgetModelState[T] | null> } = {};
  const destructors: { [key: string]: () => void } = {};
  let pystamp: number | null = null;
  const inner = (name: T) => {
    let store: Writable<WidgetModelState[T] | null> = writable(null);
    let external = initializer(name, (value) => {
      if (value != get(store)) {
        pystamp = Date.now();
        store.set(value);
      }
    });
    const set = (value: WidgetModelState[T] | null, force?: boolean) => {
      if (force || (pystamp && Date.now() - pystamp > 500)) {
        store.set(value);
        external.set(value);
      }
    };
    destructors[name] = external.destroy;
    return {
      set,
      update: (
        updater: (value: WidgetModelState[T] | null) => WidgetModelState[T]
      ) => set(updater(get(store))),
      subscribe: store.subscribe,
    };
  };
  return {
    extract: (name) => {
      if (!stores[name]) {
        stores[name] = inner(name);
      }
      return stores[name];
    },
    destroy: () => {
      Object.values(destructors).map((d) => d());
    },
  };
};

export default Widget;
export { buildAttributeStoreFactory, defaultWidgetState };
