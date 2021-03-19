import * as sharedTypes from "./sharedTypes";
import * as common from "./common";

import LabelingStatus from "./LabelingStatus";

import * as react from "react";
import * as rrd from "react-router-dom";
import * as mui from "@material-ui/core";
import * as muidg from "@material-ui/data-grid";

export const ProjectSummary = () => {
  // Get context variables.
  const { projectId } = rrd.useRouteMatch<{
    projectId: string;
  }>().params;

  // Set state variables.
  const [queue, setQueue] = react.useState<sharedTypes.Image[]>([]);
  const [project, setProject] = react.useState<sharedTypes.Project>(null);
  const [page, setPage] = react.useState(0);
  const [images, setImages] = react.useState<sharedTypes.Image[]>([]);
  const [loading, setLoading] = react.useState(false);
  const pageSize = 15;

  // Implement backend API operations
  react.useEffect(() => {
    common.getProject(projectId).then(setProject);
  }, []);

  react.useEffect(() => {
    common.getImages(projectId, [], 10, false, true, 0).then(setQueue);
  }, [projectId]);
  react.useEffect(() => {
    setLoading(true);
    common
      .getImages(projectId, [], pageSize, false, false, -1, page + 1)
      .then((images) => {
        setImages(images);
        setLoading(false);
      });
  }, [projectId, page]);

  if (!project) {
    return null;
  }
  const projectConfigured = common.configurationIsNotEmpty(
    project.labelingConfiguration
  );

  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <LabelingStatus project={project}>
          QSL / <rrd.Link to="/projects">Projects</rrd.Link> /{" "}
          <rrd.Link to={`/projects/${project.name}`}>{project.name}</rrd.Link>
        </LabelingStatus>
      </mui.Grid>
      <mui.Grid item>
        <ul>
          {projectConfigured && images.length > 0 ? (
            <li>
              {queue.length > 0 ? (
                <rrd.Link to={`/projects/${projectId}/images/${queue[0].id}`}>
                  <mui.Typography variant={"body1"}>
                    Start labeling individual images
                  </mui.Typography>
                </rrd.Link>
              ) : (
                <mui.Typography variant={"body1"}>
                  No images remain for labeling.
                </mui.Typography>
              )}
            </li>
          ) : null}
          {!projectConfigured ||
          images.length === 0 ||
          queue.length === 0 ? null : (
            <li>
              <rrd.Link
                to={`/projects/${projectId}/batches/${queue
                  .map((image) => image.id)
                  .join(",")}`}
              >
                <mui.Typography variant={"body1"}>
                  Start labeling image batches
                </mui.Typography>
              </rrd.Link>
            </li>
          )}
          <li>
            <rrd.Link to={`/projects/${projectId}/edit-project`}>
              <mui.Typography variant={"body1"}>
                {projectConfigured
                  ? "Edit project configuration"
                  : "Configure project"}
              </mui.Typography>
            </rrd.Link>
          </li>
          <li>
            <a href={common.getExportUrl(projectId)}>
              <mui.Typography variant={"body1"}>Export project</mui.Typography>
            </a>
          </li>
        </ul>
      </mui.Grid>
      <mui.Grid item xs={12}>
        <muidg.DataGrid
          rows={images}
          autoHeight
          disableColumnSelector
          disableSelectionOnClick
          disableColumnMenu
          disableColumnFilter
          columns={[
            {
              field: "id",
              headerName: "ID",
              flex: 1,
              disableColumnMenu: true,
              renderCell: (params: muidg.CellParams) => (
                <rrd.Link to={`/projects/${projectId}/images/${params.value}`}>
                  {params.value}
                </rrd.Link>
              ),
            },
            {
              field: "filepath",
              headerName: "Path",
              flex: 5,
            },
            {
              field: "labels",
              headerName: "# Labels",
              flex: 1,
            },
            {
              field: "status",
              headerName: "Status",
              renderCell: (params: muidg.CellParams) => (
                <span style={{ textTransform: "capitalize" }}>
                  {params.value}
                </span>
              ),
              flex: 1,
            },
          ]}
          pagination
          pageSize={pageSize}
          rowsPerPageOptions={[pageSize]}
          rowCount={project.nImages}
          paginationMode="server"
          onPageChange={(params: { page: number }) => setPage(params.page)}
          loading={loading}
        />
      </mui.Grid>
      <mui.Grid item>
        <mui.Button
          component={rrd.Link}
          to={`/projects/${projectId}/add-images`}
          variant="contained"
          color="primary"
          disabled={!projectConfigured}
        >
          Add Images
        </mui.Button>
      </mui.Grid>
    </mui.Grid>
  );
};
