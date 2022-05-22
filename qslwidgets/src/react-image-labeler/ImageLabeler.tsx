import React from "react";
import { Box } from "@mui/material";

import MediaViewer from "./components/MediaViewer";
import ControlMenu from "./components/ControlMenu";
import ImagePreloader from "./components/ImagePreloader";
import RegionList from "./components/RegionList";
import LabelerLayout from "./components/LabelerLayout";
import {
  useLoader,
  useDraftLabelState,
  useMediaMouseCallbacks,
} from "./components/library/hooks";
import { draft2labels } from "./components/library/utils";
import { Dimensions, ImageLabelerProps } from "./components/library/types";

const ImageLabeler: React.FC<ImageLabelerProps> = ({
  target,
  labels = { image: {} },
  options,
  callbacks,
  metadata,
  preload,
  config = { image: [], regions: [] },
}) => {
  const { draft, setDraft, resetDraft } = useDraftLabelState(labels, [target]);
  const refs = {
    viewer: React.useRef<HTMLDivElement>(null),
    source: React.useRef<HTMLImageElement>(null),
    canvas: React.useRef<HTMLCanvasElement>(null),
  };
  const {
    loader,
    disableControls,
    disableContents,
    visibleSource,
    mediaState,
  } = useLoader<{ size: Dimensions; layout: "horizontal" | "vertical" }>(
    React.useCallback(
      (event: React.SyntheticEvent<HTMLImageElement, Event>) =>
        new Promise((resolve, reject) => {
          if (!refs.source.current) {
            reject("Did not find source ref.");
          } else {
            const size = {
              width: refs.source.current.naturalWidth,
              height: refs.source.current.naturalHeight,
            };
            resolve({
              size,
              layout: size.height > size.width ? "horizontal" : "vertical",
            });
          }
        }),
      [refs.source, target]
    ),
    target
  );

  const save = React.useCallback(
    () =>
      callbacks?.onSave
        ? callbacks.onSave({
            ...draft2labels(draft.labels),
            dimensions: mediaState?.size,
          })
        : undefined,
    [draft, mediaState, callbacks?.onSave]
  );
  const imageCallbacks = useMediaMouseCallbacks(
    draft,
    setDraft,
    refs,
    config.regions && config.regions.length > 0 ? true : false,
    options?.maxCanvasSize
  );
  return (
    <LabelerLayout
      metadata={metadata}
      progress={options?.progress}
      layout={mediaState?.layout || "horizontal"}
      control={
        <ControlMenu
          config={config}
          disabled={disableControls}
          direction={
            (mediaState?.layout || "horizontal") === "horizontal"
              ? "column"
              : "row"
          }
          draft={draft}
          showNavigation={options?.showNavigation}
          setDraft={setDraft}
          callbacks={{
            ...callbacks,
            onSave: callbacks?.onSave ? save : undefined,
            onReset: resetDraft,
          }}
        />
      }
      content={
        target ? (
          <Box>
            <Box>
              <MediaViewer
                size={mediaState?.size}
                maxViewHeight={options?.maxViewHeight}
                media={{
                  main: (
                    <img
                      {...imageCallbacks}
                      ref={refs.source}
                      onLoad={loader}
                      src={visibleSource}
                      style={{
                        cursor:
                          config.regions && config.regions.length > 0
                            ? "none"
                            : undefined,
                      }}
                    />
                  ),
                  mini: <img src={visibleSource} />,
                }}
                loading={disableContents}
                onMouseLeave={() =>
                  setDraft({
                    ...draft,
                    cursor: { ...draft.cursor, coords: undefined },
                  })
                }
              >
                <RegionList
                  config={config}
                  draft={draft}
                  callbacks={imageCallbacks}
                />
              </MediaViewer>
            </Box>
            <canvas style={{ display: "none" }} ref={refs.canvas} />
            {!disableContents && preload ? (
              <ImagePreloader images={preload} />
            ) : null}
          </Box>
        ) : null
      }
    />
  );
};

export default ImageLabeler;
