/* This code taken from https://github.com/pngwn/svelte-adapter
and modified to support mutable callbacks. */

import React, { useRef, useEffect, useState, FC } from "react";
import { SvelteComponent, SvelteComponentTyped } from "svelte";

const eventRe = /on([A-Z]{1,}[a-zA-Z]*)/;

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
type EventMap = {
  [key: string]: { callback: (...args: any) => void; name: string };
};
type ExtractProps<Ctor> = Ctor extends new (arg: any) => SvelteComponentTyped<
  infer Props
>
  ? Props
  : Record<string, any>;

export default function toReact<
  CompCtor extends new (arg: any) => SvelteComponent
>(Component: CompCtor): FC<ExtractProps<CompCtor>> {
  return (props) => {
    const container = useRef(null);
    const component: Writeable<React.RefObject<SvelteComponent>> =
      useRef<SvelteComponent>(null);
    const [mounted, setMount] = useState(false);

    const eventMap: EventMap = React.useMemo(() => {
      let eventMap: EventMap = {};
      for (const key in props) {
        const eventMatch = key.match(eventRe);
        if (eventMatch && typeof props[key] === "function") {
          eventMap[
            `${eventMatch[1][0].toLowerCase()}${eventMatch[1].slice(1)}`
          ] = { callback: props[key], name: key };
        }
      }
      return eventMap;
    }, [props]);
    useEffect(() => {
      if (!component.current) {
        return;
      }
      const destructors: (() => void)[] = [];
      for (const key in eventMap) {
        destructors.push(component.current.$on(key, eventMap[key].callback));
      }
      return () => {
        destructors.forEach((d) => d());
      };
    }, [eventMap]);

    useEffect(() => {
      component.current = new Component({
        target: container.current,
        props,
      }) as any;
      return () => {
        component.current!.$destroy();
      };
    }, []);

    useEffect(() => {
      if (!mounted) {
        setMount(true);
        return;
      }
      component.current!.$set(props);
    }, [props]);

    return React.createElement("div", { ref: container, style: {} });
  };
}
