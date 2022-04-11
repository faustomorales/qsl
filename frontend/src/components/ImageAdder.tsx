import * as sharedTypes from "./sharedTypes";
import * as common from "./common";
import ChipInput from "material-ui-chip-input";
import * as react from "react";
import * as rrd from "react-router-dom";
import * as mui from "@material-ui/core";
import LabelPanel from "./LabelPanel";

export const ImageAdder = () => {
  // Get context variables.
  const { projectId } = rrd.useRouteMatch<{
    projectId: string;
  }>().params;

  // Set state variables.
  const [project, setProject] = react.useState<sharedTypes.Project>(null);
  const [files, setFiles] = react.useState([] as string[]);
  const [draftDefaultLabels, setDraftDefaultLabels] = react.useState(null);

  // Implement backend API operations.
  const addFiles = react.useCallback(() => {
    return common.addImages(projectId, files, draftDefaultLabels).then(() => {
      setDraftDefaultLabels(common.buildEmptyLabels(project));
      setFiles([]);
    });
  }, [project, files, draftDefaultLabels]);
  react.useEffect(() => {
    common.getProject(projectId).then((project) => {
      setDraftDefaultLabels(common.buildEmptyLabels(project));
      setProject(project);
    });
  }, []);
  if (!project) {
    return null;
  }
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <rrd.Link to={`/projects/${projectId}`}>
          <mui.Typography variant="subtitle1">
            Back to project menu
          </mui.Typography>
        </rrd.Link>
        <mui.Typography variant="h5">Add Files to Project</mui.Typography>
      </mui.Grid>
      <mui.Grid item xs={12}>
        <mui.Button
          onClick={addFiles}
          disabled={files.length === 0}
          style={{ width: "100%" }}
          variant="contained"
          color="primary"
        >
          Add Files
        </mui.Button>
      </mui.Grid>
      <mui.Grid item xs={6}>
        <ChipInput
          label="New Files"
          variant="outlined"
          value={files}
          onPaste={(event) => {
            // Do something like ls qsl/testing/data/*.jpg | xargs -n 1 basename to get a list of files
            event.preventDefault();
            setFiles(
              files.concat(
                event.clipboardData
                  .getData("Text")
                  .split("\n")
                  .filter((t) => t.length > 0)
              )
            );
          }}
          onAdd={(file) => setFiles(files.concat([file]))}
          onDelete={(file) =>
            setFiles(files.filter((current) => current !== file))
          }
          fullWidth
        />
      </mui.Grid>
      <mui.Grid item xs={6}>
        <mui.Typography variant="h6">Defaults</mui.Typography>
        <LabelPanel
          configGroup={project.labelingConfiguration.image}
          labels={draftDefaultLabels.image}
          setLabelGroup={(labels) =>
            setDraftDefaultLabels({ ...draftDefaultLabels, image: labels })
          }
        />
      </mui.Grid>
    </mui.Grid>
  );
};
