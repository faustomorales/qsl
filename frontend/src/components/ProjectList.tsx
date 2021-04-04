import * as common from "./common";
import * as sharedTypes from "./sharedTypes";
import * as rrd from "react-router-dom";
import * as react from "react";
import * as mui from "@material-ui/core";
import * as muidg from "@material-ui/data-grid";

const ProjectList = () => {
  // Set state variables
  const [name, setName] = react.useState("");
  const [projects, setProjects] = react.useState([]);

  // Implement backend API operations
  react.useEffect(() => {
    common.getProjects().then(setProjects);
  }, []);

  const createProject = react.useCallback(() => {
    common
      .createProject({ name, id: null, labelingConfiguration: null })
      .then((project) => {
        setProjects(projects.concat([project]));
        setName("");
      });
  }, [name, projects, setProjects]);

  const duplicateProject = react.useCallback(
    (project: sharedTypes.Project) => {
      common
        .getProject(project.id)
        .then((existing) =>
          common.createProject({
            ...existing,
            name: `${project.name} (Duplicate)`,
          })
        )
        .then((created) => setProjects(projects.concat([created])));
    },
    [projects, setProjects]
  );
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <muidg.DataGrid
          rows={projects}
          disableColumnSelector
          disableSelectionOnClick
          disableColumnMenu
          disableColumnFilter
          autoHeight
          columns={[
            {
              field: "id",
              headerName: "ID",
              flex: 1,
              renderCell: (params: muidg.CellParams) => (
                <rrd.Link to={`/projects/${params.value}`}>
                  {params.value}
                </rrd.Link>
              ),
            },

            {
              field: "name",
              headerName: "Name",
              flex: 3,
            },
            {
              field: "nImages",
              headerName: "Number of Images",
              flex: 1,
            },
            {
              field: "nLabeled",
              headerName: "Labeled Images",
              flex: 1,
            },
            {
              field: "Actions",
              renderCell: (params: muidg.CellParams) => (
                <div>
                  <mui.Button
                    variant={"outlined"}
                    component={rrd.Link}
                    to={`/projects/${params.row.id}/edit-project`}
                    style={{ marginRight: "10px" }}
                  >
                    Edit
                  </mui.Button>
                  <mui.Button
                    variant="outlined"
                    onClick={() =>
                      duplicateProject(params.row as sharedTypes.Project)
                    }
                  >
                    Duplicate
                  </mui.Button>
                </div>
              ),
              flex: 2,
            },
          ]}
        />
      </mui.Grid>
      <mui.Grid item xs={12}>
        <mui.Box>
          <mui.Input
            value={name}
            placeholder={"New project name"}
            onChange={(event) => setName(event.target.value)}
            style={{ marginRight: "10px" }}
          />
          <mui.Button
            variant="contained"
            color="primary"
            disabled={name === ""}
            onClick={createProject}
          >
            Create Project
          </mui.Button>
        </mui.Box>
      </mui.Grid>
    </mui.Grid>
  );
};

export default ProjectList;
