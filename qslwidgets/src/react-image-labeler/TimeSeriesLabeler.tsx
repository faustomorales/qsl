import React from "react";
import MediaViewer from "./components/MediaViewer";
import TimeSeries from "./components/TimeSeries";
import ControlMenu from "./components/ControlMenu";
import LabelerLayout from "./components/LabelerLayout";
import { Box } from "@mui/material";
import { draft2labels } from "./components/library/utils";
import { useDraftLabelState, useMediaEvent } from "./components/library/hooks";
import { processSelectionChange } from "./components/library/handlers";
import { TimeSeriesLabelerProps } from "./components/library/types";

const TimeSeriesLabeler: React.FC<TimeSeriesLabelerProps> = ({
  target,
  labels,
  config = { image: [] },
  options,
  callbacks,
  metadata,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { draft, setDraft, resetDraft, cursor, setCursor } = useDraftLabelState(
    labels,
    [target]
  );
  const onMouseMove = useMediaEvent(
    (coords) => {
      setCursor({ ...cursor, coords });
    },
    ref,
    [cursor]
  );
  const onMouseLeave = React.useCallback(
    () => setCursor({ ...cursor, coords: undefined }),
    [cursor]
  );
  const save = React.useCallback(
    () =>
      callbacks?.onSave
        ? callbacks.onSave({
            ...draft2labels(draft.labels),
          })
        : undefined,
    [draft, callbacks?.onSave]
  );
  const toggle = React.useCallback(
    (label, value) =>
      setDraft({
        ...draft,
        labels: {
          ...draft.labels,
          image: {
            ...draft.labels.image,
            [label]: processSelectionChange(
              value,
              draft.labels.image[label] || [],
              config.image
                ? config.image.filter((c) => c.name === label)[0]?.multiple
                : false
            ),
          },
        },
      }),
    [draft.labels, config, setDraft]
  );
  const size = React.useMemo(
    () =>
      target
        ? target.plots.reduce(
            (memo, current) => {
              return {
                width: memo.width + (current.size?.width || 512),
                height: memo.height + (current.size?.height || 256),
              };
            },
            { width: 0, height: 0 }
          )
        : undefined,
    [target]
  );
  return (
    <LabelerLayout
      metadata={metadata}
      progress={options?.progress}
      layout={"vertical"}
      control={
        <ControlMenu
          cursor={cursor}
          config={{ image: config.image || [] }}
          setCursor={setCursor}
          allowRegion={false}
          disabled={false}
          direction={"row"}
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
        <MediaViewer
          cursor={cursor.coords}
          onMouseLeave={onMouseLeave}
          media={{
            main: target ? (
              <Box ref={ref} onMouseMove={onMouseMove}>
                <TimeSeries
                  target={target}
                  labels={draft.labels}
                  toggle={toggle}
                />
              </Box>
            ) : undefined,
            mini: target ? (
              <TimeSeries target={target} labels={draft.labels} />
            ) : undefined,
          }}
          size={size}
          loadState={"loaded"}
          maxViewHeight={options?.maxViewHeight}
        />
      }
    />
  );
};

export default TimeSeriesLabeler;
