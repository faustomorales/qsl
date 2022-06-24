import React from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  FormGroup,
  Checkbox,
  Input,
  IconButton,
  Radio,
  styled,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import GlobalLabelerContext from "./GlobalLabelerContext";
import { useKeyboardEvent, simulateClick } from "./library/hooks";
import { processSelectionChange } from "./library/handlers";
import { LabelConfig, Option } from "./library/types";

interface LabelPanelEntryProps {
  config: LabelConfig;
  disabled?: boolean;
  selected?: string[];
  setSelected: (name: string, selected: string[]) => void;
  editConfig?: (name: string) => void;
}

const StyledBox = styled(Box)`
  & label.label-panel-entry-option-label {
    margin-bottom: 0;
  }

  & legend.label-panel-entry-label {
    margin-bottom: 0;
    border-bottom: none;
  }

  & .hide-required .MuiFormLabel-asterisk {
    display: none;
  }
`;

const buildOptionsList = (selected: string[] | undefined, options: Option[]) =>
  options.concat(
    selected
      ? selected
          .filter((s) => (options || []).findIndex((o) => o.name === s) == -1)
          .map((s) => {
            return { name: s, shortcut: "" };
          })
      : []
  );

const LabelPanelEntry: React.FC<LabelPanelEntryProps> = ({
  config,
  selected,
  setSelected,
  disabled,
  editConfig,
}) => {
  const availableOptions = React.useMemo(
    () =>
      config.options || config.multiple
        ? buildOptionsList(selected || [], config.options || [])
        : undefined,
    [config.options, selected]
  );
  const ref = React.useRef<HTMLElement>(null);
  const { setFocus } = React.useContext(GlobalLabelerContext);
  const keyIndexMap: { [key: string]: number } = React.useMemo(
    () =>
      availableOptions
        ? availableOptions.reduce((map, o, i) => {
            return o.shortcut ? { ...map, [o.shortcut as string]: i } : map;
          }, {})
        : {},
    [availableOptions]
  );
  const toggleSelected = React.useCallback(
    (o) =>
      setSelected(
        config.name,
        processSelectionChange(o, selected, config.multiple)
      ),
    [selected, config, setSelected]
  );
  useKeyboardEvent(
    (event: KeyboardEvent) => {
      if (
        // Block if a modifier key is used, or if we've disabled shortcuts,
        // or if the keyOptionMap is empty (meaning there are no shortcuts).
        event.ctrlKey ||
        event.shiftKey ||
        !keyIndexMap
      ) {
        return;
      }
      const idx = keyIndexMap[event.key];
      if (idx > -1 && ref.current) {
        const target = ref.current.querySelector(
          `.react-image-labeler-input-target[data-index='${idx}'] input`
        ) as HTMLElement;
        simulateClick(target);
        event.preventDefault();
        event.stopPropagation();
        setFocus();
      }
    },
    [keyIndexMap, ref, setFocus]
  );
  const [state, setState] = React.useState({
    freeform: "",
  });
  React.useEffect(
    () =>
      setState({
        freeform:
          availableOptions || config.multiple || !config.freeform || !selected
            ? ""
            : selected[0] || "",
      }),
    [selected]
  );
  return (
    <StyledBox display="inline">
      <FormControl
        sx={{ ml: 3, mr: 3, mt: 0, mb: 3 }}
        component="fieldset"
        variant="standard"
        className="label-panel-entry"
        disabled={!!disabled}
        name={config.name}
      >
        <FormLabel
          component="legend"
          className={`label-panel-entry-label ${
            config.hiderequired ? "hide-required" : ""
          }`}
          required={config.required}
        >
          {config.displayName || config.name}{" "}
          {editConfig ? (
            <IconButton
              aria-label={`edit ${config.name}`}
              className="edit-label-entry"
              onClick={() => editConfig(config.name)}
            >
              <Edit />
            </IconButton>
          ) : null}
        </FormLabel>
        <FormGroup ref={ref} row={config.layout == "row"}>
          {(availableOptions || []).map((o, i) => {
            const controlProps = {
              checked: !!(selected && selected.indexOf(o.name) > -1),
              onChange: () => toggleSelected(o.name),
              name: o.name,
              className: "react-image-labeler-input-target",
            };
            const label = `${o.displayName || o.name} ${
              o.shortcut ? `(${o.shortcut})` : ""
            }`;
            return (
              <FormControlLabel
                className={"label-panel-entry-option-label"}
                key={i}
                control={
                  config.multiple ? (
                    <Checkbox {...controlProps} data-index={i} />
                  ) : (
                    // Add the onClick so we can de-select radio selections.
                    <Radio
                      {...controlProps}
                      data-index={i}
                      onClick={controlProps.onChange}
                    />
                  )
                }
                color="primary"
                label={label}
              />
            );
          })}
        </FormGroup>
        {config.freeform ? (
          <Input
            value={state.freeform}
            name={`${config.name}-freeform`}
            placeholder={config.multiple ? "Add new option" : undefined}
            onKeyPress={(event) => {
              if (event.key === "Enter") {
                if (config.multiple || availableOptions) {
                  toggleSelected(state.freeform);
                  setState({
                    freeform: "",
                  });
                } else {
                  setFocus();
                }
                event.preventDefault();
              }
            }}
            onChange={(event) => {
              setState({ ...state, freeform: event.target.value });
              if (!config.multiple && !availableOptions) {
                toggleSelected(event.target.value);
              }
              event.preventDefault();
              event.stopPropagation();
            }}
          />
        ) : null}
      </FormControl>
    </StyledBox>
  );
};

export default LabelPanelEntry;
