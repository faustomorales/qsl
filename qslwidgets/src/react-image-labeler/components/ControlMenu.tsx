import React from "react";
import {
  Box,
  Radio,
  FormControl,
  Button,
  FormLabel,
  Stack,
  Divider,
  ButtonGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  useTheme,
} from "@mui/material";
import {
  KeyboardArrowRight,
  KeyboardArrowLeft,
  List,
  Keyboard,
  Add,
} from "@mui/icons-material";
import RangeSlider from "./RangeSlider";
import LabelPanel from "./LabelPanel";
import ConfigEditor from "./ConfigEditor";
import ClickTarget from "./ClickTarget";
import GlobalLabelerContext from "./GlobalLabelerContext";
import Metadata from "./Metadata";
import { insertOrAppend, shortcutify } from "./library/utils";
import {
  useKeyboardEvent,
  useMediaLarge,
  simulateClick,
} from "./library/hooks";
import { DraftState, Config, CursorData } from "./library/types";

interface Callbacks {
  onKeyboardEvent?: (event: KeyboardEvent) => void;
  onSave?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onDelete?: () => void;
  onIgnore?: () => void;
  onUnignore?: () => void;
  onSaveConfig?: (config: Config) => void;
  onReset?: () => void;
  onSelectAll?: () => void;
  onSelectNone?: () => void;
  onShowIndex?: () => void;
}

const ControlMenu: React.FC<{
  config: Config;
  draft: DraftState;
  setDraft: (draft: DraftState) => void;
  cursor: CursorData;
  setCursor: (cursor: CursorData) => void;
  callbacks: Callbacks;
  disabled: boolean;
  showNavigation?: boolean;
  allowRegion?: boolean;
  direction: "column" | "row";
}> = ({
  draft,
  cursor,
  disabled,
  callbacks,
  showNavigation,
  setDraft,
  setCursor,
  allowRegion = true,
  ...other
}) => {
  const theme = useTheme();
  const refs = Object.fromEntries(
    [
      "next",
      "prev",
      "save",
      "finishRegion",
      "clearRegion",
      "delete",
      "ignore",
      "selectAll",
      "selectNone",
    ].map((key) => [key, React.useRef<HTMLButtonElement>(null)])
  );
  const isLarge = useMediaLarge();
  const computedState = React.useMemo(() => {
    const level = draft.drawing.active ? "regions" : "image";
    const config = {
      image: shortcutify(other.config?.image || []),
      regions: shortcutify(other.config?.regions || []),
    };
    const activeConfig = config[level] || [];
    return {
      level: level as "regions" | "image",
      activeConfig,
      config,
      direction: isLarge ? other.direction : "column",
      allowRegionSelection:
        config?.regions && config.regions.length > 0 && allowRegion,
      disableLabelPanel:
        disabled ||
        (draft.drawing.active !== undefined &&
          draft.drawing.active.region.readonly === true),
      labels: draft.drawing.active
        ? draft.drawing.active.region.labels
        : draft.labels.image,
      editConfig: callbacks?.onSaveConfig
        ? (name: string) =>
            setState({
              configEditorOpen: true,
              index: activeConfig.findIndex((c) => c.name == name),
            })
        : undefined,
    };
  }, [other.config, draft.labels, draft.drawing.active, allowRegion, disabled]);
  const [state, setState] = React.useState({
    configEditorOpen: false,
    index: null as number | null,
  });
  const { setFocus, hasFocus, setToast } =
    React.useContext(GlobalLabelerContext);
  const finishPolygon = React.useCallback(
    (save) =>
      setDraft({
        ...draft,
        dirty: true,
        labels: {
          ...draft.labels,
          [draft.drawing.mode]: !draft.drawing.active
            ? draft.labels[draft.drawing.mode]
            : insertOrAppend(
                draft.labels[draft.drawing.mode],
                draft.drawing.active.region,
                draft.drawing.active.idx,
                save
              ),
        },
        drawing: {
          ...draft.drawing,
          active: undefined,
        },
      }),
    [draft]
  );
  useKeyboardEvent(
    (event: KeyboardEvent) => {
      if (callbacks?.onKeyboardEvent) {
        callbacks.onKeyboardEvent(event);
      }
      let target: string | null;
      if (event.altKey) {
        return;
      }
      switch (event.key) {
        case "A":
          target = event.ctrlKey && event.shiftKey ? "selectNone" : null;
          break;
        case "a":
          target = event.ctrlKey && !event.shiftKey ? "selectAll" : null;
          break;
        case "ArrowRight":
          target = event.ctrlKey || event.shiftKey ? null : "next";
          if (draft.dirty) {
            setToast(
              "Please save or reset your changes before advancing to next item."
            );
            target = null;
          }
          break;
        case "ArrowLeft":
          target = "prev";
          if (draft.dirty) {
            setToast(
              "Please save or reset your changes before returning to previous item."
            );
            target = null;
          }
          break;
        case "Enter":
          target =
            event.ctrlKey || event.shiftKey
              ? null
              : draft.drawing.active
              ? "finishRegion"
              : "save";
          break;
        case "Backspace":
        case "Delete":
          target =
            event.ctrlKey || event.shiftKey
              ? null
              : draft.drawing.active
              ? "clearRegion"
              : "delete";
          break;
        default:
          return;
      }
      if (target && refs[target].current) {
        simulateClick(refs[target].current).then(setFocus);
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [callbacks, state, draft, refs, setFocus]
  );
  const setLabels = React.useCallback(
    (current) => {
      setDraft({
        ...draft,
        dirty: true,
        labels: draft.drawing.active
          ? draft.labels
          : {
              ...draft.labels,
              image: current,
            },
        drawing: draft.drawing.active
          ? {
              ...draft.drawing,
              active: {
                ...draft.drawing.active,
                region: {
                  ...draft.drawing.active.region,
                  labels: current,
                } as any,
              },
            }
          : draft.drawing,
      });
    },
    [draft, setDraft]
  );
  return (
    <Box>
      <ClickTarget />
      <LabelPanel
        config={computedState.activeConfig}
        disabled={computedState.disableLabelPanel}
        labels={computedState.labels}
        editConfig={computedState.editConfig}
        setLabels={setLabels}
      />
      {draft.drawing && draft.drawing.active?.region.metadata ? (
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Metadata data={draft.drawing.active.region.metadata} />
        </Box>
      ) : null}
      {Object.keys(
        (draft.drawing.active
          ? computedState.config.regions
          : computedState.config.image) || []
      ).length > 0 ? (
        <Divider sx={{ mb: 3 }} />
      ) : null}
      {computedState.allowRegionSelection ? (
        <Box>
          <Stack
            alignContent="center"
            direction={computedState.direction}
            spacing={2}
          >
            <Box
              sx={{
                borderRight:
                  draft.drawing.mode === "masks"
                    ? `solid 1px ${theme.palette.divider}`
                    : undefined,
              }}
            >
              <FormControl>
                <FormLabel>Drawing Mode</FormLabel>
                <RadioGroup
                  row
                  className="drawing-mode-select"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      drawing:
                        event.target.value === "masks"
                          ? { flood: false, mode: "masks" }
                          : {
                              mode: event.target.value as "boxes" | "polygons",
                            },
                    })
                  }
                  value={draft.drawing.mode}
                >
                  {[
                    ["boxes", "Box"],
                    ["polygons", "Polygon"],
                    ["masks", "Mask"],
                  ].map(([name, displayName], i) => (
                    <FormControlLabel
                      key={i}
                      value={name}
                      control={
                        <Radio className="drawing-mode-option" size="small" />
                      }
                      label={displayName}
                      disabled={!!draft.drawing.active || disabled}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Box>
            {draft.drawing.mode === "masks" ? (
              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    computedState.direction == "row"
                      ? `100px 200px 200px`
                      : `100px 200px`,
                  gridTemplateAreas:
                    computedState.direction == "row"
                      ? '"toggle threshold size"'
                      : '"toggle threshold" "size size"',
                  gridTemplateRows: "auto",
                  columnGap: 25,
                }}
              >
                <FormControlLabel
                  style={{ gridArea: "toggle" }}
                  control={
                    <Checkbox
                      checked={draft.drawing.flood}
                      onChange={(event, flood) =>
                        setDraft({
                          ...draft,
                          drawing:
                            draft.drawing.mode === "masks"
                              ? { ...draft.drawing, flood }
                              : draft.drawing,
                        })
                      }
                    />
                  }
                  label={"Flood"}
                />
                <Box style={{ gridArea: "threshold", display: "inline-flex" }}>
                  <RangeSlider
                    name="Flood Threshold"
                    value={cursor.threshold}
                    min={0}
                    disabled={!draft.drawing.flood}
                    max={20}
                    width="100%"
                    aria-label="segmentation mask flood threshold"
                    onValueChange={(value) =>
                      setCursor({
                        ...cursor,
                        threshold: value as number,
                      })
                    }
                  />
                </Box>
                <Box style={{ gridArea: "size", display: "inline-flex" }}>
                  <RangeSlider
                    name="Cursor Size"
                    value={cursor.radius}
                    min={1}
                    max={50}
                    width="100%"
                    aria-label="segmentation mask labeling radius"
                    onValueChange={(value) =>
                      setCursor({
                        ...cursor,
                        radius: value,
                      })
                    }
                  />
                </Box>
              </Box>
            ) : null}
          </Stack>
          <Divider sx={{ mb: 2, mt: 2 }} />
        </Box>
      ) : null}
      <Stack direction={computedState.direction} spacing={2}>
        {draft.drawing.active ? (
          <ButtonGroup fullWidth size="small" aria-label="region control menu">
            <Button
              ref={refs.finishRegion}
              onClick={() => finishPolygon(true)}
              startIcon={"\u23CE"}
              className="finish-region"
            >
              {draft.drawing.active.region.readonly ? "Deselect" : "Finish"}
            </Button>
            <Button
              startIcon={"\u232B"}
              disabled={draft.drawing.active.region.readonly}
              onClick={() => finishPolygon(false)}
              ref={refs.clearRegion}
            >
              Delete
            </Button>
          </ButtonGroup>
        ) : (
          <Stack
            direction={computedState.direction}
            spacing={2}
            style={{ width: "100%" }}
          >
            {callbacks?.onSelectAll || callbacks?.onSelectNone ? (
              <ButtonGroup
                fullWidth
                size="small"
                aria-label="selection control menu"
                className="selection-control"
              >
                {callbacks?.onSelectAll ? (
                  <Button
                    disabled={!callbacks?.onSelectAll || disabled}
                    onClick={callbacks?.onSelectAll}
                    startIcon={"\u2303A"}
                    ref={refs.selectAll}
                    className="select-all"
                  >
                    Select All
                  </Button>
                ) : null}
                {callbacks?.onSelectNone ? (
                  <Button
                    disabled={!callbacks?.onSelectNone || disabled}
                    onClick={callbacks?.onSelectNone}
                    startIcon={"\u2303\u21E7A"}
                    ref={refs.selectNone}
                    className="select-none"
                  >
                    Select None
                  </Button>
                ) : null}
              </ButtonGroup>
            ) : null}
            <ButtonGroup fullWidth size="small" aria-label="label control menu">
              <Button
                ref={refs.save}
                disabled={!callbacks?.onSave || disabled}
                onClick={callbacks?.onSave}
                startIcon={"\u23CE"}
                className="save"
              >
                Save
              </Button>
              {callbacks?.onIgnore || callbacks?.onUnignore ? (
                <Button
                  ref={refs.ignore}
                  disabled={disabled}
                  onClick={callbacks?.onIgnore || callbacks?.onUnignore}
                >
                  {callbacks?.onIgnore ? "Ignore" : "Unignore"}
                </Button>
              ) : null}
              {callbacks?.onDelete ? (
                <Button
                  startIcon={"\u232B"}
                  ref={refs.delete}
                  disabled={disabled}
                  onClick={callbacks.onDelete}
                >
                  Delete
                </Button>
              ) : null}
              <Button
                disabled={disabled || !draft.dirty}
                onClick={callbacks?.onReset}
              >
                Reset
              </Button>
            </ButtonGroup>
            {callbacks?.onPrev || callbacks?.onNext || showNavigation ? (
              <ButtonGroup
                size="small"
                fullWidth
                aria-label="navigation control menu"
              >
                <Button
                  startIcon={<KeyboardArrowLeft />}
                  ref={refs.prev}
                  disabled={!callbacks?.onPrev || draft.dirty}
                  onClick={callbacks.onPrev}
                >
                  Previous
                </Button>
                <Button
                  startIcon={<KeyboardArrowRight />}
                  ref={refs.next}
                  disabled={!callbacks?.onNext || draft.dirty}
                  onClick={callbacks.onNext}
                >
                  Next
                </Button>
              </ButtonGroup>
            ) : null}
            {callbacks?.onSaveConfig || callbacks?.onShowIndex ? (
              <ButtonGroup
                size="small"
                aria-label="add new configuration menu"
                fullWidth
              >
                {callbacks?.onSaveConfig ? (
                  <Button
                    startIcon={<Add />}
                    className="add-new-label"
                    onClick={() =>
                      setState({ index: null, configEditorOpen: true })
                    }
                  >
                    Add Type
                  </Button>
                ) : null}
                {callbacks?.onShowIndex ? (
                  <Button
                    startIcon={<List />}
                    className="show-data-index"
                    disabled={disabled}
                    onClick={callbacks.onShowIndex}
                  >
                    View Index
                  </Button>
                ) : null}
              </ButtonGroup>
            ) : null}
          </Stack>
        )}
        <Box
          title={
            hasFocus
              ? "Listening for keyboard shortcuts."
              : "Keyboard shortcuts disabled. Click inside the widget to enable."
          }
          onClick={setFocus}
          style={{ zIndex: 1 }}
        >
          <Keyboard
            color={hasFocus ? "primary" : "warning"}
            fontSize={"large"}
          />
        </Box>
      </Stack>
      {callbacks && callbacks.onSaveConfig ? (
        <ConfigEditor
          allowRegion={allowRegion}
          open={state.configEditorOpen}
          onClose={() => setState({ ...state, configEditorOpen: false })}
          existing={
            state.index !== null
              ? {
                  config: computedState.activeConfig[state.index],
                  level: computedState.level,
                }
              : undefined
          }
          onSave={(newLabelConfig, level) => {
            if (
              state.index === null &&
              (computedState.config[level] || []).find(
                (c) => c.name === newLabelConfig.name
              )
            ) {
              throw "User attempted to add a config with the name of an existing config.";
            }
            const previous = computedState.activeConfig;
            const index = state.index === null ? previous.length : state.index;
            callbacks.onSaveConfig!({
              ...computedState.config,
              [level]: previous
                .slice(0, index)
                .concat([newLabelConfig])
                .concat(previous.slice(index + 1)),
            });
            setState({ index: null, configEditorOpen: false });
          }}
        />
      ) : null}
    </Box>
  );
};

export default ControlMenu;
