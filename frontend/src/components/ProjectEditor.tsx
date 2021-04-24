import * as sharedTypes from "./sharedTypes";
import * as common from "./common";
import * as react from "react";
import * as rrd from "react-router-dom";
import * as mui from "@material-ui/core";
import LabelPanel from "./LabelPanel";
import LabelingStatus from "./LabelingStatus";

export const ProjectEditor = (props: { allowDelete: boolean }) => {
  // Get context variables.
  const { projectId } = rrd.useRouteMatch<{
    projectId: string;
  }>().params;

  // Set state variables.
  const [project, setProject] = react.useState<sharedTypes.Project>(null);
  const [isDirty, setIsDirty] = react.useState(false);
  const [finishedSaving, setFinishedSaving] = react.useState(false);
  const [deleted, setDeleted] = react.useState(false);

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

  const deleteProject = react.useCallback(() => {
    common.deleteProject(project.id).then(() => {
      setDeleted(true);
    });
  }, [project]);

  react.useEffect(() => {
    resetProject();
  }, [projectId]);
  if (!project) {
    return null;
  }
  if (finishedSaving) {
    return <rrd.Redirect to={`/projects/${projectId}`} />;
  }
  if (deleted) {
    return <rrd.Redirect to={`/projects`} />;
  }
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <LabelingStatus>
          <rrd.Link to={"/"}>QSL</rrd.Link> /{" "}
          <rrd.Link to={`/projects/${projectId}`}>{project.name}</rrd.Link> /
          Edit
        </LabelingStatus>
      </mui.Grid>
      <mui.Grid item xs={12}>
        <mui.FormControl component="fieldset">
          <mui.FormGroup>
            <mui.FormLabel component="legend">Project Name</mui.FormLabel>
            <mui.Input
              value={project.name}
              onChange={(event) => {
                setProject({ ...project, name: event.target.value });
                setIsDirty(true);
              }}
            />
          </mui.FormGroup>
        </mui.FormControl>
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
            Save Changes
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
        {props.allowDelete ? (
          <mui.Grid item>
            <mui.Button
              onClick={deleteProject}
              variant="contained"
              color="secondary"
            >
              Delete Project
            </mui.Button>
          </mui.Grid>
        ) : null}
      </mui.Grid>
    </mui.Grid>
  );
};
