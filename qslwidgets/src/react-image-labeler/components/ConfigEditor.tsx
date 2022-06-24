import React from "react";
import {
  Divider,
  Box,
  Modal,
  Typography,
  ButtonGroup,
  Button,
} from "@mui/material";
import LabelPanel from "./LabelPanel";
import { LabelConfig } from "./library/types";

interface ConfigEditorProps {
  existing?: { level: "image" | "regions"; config: LabelConfig };
  open: boolean;
  allowRegion?: boolean;
  onSave: (config: LabelConfig, level: "image" | "regions") => void;
  onClose: () => void;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({
  open,
  existing,
  allowRegion = true,
  onSave,
  onClose,
}) => {
  const emptyState = {
    properties: [] as string[],
    displayName: "",
    name: "",
    level: "image" as "image" | "regions",
    options: [] as string[],
    mockSelected: [] as string[],
    required: false,
  };
  const [state, setState] = React.useState(emptyState);
  React.useEffect(() => {
    if (existing) {
      setState({
        ...emptyState,
        properties: ([] as string[])
          .concat(existing?.config?.freeform ? ["freeform"] : [])
          .concat(existing?.config?.multiple ? ["multiple"] : [])
          .concat(existing?.config?.required ? ["required"] : []),
        displayName: existing.config.displayName || "",
        name: (existing.config.name || "") as string,
        level: existing.level || "image",
        options:
          existing?.config.options?.map((o) => o.displayName || o.name) ||
          ([] as string[]),
      });
    }
  }, [existing]);
  const valid = React.useMemo(
    () =>
      state.name &&
      (state.properties.indexOf("freeform") > -1 || state.options.length > 0),
    [state]
  );
  const options = React.useMemo(
    () =>
      state.options.length > 0
        ? state.options.map((o) => {
            return {
              name: o,
              ...(existing?.config.options
                ? existing.config.options.find(
                    (e) => (e.displayName || e.name) === o
                  ) || {}
                : {}),
            };
          })
        : undefined,
    [state, existing]
  );
  return (
    <Modal
      open={open}
      aria-describedby="add-or-update-new-label-entry-description"
    >
      <Box
        sx={{
          p: 2,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          color: "text.secondary",
          border: "2px solid #000",
          boxShadow: 24,
        }}
      >
        <Typography
          id="add-or-update-new-label-entry-description"
          sx={{ mb: 1 }}
        >
          {existing
            ? "Edit Label Configuration"
            : "Add New Label Configuration"}
        </Typography>
        <LabelPanel
          config={[
            {
              multiple: false,
              freeform: true,
              name: "name",
              displayName: "Name",
              disabled: !!existing,
              freeformtag: "input",
              panelrow: 0,
            },
            {
              multiple: false,
              freeform: true,
              displayName: "Display Name",
              name: "displayName",
              disabled: !!existing,
              freeformtag: "input",
              panelrow: 0,
            },
            {
              options: allowRegion
                ? [
                    { name: "image", displayName: "Image" },
                    { name: "regions", displayName: "Regions" },
                  ]
                : [{ name: "image", displayName: "Image" }],
              multiple: false,
              freeform: false,
              name: "level",
              displayName: "Level",
              disabled: !!existing,
              required: true,
              panelrow: 1,
            },
            {
              options: [
                { name: "freeform", displayName: "Freeform" },
                { name: "multiple", displayName: "Multiple" },
                { name: "required", displayName: "Required" },
              ],
              multiple: true,
              freeform: false,
              name: "properties",
              displayName: "Type",
              panelrow: 1,
            },
            {
              options: [],
              multiple: true,
              freeform: true,
              displayName: "Options",
              name: "options",
              panelrow: 1,
            },
          ]}
          labels={{
            name: [state.name],
            displayName: [state.displayName],
            level: [state.level],
            properties: state.properties,
            options: state.options,
          }}
          setLabels={(labels) =>
            setState({
              ...state,
              name: labels.name[0],
              displayName: labels.displayName[0],
              level: labels.level[0] as "image" | "regions",
              properties: labels.properties,
              options: labels.options,
            })
          }
          disabled={false}
        />
        <ButtonGroup size="small" aria-label="label editing control menu">
          <Button
            disabled={!valid}
            onClick={() => {
              onSave(
                {
                  name: state.name,
                  displayName: state.displayName,
                  multiple: state.properties.indexOf("multiple") > -1,
                  freeform: state.properties.indexOf("freeform") > -1,
                  required: state.properties.indexOf("required") > -1,
                  options,
                },
                state.level
              );
              setState(emptyState);
            }}
          >
            Save
          </Button>
          <Button
            onClick={() => {
              onClose();
              setState(emptyState);
            }}
          >
            Cancel
          </Button>
        </ButtonGroup>
        {valid ? (
          <Box>
            <Divider sx={{ mt: 2, mb: 2 }} />
            <Typography>
              Your new label configuration will look like the following.
            </Typography>
            <LabelPanel
              disabled={false}
              config={[
                {
                  name: state.name,
                  displayName: state.displayName,
                  options,
                  multiple: state.properties.indexOf("multiple") > -1,
                  freeform: state.properties.indexOf("freeform") > -1,
                  required: state.properties.indexOf("required") > -1,
                },
              ]}
              labels={{ [state.name]: state.mockSelected }}
              setLabels={(labels) =>
                setState({ ...state, mockSelected: labels[state.name] })
              }
            />
          </Box>
        ) : null}
      </Box>
    </Modal>
  );
};

export default ConfigEditor;
