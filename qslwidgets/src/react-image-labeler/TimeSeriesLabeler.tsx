import React from "react";
import MediaViewer from "./components/MediaViewer";
import TimeSeries from "./components/TimeSeries";
import ControlMenu from "./components/ControlMenu";
import LabelerLayout from "./components/LabelerLayout";
import { draft2labels } from "./components/library/utils";
import { useDraftLabelState } from "./components/library/hooks";
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
  const { draft, setDraft, resetDraft } = useDraftLabelState(labels, [target]);
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
          config={{ image: config.image || [] }}
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
          media={{
            main: target ? (
              <TimeSeries
                target={target}
                labels={draft.labels}
                toggle={toggle}
              />
            ) : undefined,
            mini: target ? (
              <TimeSeries target={target} labels={draft.labels} />
            ) : undefined,
          }}
          size={size}
          loading={false}
          maxViewHeight={options?.maxViewHeight}
        />
      }
    />
  );
};

export default TimeSeriesLabeler;
