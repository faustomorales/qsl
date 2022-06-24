import React from "react";
import FileSaver from "file-saver";
import MediaViewer from "./components/MediaViewer";
import ControlMenu from "./components/ControlMenu";
import LabelerLayout from "./components/LabelerLayout";
import { Box, styled } from "@mui/material";
import { draft2labels } from "./components/library/utils";
import { useDraftLabelState } from "./components/library/hooks";
import { processSelectionChange } from "./components/library/handlers";
import { TimeSeriesLabelerProps } from "./components/library/types";
import TimeSeriesSvelte from "./components/TimeSeries.svelte";
import html2canvas from "html2canvas";
import Metadata from "./components/Metadata";
import GlobalLabelerContext from "./components/GlobalLabelerContext";
import toReact from "./components/library/adapter";

const TimeSeries = toReact(TimeSeriesSvelte);

const DownloadContainer = styled(Box)`
  & .metadata table {
    border: 1px solid;
  }
  & .metadata {
    margin-top: 5px;
    box-shadow: none;
    border-radius: 0;
  }
`;

const TimeSeriesLabeler: React.FC<TimeSeriesLabelerProps> = ({
  target,
  labels,
  config = { image: [] },
  options,
  callbacks,
  metadata,
}) => {
  const refs = {
    container: React.useRef<HTMLDivElement>(null),
    downloadable: React.useRef<HTMLDivElement>(null),
  };
  const { setToast } = React.useContext(GlobalLabelerContext);
  const { draft, setDraft, resetDraft, undo } = useDraftLabelState(
    labels,
    [target],
    [target]
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
        dirty: true,
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
  const onDownload = React.useCallback(async () => {
    await html2canvas(refs.downloadable.current as HTMLElement, {
      logging: false,
    }).then((canvas) => {
      if (!target?.filename) {
        return;
      }
      const png = canvas.toDataURL("image/png", 1.0);
      if (png) {
        FileSaver.saveAs(
          png,
          target.filename.toLowerCase().endsWith(".png")
            ? target.filename
            : target.filename + ".png"
        );
      } else {
        setToast("Failed to render figure.");
      }
    });
  }, [target, labels, refs.downloadable, setToast]);
  return (
    <Box>
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
              onDownload: target?.filename ? onDownload : undefined,
              onUndo: undo,
            }}
          />
        }
        content={
          <MediaViewer
            media={{
              main: target ? (
                <Box ref={refs.container}>
                  <TimeSeries
                    labels={draft.labels}
                    target={target}
                    onToggle={(event: any) =>
                      toggle(event.detail.label, event.detail.value)
                    }
                  />
                </Box>
              ) : undefined,
              mini: target ? (
                <TimeSeries
                  labels={draft.labels}
                  target={target}
                  onToggle={(event: any) =>
                    toggle(event.detail.label, event.detail.value)
                  }
                />
              ) : undefined,
            }}
            size={size}
            loadState={"loaded"}
          />
        }
      />
      {target && size ? (
        <Box style={{ overflow: "scroll", height: 0 }}>
          <DownloadContainer
            ref={refs.downloadable}
            style={{ display: "inline-block", padding: 20 }}
          >
            <TimeSeries
              labels={draft.labels}
              target={target}
              onToggle={(event: any) =>
                toggle(event.detail.label, event.detail.value)
              }
            />
            {metadata ? <Metadata data={metadata} /> : null}
          </DownloadContainer>
        </Box>
      ) : undefined}
    </Box>
  );
};

export default TimeSeriesLabeler;
