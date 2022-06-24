import React from "react";
import { Config, DraftState, Point } from "./library/types";
import SvelteRegionList from "./RegionList.svelte";
import toReact from "./library/adapter";

const TransformedRegionList = toReact(SvelteRegionList);
type Callback = (
  event: React.MouseEvent<Element, MouseEvent>,
  ...args: any[]
) => void;

interface RegionListProps {
  config: Config;
  draft: DraftState;
  cursor?: Point;
  callbacks: {
    onClick: Callback;
    onMouseMove: Callback;
  };
}

const useSvelteCallback = (inner: Callback) =>
  React.useCallback(
    (raw: any) =>
      inner({ nativeEvent: raw.detail.event } as any, raw.detail.index),
    [inner]
  );

const RegionList: React.FC<RegionListProps> = ({
  draft,
  callbacks,
  cursor,
}) => {
  const onMouseMove = useSvelteCallback(callbacks.onMouseMove);
  const onClick = useSvelteCallback(callbacks.onClick);
  return (
    <TransformedRegionList
      draft={draft}
      cursor={cursor}
      onMouseMove={onMouseMove}
      onClick={onClick}
    />
  );
};

export default RegionList;
