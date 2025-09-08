import Widget, {
    defaultWidgetState,
    buildAttributeStoreFactory,
} from "./widget";

type WidgetState = typeof defaultWidgetState;

const buildModelStateExtractor = (state: WidgetState) => {
    return buildAttributeStoreFactory((name: keyof WidgetState, set) => {
        console.log(`Initializing ${name} to ${state[name]}`)
        set(state[name])
        return {
            set: (value) => console.log(`Changing ${name} to ${value}.`),
            destroy: () => null
        };
    });
};

const createLabelerInterface = (target: HTMLElement) => {
    return new Widget({
        target: target,
        props: { extract: buildModelStateExtractor(defaultWidgetState).extract },
    })
}

export { createLabelerInterface } 