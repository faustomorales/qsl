import type { AnyModel } from "@anywidget/types";
import { buildAttributeStoreFactory } from "./widget";
import Widget from "./components/Widget.svelte"


const buildModelStateExtractor = (model: AnyModel) => {
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

function render({ model, el }: { model: AnyModel, el: HTMLElement }) {
    const { extract, destroy } = buildModelStateExtractor(model);
    extract("base").set(
        {
            url: (model.widget_manager as any).kernel.serverSettings.baseUrl,
            serverRoot: JSON.parse(document.getElementById('jupyter-config-data')!.textContent).serverRoot
        },
        true
    );
    new Widget({ target: el, props: { extract } })
    return destroy
}

export default { render }