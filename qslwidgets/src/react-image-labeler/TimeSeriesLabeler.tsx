import React from "react";
import FileSaver from "file-saver";
import MediaViewer from "./components/MediaViewer";
import TimeSeries from "./components/TimeSeries";
import ControlMenu from "./components/ControlMenu";
import LabelerLayout from "./components/LabelerLayout";
import { Box, styled } from "@mui/material";
import { draft2labels } from "./components/library/utils";
import { useDraftLabelState, useMediaEvent } from "./components/library/hooks";
import { processSelectionChange } from "./components/library/handlers";
import { TimeSeriesLabelerProps } from "./components/library/types";
import html2canvas from "html2canvas";
import Metadata from "./components/Metadata";
import GlobalLabelerContext from "./components/GlobalLabelerContext";

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
  const { draft, setDraft, resetDraft, cursor, setCursor } = useDraftLabelState(
    labels,
    [target]
  );
  const onMouseMove = useMediaEvent(
    (coords) => {
      setCursor({ ...cursor, coords });
    },
    refs.container,
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
              onDownload: target?.filename ? onDownload : undefined,
            }}
          />
        }
        content={
          <MediaViewer
            cursor={cursor.coords}
            onMouseLeave={onMouseLeave}
            media={{
              main: target ? (
                <Box ref={refs.container} onMouseMove={onMouseMove}>
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
      {target && size ? (
        <Box style={{ overflow: "scroll", height: 0 }}>
          <DownloadContainer
            ref={refs.downloadable}
            style={{ display: "inline-block", padding: 20 }}
          >
            <TimeSeries target={target} labels={draft.labels} />
            {metadata ? <Metadata data={metadata} /> : null}
          </DownloadContainer>
        </Box>
      ) : undefined}
    </Box>
  );
};

export default TimeSeriesLabeler;
