import { Context } from "./Context";
import * as sharedTypes from "./sharedTypes";
import * as rrd from "react-router-dom";
import * as react from "react";
import * as mui from "@material-ui/core";
import * as muidg from "@material-ui/data-grid";

export const ProjectList = () => {
  // Get context variables.
  const context = react.useContext(Context);

  // Set state variables
  const [name, setName] = react.useState("");
  const [projects, setProjects] = react.useState([]);

  // Implement backend API operations
  react.useEffect(() => {
    fetch(`${context.apiUrl}/api/v1/projects`, { ...context.getHeaders })
      .then((r) => r.json())
      .then(setProjects);
  }, []);

  const createProject = react.useCallback(() => {
    fetch(`${context.apiUrl}/api/v1/projects`, {
      ...context.postHeaders,
      body: JSON.stringify({ name }),
    })
      .then((r) => r.json())
      .then((project: sharedTypes.Project) => {
        setProjects(projects.concat([project]));
        setName("");
      });
  }, [name, projects, setProjects]);
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <mui.Typography variant="h5">Projects</mui.Typography>
      </mui.Grid>
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
          ]}
        />
      </mui.Grid>
      <mui.Grid item xs={12}>
        <mui.Box>
          <mui.Input
            value={name}
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
