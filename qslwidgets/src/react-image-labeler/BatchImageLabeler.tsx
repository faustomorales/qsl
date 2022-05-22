import {
  Box,
  ImageList,
  ImageListItem,
  IconButton,
  ImageListItemBar,
  styled,
} from "@mui/material";
import {
  CheckCircle,
  Circle,
  VisibilityOff,
  TurnedIn,
} from "@mui/icons-material";

import React from "react";
import Metadata from "./components/Metadata";
import LabelerLayout from "./components/LabelerLayout";
import GlobalLabelerContext from "./components/GlobalLabelerContext";
import ControlMenu from "./components/ControlMenu";
import ClickTarget from "./components/ClickTarget";
import { BatchImageLabelerProps } from "./components/library/types";
import { draft2labels } from "./components/library/utils";
import { useDraftLabelState, useMediaLarge } from "./components/library/hooks";

const BatchImageList = styled(ImageList)`
  & .MuiImageListItem-root {
    width: 100%;

    & img {
      transition: opacity 1s;
      z-index: 0;
      opacity: 1;
    }

    &.active,
    &:active img {
      transition: opacity 1s;
      opacity: 0.25;
    }
  }
  & .MuiImageListItemBar-titleWrap {
    padding: 8px;
  }
  & .MuiImageListItemBar-root {
    z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.7) 0%,
      rgba(0, 0, 0, 0.3) 70%,
      rgba(0, 0, 0, 0) 100%
    );
  }
`;

const BatchImageLabeler: React.FC<BatchImageLabelerProps> = ({
  target = [],
  labels,
  options,
  callbacks,
  setStates,
  states,
  config = { image: [], regions: [] },
  columns = 3,
}) => {
  const isLarge = useMediaLarge();
  const toggle = React.useCallback(
    (idx) =>
      setStates(
        states
          .slice(0, idx)
          .concat([{ ...states[idx], selected: !states[idx].selected }])
          .concat(states.slice(idx + 1))
      ),
    [setStates, states]
  );
  const { setToast } = React.useContext(GlobalLabelerContext);
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
  React.useEffect(() => {
    if (
      states &&
      states.some((s) =>
        ["boxes", "masks", "polygons"].some(
          (k: any) =>
            s.labels &&
            s.labels[(k as "boxes") || "masks" || "polygons"] &&
            s.labels[(k as "boxes") || "masks" || "polygons"]!.length > 0
        )
      )
    ) {
      setToast(
        "Warning: One of these items has region labels that will be overwritten upon saving."
      );
    }
  }, [states]);
  return (
    <LabelerLayout
      layout={isLarge ? "horizontal" : "vertical"}
      progress={options?.progress}
      control={
        <ControlMenu
          disabled={false}
          direction="column"
          showNavigation={options?.showNavigation}
          config={{ image: config?.image, regions: undefined }}
          draft={draft}
          setDraft={setDraft}
          callbacks={{
            ...callbacks,
            onSave: callbacks?.onSave ? save : undefined,
            onReset: resetDraft,
            onSelectAll: states.some((t) => t.visible && !t.selected)
              ? () =>
                  setStates(
                    states.map((t) => {
                      return { ...t, selected: t.visible };
                    })
                  )
              : undefined,
            onSelectNone: states.some((t) => t.visible && t.selected)
              ? () =>
                  setStates(
                    states.map((t) => {
                      return { ...t, selected: false };
                    })
                  )
              : undefined,
          }}
        />
      }
      content={
        <Box>
          <ClickTarget />
          <BatchImageList cols={columns} sx={{ mt: 0 }} variant="masonry">
            {states.map((t, tIdx) =>
              t.visible ? (
                <ImageListItem
                  key={tIdx}
                  data-index={tIdx}
                  onClick={() => toggle(tIdx)}
                  tabIndex={0}
                  className="batch-image-list-item"
                >
                  <ImageListItemBar
                    position="top"
                    title={
                      <Box sx={{ height: 25 }}>
                        {t.ignored ? (
                          <Box
                            title="ignored"
                            flexDirection={"row-reverse"}
                            alignItems="center"
                            display="flex"
                          >
                            <VisibilityOff />
                          </Box>
                        ) : t.labeled ? (
                          <Box
                            title="labeled"
                            flexDirection={"row-reverse"}
                            alignItems="center"
                            display="flex"
                          >
                            <TurnedIn />
                          </Box>
                        ) : null}
                      </Box>
                    }
                    actionIcon={
                      <IconButton
                        sx={{ color: "white" }}
                        aria-label={`selected ${tIdx}`}
                      >
                        {t.selected ? <CheckCircle /> : <Circle />}
                      </IconButton>
                    }
                    actionPosition="left"
                  />
                  {target[tIdx] ? (
                    <img src={target[tIdx]} />
                  ) : (
                    <Box sx={{ mb: 5 }} />
                  )}
                  {t.metadata ? (
                    <Metadata
                      data={Object.fromEntries(
                        Object.entries(t.metadata || {}).concat(
                          t.labels?.image
                            ? (config.image || [])
                                .map(
                                  (c) =>
                                    [
                                      c.displayName || c.name,
                                      t.labels.image![c.name]
                                        ? c.multiple
                                          ? t.labels.image![c.name].join(", ")
                                          : t.labels.image![c.name][0]
                                        : undefined,
                                    ] as [string, string]
                                )
                                .filter(([k, v]) => v !== undefined)
                            : []
                        )
                      )}
                    />
                  ) : null}
                </ImageListItem>
              ) : null
            )}
          </BatchImageList>
        </Box>
      }
    />
  );
};

export default BatchImageLabeler;
