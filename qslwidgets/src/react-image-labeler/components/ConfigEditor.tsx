import React from "react";
import {
  Divider,
  Box,
  Modal,
  Typography,
  ButtonGroup,
  Button,
} from "@mui/material";
import LabelPanelEntry from "./LabelPanelEntry";
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
  };
  const [state, setState] = React.useState(emptyState);
  React.useEffect(() => {
    if (existing) {
      setState({
        ...emptyState,
        properties: ([] as string[])
          .concat(existing?.config?.freeform ? ["freeform"] : [])
          .concat(existing?.config?.multiple ? ["multiple"] : []),
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
        <Box ml={-3} mr={-3}>
          <LabelPanelEntry
            setSelected={([name]) => setState({ ...state, name })}
            selected={[state.name]}
            disabled={!!existing}
            config={{ multiple: false, freeform: true, name: "Name" }}
          />
          <LabelPanelEntry
            setSelected={([displayName]) => setState({ ...state, displayName })}
            selected={[state.displayName]}
            disabled={!!existing}
            config={{ multiple: false, freeform: true, name: "Display Name" }}
          />
          <Divider sx={{ mb: 2 }} />
          <LabelPanelEntry
            disabled={!!existing}
            setSelected={([level]) =>
              setState({
                ...state,
                level: (level as "image" | "regions") || state.level,
              })
            }
            selected={[state.level]}
            config={{
              options: allowRegion
                ? [
                    { name: "image", displayName: "Image" },
                    { name: "regions", displayName: "Regions" },
                  ]
                : [{ name: "image", displayName: "Image" }],
              multiple: false,
              freeform: false,
              name: "Level",
            }}
          />
          <LabelPanelEntry
            setSelected={(name, properties) =>
              setState({ ...state, properties })
            }
            selected={state.properties}
            config={{
              options: [
                { name: "freeform", displayName: "Freeform" },
                { name: "multiple", displayName: "Multiple" },
              ],
              multiple: true,
              freeform: false,
              name: "Type",
            }}
          />
          <LabelPanelEntry
            setSelected={(name, options) => setState({ ...state, options })}
            selected={state.options}
            config={{
              options: [],
              multiple: true,
              freeform: true,
              name: "Options",
            }}
          />
        </Box>
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
            <Box sx={{ ml: -3, mr: -3, mt: 1, mb: -3 }}>
              <LabelPanelEntry
                selected={state.mockSelected}
                setSelected={(name, selected) =>
                  setState({ ...state, mockSelected: selected })
                }
                config={{
                  name: state.name,
                  displayName: state.displayName,
                  options,
                  multiple: state.properties.indexOf("multiple") > -1,
                  freeform: state.properties.indexOf("freeform") > -1,
                }}
              />
            </Box>
          </Box>
        ) : null}
      </Box>
    </Modal>
  );
};

export default ConfigEditor;
