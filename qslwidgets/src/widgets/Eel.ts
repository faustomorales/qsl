declare global {
  interface Window {
    eel: any;
  }
}
import Widget, {
  defaultWidgetState,
  buildAttributeStoreFactory,
} from "./common";

window.eel.set_host("ws://localhost:8080");

type WidgetState = typeof defaultWidgetState;
interface SyncEvent {
  value: any;
}

const buildModelStateExtractor = () => {
  return buildAttributeStoreFactory((name, set) => {
    let initialized = false;
    let enabled = true;
    const syncKey = `sync:${name}`;
    const sync = (event: CustomEvent<SyncEvent>) => {
      initialized = true;
      set(event.detail.value);
    };
    window.eel.init(name)((value: any) => {
      if (!initialized) {
        set(value);
        initialized = true;
      }
    });
    document.addEventListener(syncKey, sync as EventListener, false);
    return {
      default: (defaultWidgetState as any)[name],
      set: (value) => {
        if (initialized && enabled) {
          window.eel.sync(name, value)();
        }
      },
      destroy: () =>
        document.removeEventListener(syncKey, sync as EventListener, false),
      enable: () => (enabled = true),
      disable: () => (enabled = false),
    };
  });
};

const pysync = <T extends keyof WidgetState>(key: T, value: WidgetState[T]) => {
  document.dispatchEvent(
    new CustomEvent<SyncEvent>(`sync:${key}`, {
      detail: { value },
    })
  );
};
window.eel.expose(pysync, "sync");

new Widget({
  target: document.getElementById("root") as Element,
  props: { extract: buildModelStateExtractor() },
});
