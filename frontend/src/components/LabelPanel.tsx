import * as mui from "@material-ui/core";
import * as sharedTypes from "./sharedTypes";
import React, * as react from "react";

type LabelTypes = "single" | "multiple" | "text";

const SingleOrMultipleLabel = (props: {
  optionName: string;
  optionConfig: sharedTypes.LabelOption;
  control: React.ReactElement;
}) => {
  return (
    <mui.FormControlLabel
      value={props.optionName}
      control={props.control}
      label={`${props.optionName} (${props.optionConfig.shortcut})`}
    />
  );
};

const NewConfig = (props: {
  addConfig: (configName: string, configType: LabelTypes) => void;
  configGroup: sharedTypes.LabelConfigurationGroup;
}) => {
  const [configName, setConfigName] = react.useState("");
  const [configType, setConfigType] = react.useState("single" as LabelTypes);
  return (
    <mui.Grid container spacing={3}>
      <mui.Grid item xs={6}>
        <mui.Input
          value={configName}
          placeholder="New label name"
          onChange={(event) => setConfigName(event.target.value)}
          style={{ width: "100%" }}
        />
      </mui.Grid>
      <mui.Grid item xs={3}>
        <mui.Select
          labelId="config-type-selector"
          id="config-type-selector"
          label="New label type"
          value={configType}
          onChange={(event) => setConfigType(event.target.value as LabelTypes)}
          style={{ width: "100%" }}
        >
          <mui.MenuItem value={"single"}>Single</mui.MenuItem>
          <mui.MenuItem value={"multiple"}>Multiple</mui.MenuItem>
          <mui.MenuItem value={"text"}>Text</mui.MenuItem>
        </mui.Select>
      </mui.Grid>
      <mui.Grid item xs={3}>
        <mui.Button
          variant="contained"
          color={"primary"}
          onClick={() => {
            props.addConfig(configName, configType);
            setConfigName("");
          }}
          style={{ width: "100%" }}
          disabled={
            !configName ||
            props.configGroup[configType].hasOwnProperty(configName)
          }
        >
          Add Label
        </mui.Button>
      </mui.Grid>
    </mui.Grid>
  );
};

const NewSingleOrMultipleLabel = (props: {
  addOption: (optionName: string, shortcut: string) => void;
  isShortcutValid: (optionName: string, shortcut: string) => boolean;
}) => {
  const [name, setName] = react.useState("");
  const [shortcut, setShortcut] = react.useState("");
  return (
    <mui.Box style={{ marginBottom: "10px" }}>
      <mui.Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={"New option name"}
        style={{ marginRight: "10px" }}
      />
      <mui.Input
        value={shortcut}
        onChange={(event) => setShortcut(event.target.value)}
        placeholder={"Keyboard shortcut"}
        style={{ marginRight: "10px" }}
      />
      <mui.Button
        disabled={
          name.length === 0 ||
          shortcut.length !== 1 ||
          !props.isShortcutValid(name, shortcut)
        }
        variant="contained"
        color="primary"
        onClick={() => {
          props.addOption(name, shortcut);
          setName("");
          setShortcut("");
        }}
      >
        Add Option
      </mui.Button>
    </mui.Box>
  );
};

const SingleLabelPanel = (props: {
  configName: string;
  config: sharedTypes.SelectLabelConfiguration;
  selected: string;
  onChange?: (event: any, value: string) => void;
  setConfig?: (
    configName: string,
    config: sharedTypes.SelectLabelConfiguration
  ) => void;
  isShortcutValid?: (optionName: string, shortcut: string) => boolean;
}) => {
  return (
    <mui.FormGroup>
      <mui.FormControl component="fieldset">
        <mui.RadioGroup
          aria-label={props.configName}
          name={props.configName}
          onChange={props.onChange}
          value={props.selected}
        >
          <mui.FormLabel component="legend">{props.configName}</mui.FormLabel>
          {Object.entries(props.config.options).map(
            ([optionName, optionConfig]) => (
              <SingleOrMultipleLabel
                key={optionName}
                optionName={optionName}
                optionConfig={optionConfig}
                control={<mui.Radio disabled={!props.onChange} />}
              />
            )
          )}
        </mui.RadioGroup>
      </mui.FormControl>
      {props.setConfig ? (
        <NewSingleOrMultipleLabel
          isShortcutValid={props.isShortcutValid}
          addOption={(optionName, shortcut) =>
            props.setConfig(props.configName, {
              ...props.config,
              options: {
                ...props.config.options,
                [optionName]: { shortcut: shortcut, id: null },
              },
            })
          }
        />
      ) : null}
    </mui.FormGroup>
  );
};

const MultipleLabelPanel = (props: {
  configName: string;
  config: sharedTypes.SelectLabelConfiguration;
  selected: string[];
  onChange: (event: any, value: string) => void;
  setConfig?: (
    configName: string,
    config: sharedTypes.SelectLabelConfiguration
  ) => void;
  isShortcutValid?: (optionName: string, shortcut: string) => boolean;
}) => {
  return (
    <div>
      <mui.FormGroup>
        <mui.FormControl component="fieldset">
          <mui.FormLabel component="legend">{props.configName}</mui.FormLabel>
          {Object.entries(props.config.options).map(
            ([optionName, optionConfig]) => (
              <SingleOrMultipleLabel
                key={optionName}
                optionName={optionName}
                optionConfig={optionConfig}
                control={
                  <mui.Checkbox
                    disabled={!props.onChange}
                    checked={
                      props.selected
                        ? props.selected.indexOf(optionName) >= 0
                        : false
                    }
                    onChange={(event) => props.onChange(event, optionName)}
                    name={optionName}
                  />
                }
              />
            )
          )}
        </mui.FormControl>
      </mui.FormGroup>
      {props.setConfig ? (
        <NewSingleOrMultipleLabel
          isShortcutValid={props.isShortcutValid}
          addOption={(optionName, shortcut) =>
            props.setConfig(props.configName, {
              ...props.config,
              options: {
                ...props.config.options,
                [optionName]: { shortcut: shortcut, id: null },
              },
            })
          }
        />
      ) : null}
    </div>
  );
};

const InputLabelPanel = (props: {
  configName: string;
  value: string;
  onChange: (event: any, value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) => {
  return (
    <mui.FormControl component="fieldset">
      <mui.FormGroup>
        <mui.FormLabel component="legend">{props.configName}</mui.FormLabel>
        <mui.Input
          value={props.value}
          onChange={(event) => props.onChange(event, event.target.value)}
          onBlur={props.onBlur}
          onFocus={props.onFocus}
          disabled={!props.onChange}
        />
      </mui.FormGroup>
    </mui.FormControl>
  );
};

interface ShortcutSubconfiguration {
  [key: string]: {
    type: "single" | "multiple";
    configName: string;
    optionName: string;
  };
}

const isShortcutValid = (
  shortcuts: ShortcutSubconfiguration,
  configName: string,
  optionName: string,
  type: "single" | "multiple",
  shortcut: string
): boolean => {
  if (!shortcuts.hasOwnProperty(shortcut)) {
    return true;
  } else {
    const existing = shortcuts[shortcut];
    if (
      existing.configName !== configName ||
      existing.optionName !== optionName ||
      existing.type !== type
    ) {
      return false;
    }
    return true;
  }
};

const buildShortcutMap = (
  configGroup: sharedTypes.LabelConfigurationGroup
): ShortcutSubconfiguration => {
  return Object.entries(configGroup.single)
    .map(([configName, config]): [
      string,
      sharedTypes.SelectLabelConfiguration,
      "single" | "multiple"
    ] => [configName, config, "single"])
    .concat(
      Object.entries(configGroup.multiple).map(([configName, config]): [
        string,
        sharedTypes.SelectLabelConfiguration,
        "single" | "multiple"
      ] => [configName, config, "multiple"])
    )
    .map(([configName, config, configType]) => {
      return Object.entries(config.options).map(
        ([optionName, optionConfig]) => {
          return {
            key: optionConfig.shortcut,
            configName: configName,
            optionName: optionName,
            type: configType,
          };
        }
      );
    })
    .flat()
    .reduce((memo: ShortcutSubconfiguration, shortcut: any) => {
      memo[shortcut.key] = {
        type: shortcut.type,
        configName: shortcut.configName,
        optionName: shortcut.optionName,
      };
      return memo;
    }, {});
};

const LabelPanel = (props: {
  configGroup: sharedTypes.LabelConfigurationGroup;
  labels?: sharedTypes.LabelGroup;
  setLabelGroup?: (labels: sharedTypes.LabelGroup) => void;
  setConfigGroup?: (configGroup: sharedTypes.LabelConfigurationGroup) => void;
  onShiftEnter?: () => void;
  onEnter?: () => void;
  onEsc?: () => void;
  onDel?: () => void;
  onCtrlEnter?: () => void;
}) => {
  const {
    configGroup,
    labels,
    setLabelGroup,
    onEnter,
    onShiftEnter,
    onCtrlEnter,
    onEsc,
    onDel,
    setConfigGroup,
  } = props;
  const shortcuts = react.useMemo(() => buildShortcutMap(configGroup), [
    configGroup,
  ]);
  const [shortcutsDisabled, setShortcutsDisabled] = react.useState(false);
  const handleConfigChange = react.useCallback(
    (
      configName: string,
      configType: LabelTypes,
      config: sharedTypes.SelectLabelConfiguration
    ) => {
      const updated = {
        ...configGroup,
        [configType]: { ...configGroup[configType], [configName]: config },
      };
      setConfigGroup(updated);
    },
    [configGroup, setConfigGroup]
  );
  const handleAddConfig = react.useCallback(
    (configName: string, configType: LabelTypes) => {
      let updated: sharedTypes.LabelConfigurationGroup = {
        ...configGroup,
        [configType]: {
          ...configGroup[configType],
          [configName]: { id: null },
        },
      };
      if (configType === "multiple" || configType === "single") {
        updated[configType][configName].options = {};
      }
      setConfigGroup(updated);
    },
    [configGroup, setConfigGroup]
  );
  const handleLabelChange = react.useCallback(
    (configName: string, configType: LabelTypes, value: string) => {
      if (!setLabelGroup) {
        return;
      }
      let updated: sharedTypes.LabelGroup;
      if (configType === "single" || configType === "text") {
        updated = {
          ...labels,
          [configType]: { ...labels[configType], [configName]: value },
        };
      } else if (configType === "multiple") {
        const currentSelections = [...labels[configType][configName]];
        const currentLocation = currentSelections.indexOf(value);
        if (currentLocation >= 0) {
          currentSelections.splice(currentLocation, 1);
        } else {
          currentSelections.push(value);
        }
        updated = {
          ...labels,
          [configType]: {
            ...labels[configType],
            [configName]: currentSelections,
          },
        };
      }
      setLabelGroup(updated);
    },
    [labels, setLabelGroup]
  );
  react.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!onEnter && !setLabelGroup && !onEsc && !onDel) {
        // There's no reason to listen to keypresses.
        return;
      }
      if (
        shortcuts.hasOwnProperty(event.key) &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !shortcutsDisabled
      ) {
        const { type, configName, optionName } = shortcuts[event.key];
        handleLabelChange(configName, type, optionName);
      } else if (
        onEnter &&
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.ctrlKey
      ) {
        onEnter();
      } else if (
        onShiftEnter &&
        event.key === "Enter" &&
        event.shiftKey &&
        !event.ctrlKey
      ) {
        onShiftEnter();
      } else if (
        onCtrlEnter &&
        event.key === "Enter" &&
        !event.shiftKey &&
        event.ctrlKey
      ) {
        onCtrlEnter();
      } else if (onEsc && event.key === "Escape") {
        onEsc();
      } else if (onDel && event.key === "Delete") {
        onDel();
      }
    };
    document.addEventListener("keydown", handler, false);
    return () => {
      document.removeEventListener("keydown", handler, false);
    };
  }, [onEnter, setLabelGroup, shortcuts, shortcutsDisabled, handleLabelChange]);
  return (
    <div>
      {Object.entries(configGroup.single).map(([configName, config]) => (
        <SingleLabelPanel
          config={config}
          key={configName}
          onChange={
            setLabelGroup
              ? (event, value) => handleLabelChange(configName, "single", value)
              : null
          }
          setConfig={
            props.setConfigGroup
              ? (configName, config) =>
                  handleConfigChange(configName, "single", config)
              : null
          }
          isShortcutValid={(optionName, shortcut) =>
            isShortcutValid(
              shortcuts,
              configName,
              optionName,
              "single",
              shortcut
            )
          }
          configName={configName}
          selected={props.labels ? props.labels.single[configName] : null}
        />
      ))}
      {Object.entries(configGroup.multiple).map(([configName, config]) => (
        <MultipleLabelPanel
          config={config}
          onChange={
            setLabelGroup
              ? (event, value) =>
                  handleLabelChange(configName, "multiple", value)
              : null
          }
          key={configName}
          setConfig={
            props.setConfigGroup
              ? (configName, config) =>
                  handleConfigChange(configName, "multiple", config)
              : null
          }
          isShortcutValid={(optionName, shortcut) =>
            isShortcutValid(
              shortcuts,
              configName,
              optionName,
              "multiple",
              shortcut
            )
          }
          configName={configName}
          selected={props.labels ? props.labels.multiple[configName] : null}
        />
      ))}
      {Object.entries(configGroup.text).map(([configName, config]) => (
        <InputLabelPanel
          key={configName}
          onChange={
            setLabelGroup
              ? (event, value) => handleLabelChange(configName, "text", value)
              : null
          }
          onFocus={() => setShortcutsDisabled(true)}
          onBlur={() => setShortcutsDisabled(false)}
          configName={configName}
          value={props.labels ? props.labels.text[configName] || "" : ""}
        />
      ))}
      {props.setConfigGroup ? (
        <NewConfig addConfig={handleAddConfig} configGroup={configGroup} />
      ) : null}
    </div>
  );
};

export default LabelPanel;
