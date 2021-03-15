import * as sharedTypes from "./sharedTypes";
import * as common from "./common";
import * as react from "react";
import * as rrd from "react-router-dom";
import * as mui from "@material-ui/core";
import LabelPanel from "./LabelPanel";

export const ProjectEditor = () => {
  // Get context variables.
  const { projectId } = rrd.useRouteMatch<{
    projectId: string;
  }>().params;

  // Set state variables.
  const [project, setProject] = react.useState<sharedTypes.Project>(null);
  const [isDirty, setIsDirty] = react.useState(false);
  const [finishedSaving, setFinishedSaving] = react.useState(false);

  // Implement backend API operations.
  const saveProject = react.useCallback(() => {
    return common.setProject(projectId, project).then((updated) => {
      setProject(updated);
      setIsDirty(false);
      setFinishedSaving(true);
    });
  }, [project, setProject]);

  const resetProject = react.useCallback(() => {
    common.getProject(projectId).then(setProject);
  }, [projectId]);

  react.useEffect(() => {
    resetProject();
  }, [projectId]);
  if (!project) {
    return null;
  }
  if (finishedSaving) {
    return <rrd.Redirect to={`/projects/${projectId}`} />;
  }
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <rrd.Link to={`/projects/${projectId}`}>
          <mui.Typography variant="subtitle1">
            Back to project menu
          </mui.Typography>
        </rrd.Link>
        <mui.Typography variant="h3">Project: {project.name}</mui.Typography>
        <mui.Typography variant="h5">
          Edit Labeling Configuration
        </mui.Typography>
      </mui.Grid>
      <mui.Grid item xs={12} sm={6}>
        <mui.Typography variant="h6">Image-Level Labels</mui.Typography>
        <LabelPanel
          configGroup={project.labelingConfiguration.image}
          setConfigGroup={(configGroup) => {
            setIsDirty(true);
            setProject({
              ...project,
              labelingConfiguration: {
                ...project.labelingConfiguration,
                image: configGroup,
              },
            });
          }}
        />
      </mui.Grid>
      <mui.Grid item sm={12} md={6}>
        <mui.Typography variant="h6">Box-Level Labels</mui.Typography>
        <LabelPanel
          configGroup={project.labelingConfiguration.box}
          setConfigGroup={(configGroup) => {
            setIsDirty(true);
            setProject({
              ...project,
              labelingConfiguration: {
                ...project.labelingConfiguration,
                box: configGroup,
              },
            });
          }}
        />
      </mui.Grid>
      <mui.Grid item container xs={12} spacing={2}>
        <mui.Grid item>
          <mui.Button
            onClick={saveProject}
            variant="contained"
            disabled={!isDirty}
            color="primary"
          >
            Save Labeling Configuration
          </mui.Button>
        </mui.Grid>
        <mui.Grid item>
          <mui.Button
            onClick={resetProject}
            variant="contained"
            disabled={!isDirty}
            color="secondary"
          >
            Reset
          </mui.Button>
        </mui.Grid>
      </mui.Grid>
    </mui.Grid>
  );
};
