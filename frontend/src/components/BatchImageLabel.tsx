import * as sharedTypes from "./sharedTypes";
import LabelPanel from "./LabelPanel";
import ShortcutButton from "./ShortcutButton";
import LabelingStatus from "./LabelingStatus";

import * as react from "react";
import * as rrd from "react-router-dom";
import * as mui from "@material-ui/core";
import * as muic from "@material-ui/icons";
import * as muidg from "@material-ui/data-grid";
import * as muis from "@material-ui/core/styles";
import * as common from "./common";

type LabelAction = "ignore" | "save" | "delete";
type ChangedRemoteStatus = "ignored" | "labeled";
type RemoteStatus = ChangedRemoteStatus | "unknown";
interface Status {
  selected: boolean;
  remoteStatus: RemoteStatus;
}
interface GridItem {
  image: sharedTypes.Image;
  selected: boolean;
}

interface BatchStatuses {
  [key: number]: Status;
}

interface HistoryEntry {
  images: sharedTypes.Image[];
  status: BatchStatuses;
}

const statusesFromBatch = (images: sharedTypes.Image[]): BatchStatuses => {
  return Object.fromEntries(
    images.map((image) => [
      image.id,
      { selected: true, remoteStatus: "unknown" as RemoteStatus },
    ])
  );
};

const useStyles = muis.makeStyles((theme) => ({
  checkbox: {
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  },
  checked: {
    color: "rgba(0, 150, 0, 1)",
  },
  unchecked: {
    color: "rgba(150, 0, 0, 1)",
  },
}));

const BatchImageGrid = (props: {
  items: GridItem[];
  projectId: string;
  thumbnailSize: number;
  toggleSelected: (id: number) => void;
}) => {
  const classes = useStyles();

  const getIcon = (item: GridItem) => {
    return (
      <mui.IconButton
        className={`${classes.checkbox} ${
          item.selected ? classes.checked : classes.unchecked
        }`}
        onClick={() => props.toggleSelected(item.image.id)}
        aria-label={`selected ${item.image.id}`}
      >
        {item.selected ? <muic.CheckBox /> : <muic.CheckBoxOutlineBlank />}
      </mui.IconButton>
    );
  };
  return (
    <mui.ImageList
      rowHeight={props.thumbnailSize}
      cols={Math.ceil(800 / props.thumbnailSize)}
    >
      {props.items.map((item) => (
        <mui.ImageListItem key={item.image.id} cols={1}>
          <img
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              height: "100%",
              width: "100%",
              objectFit: "contain",
              transform: "none",
              margin: "auto",
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
            src={common.getImageUrl(props.projectId, item.image.id)}
            alt={`ID: ${item.image.id}`}
            onClick={() => props.toggleSelected(item.image.id)}
          />
          {getIcon(item)}
        </mui.ImageListItem>
      ))}
    </mui.ImageList>
  );
};

export const BatchImageLabel = () => {
  // Get context variables.
  const { projectId, imageIds } = rrd.useRouteMatch<{
    projectId: string;
    imageIds: string;
  }>().params;

  // Set state variables.
  const [navState, setNavState] = react.useState({
    labels: null as sharedTypes.ImageLabels,
    dirty: false,
    saved: [],
    batches: [] as sharedTypes.Image[][],
    batchSize: 10,
    thumbnailSize: 160,
    redirecting: false,
    advanceOnSave: false,
    history: [] as HistoryEntry[],
    project: null as sharedTypes.Project,
    currentBatchStatus: {} as BatchStatuses,
    currentBatch: [] as sharedTypes.Image[],
  });

  const saveButton = react.useRef();
  const nextButton = react.useRef();
  const prevButton = react.useRef();
  const ignoreButton = react.useRef();
  const deleteButton = react.useRef();
  const selectAllButton = react.useRef();
  const selectNoneButton = react.useRef();

  const getFilteredHistory = react.useCallback(
    () =>
      navState.history.filter(
        (entry) => entry.images.map((image) => image.id).join(",") !== imageIds
      ),
    [navState, imageIds]
  );

  const onIgnoreDeleteSave = react.useCallback(
    (action: LabelAction) => {
      const changing = navState.currentBatch.filter(
        (image) => navState.currentBatchStatus[image.id].selected
      );
      let promises: Promise<sharedTypes.ImageLabels>[];
      let remoteStatus: RemoteStatus;
      switch (action) {
        case "ignore":
          remoteStatus = "ignored";
          promises = changing.map((image) =>
            common.setLabels(projectId, image.id, {
              ...navState.labels,
              ignored: true,
            })
          );
          break;
        case "delete":
          remoteStatus = "unknown";
          promises = changing.map((image) =>
            common.deleteLabels(projectId, image.id)
          );
          break;
        case "save":
          remoteStatus = "labeled";
          promises = changing.map((image) =>
            common.setLabels(projectId, image.id, navState.labels)
          );
          break;
      }
      Promise.all(promises).then(() => {
        const updated = {
          ...navState,
          currentBatchStatus: {
            ...navState.currentBatchStatus,
            ...Object.fromEntries(
              changing.map((image) => [
                image.id,
                { selected: false, remoteStatus: remoteStatus },
              ])
            ),
          },
        };
        setNavState(updated);
        if (
          navState.advanceOnSave &&
          Object.entries(updated.currentBatchStatus).filter(
            ([id, status]) => (status as Status).remoteStatus !== "unknown"
          ).length === updated.currentBatch.length
        ) {
          common.simulateClick(nextButton);
        }
      });
    },
    [navState, nextButton]
  );
  const onForward = react.useCallback(() => {
    // Stepping forward means replacing the current batch
    // with the next batch and then populating the images
    // in the next batch if there isn't already another one there.
    const history = [
      {
        images: navState.currentBatch,
        status: navState.currentBatchStatus,
      },
    ].concat(getFilteredHistory());
    setNavState({
      ...navState,
      currentBatch: navState.batches[0],
      currentBatchStatus: statusesFromBatch(navState.batches[0]),
      batches: navState.batches.slice(1),
      history,
      redirecting: true,
    });
  }, [navState, getFilteredHistory]);
  const onBackward = react.useCallback(() => {
    setNavState({
      ...navState,
      history: navState.history.slice(1),
      currentBatch: navState.history[0].images,
      currentBatchStatus: navState.history[0].status,
      batches: [navState.currentBatch].concat(navState.batches),
      redirecting: true,
    });
  }, [navState]);
  const onReset = react.useCallback(
    () =>
      setNavState({
        ...navState,
        currentBatchStatus: statusesFromBatch(navState.currentBatch),
      }),
    [navState]
  );

  const selectAll = react.useCallback(
    () =>
      setNavState({
        ...navState,
        currentBatchStatus: Object.fromEntries(
          Object.entries(navState.currentBatchStatus).map(([id, status]) => [
            id,
            {
              ...status,
              selected: status.remoteStatus === "unknown" ? true : false,
            },
          ])
        ),
      }),
    [navState]
  );

  const selectNone = react.useCallback(
    () =>
      setNavState({
        ...navState,
        currentBatchStatus: Object.fromEntries(
          Object.entries(navState.currentBatchStatus).map(([id, status]) => [
            id,
            { ...status, selected: false },
          ])
        ),
      }),
    [navState]
  );

  react.useEffect(() => {
    // Runs whenever the image IDs or project ID in the URL change.
    const currentBatch = imageIds.split(",").map((id) => {
      return { id: parseInt(id) };
    });
    const currentBatchStatus = statusesFromBatch(currentBatch);
    const nextBatchesQuery =
      navState.batches.length > 0
        ? Promise.resolve(navState.batches)
        : common
            .getImages(
              projectId,
              currentBatch.map((image) => image.id),
              navState.batchSize,
              true,
              true,
              0
            )
            .then((batch) => Promise.resolve([batch]));
    Promise.all([
      common.getProject(projectId),
      common.getImageLabels(projectId, currentBatch[0].id),
      nextBatchesQuery,
    ]).then(([project, labels, batches]) =>
      setNavState({
        ...navState,
        labels,
        batches,
        project,
        currentBatchStatus,
        currentBatch,
        redirecting: false,
      })
    );
  }, [projectId, imageIds]);

  react.useEffect(() => {
    const handler = async (event: KeyboardEvent) => {
      let target: react.MutableRefObject<HTMLButtonElement> = null;
      switch (event.key) {
        case "A":
          target = event.ctrlKey && event.shiftKey ? selectNoneButton : null;
          break;
        case "a":
          target = event.ctrlKey && !event.shiftKey ? selectAllButton : null;
          break;
        case "ArrowRight":
          target = nextButton;
          break;
        case "ArrowLeft":
          target = prevButton;
          break;
        case "Enter":
          target = event.shiftKey ? ignoreButton : saveButton;
          break;
        case "Backspace":
        case "Delete":
          target = deleteButton;
          break;
        default:
        // code block
      }
      if (target) {
        common.simulateClick(target);
      }
    };
    document.addEventListener("keydown", handler, false);
    return () => {
      document.removeEventListener("keydown", handler, false);
    };
  }, [
    navState,
    nextButton,
    prevButton,
    saveButton,
    ignoreButton,
    deleteButton,
    selectAllButton,
    selectNoneButton,
  ]);

  let redirect: JSX.Element = null;
  if (navState.redirecting) {
    const expectedImageIds = navState.currentBatch
      .map((image) => image.id)
      .join(",");
    if (!expectedImageIds) {
      redirect = <rrd.Redirect to={`/projects/${projectId}`} push={true} />;
    } else if (expectedImageIds !== imageIds) {
      // We're not at the right URL.
      redirect = (
        <rrd.Redirect
          to={`/projects/${projectId}/batches/${expectedImageIds}`}
          push={true}
        />
      );
    }
  }

  if (!navState.project || !navState.labels) {
    return null;
  }

  const nLabeled = Object.entries(navState.currentBatchStatus).reduce(
    (memo, [id, status]) => memo + (status.remoteStatus === "labeled" ? 1 : 0),
    0
  );
  const nIgnored = Object.entries(navState.currentBatchStatus).reduce(
    (memo, [id, status]) => memo + (status.remoteStatus === "ignored" ? 1 : 0),
    0
  );
  const nSelected = Object.entries(navState.currentBatchStatus).reduce(
    (memo, [id, status]) => memo + status.selected,
    0
  );
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <LabelingStatus project={navState.project}>
          <rrd.Link to={`/`}>QSL</rrd.Link> /{" "}
          <rrd.Link to={`/projects/${projectId}`}>
            {navState.project.name}
          </rrd.Link>{" "}
          / Batches
        </LabelingStatus>
      </mui.Grid>
      <mui.Grid item xs={3}>
        <mui.Grid item>
          {redirect}
          <mui.Typography style={{ marginBottom: "10px" }} variant={"h6"}>
            Image-Level Labels
          </mui.Typography>
          {navState.labels && navState.project ? (
            <LabelPanel
              configGroup={navState.project.labelingConfiguration.image}
              labels={navState.labels.image}
              setLabelGroup={(labels) =>
                setNavState({
                  ...navState,
                  labels: {
                    boxes: [],
                    image: labels,
                    default: false,
                    ignored: false,
                  },
                })
              }
            />
          ) : null}
          <mui.Divider />
        </mui.Grid>
        <mui.Grid item>
          <mui.Typography variant={"h6"}>View Settings</mui.Typography>
          <mui.Typography id="batch-size-selector" gutterBottom>
            Target Batch Size
          </mui.Typography>
          <mui.Slider
            value={navState.batchSize}
            aria-labelledby="batch-size-selector"
            valueLabelDisplay="auto"
            onChange={(event, value) =>
              setNavState({ ...navState, batchSize: value as number })
            }
            step={10}
            marks
            min={10}
            max={110}
          />
          <mui.Typography id="batch-size-selector" gutterBottom>
            Thumbnail Size
          </mui.Typography>
          <mui.Slider
            value={navState.thumbnailSize}
            aria-labelledby="batch-size-selector"
            valueLabelDisplay="auto"
            onChange={(event, value) =>
              setNavState({ ...navState, thumbnailSize: value as number })
            }
            step={20}
            marks
            min={160}
            max={500}
          />
          <mui.Divider />
        </mui.Grid>
        <mui.Grid item>
          <mui.Typography style={{ marginBottom: "10px" }} variant={"h6"}>
            Label Actions
          </mui.Typography>
          <mui.ButtonGroup
            size="small"
            orientation="vertical"
            color="primary"
            style={{ width: "100%" }}
            aria-label="acton button group"
          >
            <ShortcutButton
              startIcon={"\u23CE"}
              disabled={
                nLabeled + nIgnored === navState.currentBatch.length ||
                nSelected === 0
              }
              onClick={() => onIgnoreDeleteSave("save")}
              ref={saveButton}
            >
              Save
            </ShortcutButton>
            <ShortcutButton
              startIcon={"\u21E7\u23CE"}
              disabled={
                nLabeled + nIgnored === navState.currentBatch.length ||
                nSelected === 0
              }
              onClick={() => onIgnoreDeleteSave("ignore")}
              ref={ignoreButton}
            >
              Ignore
            </ShortcutButton>
            <ShortcutButton
              startIcon={"\u232B"}
              ref={deleteButton}
              disabled={
                nLabeled + nIgnored === navState.currentBatch.length ||
                nSelected === 0
              }
              onClick={() => onIgnoreDeleteSave("delete")}
            >
              Remove Labels
            </ShortcutButton>
            <ShortcutButton
              startIcon={<muic.KeyboardArrowRight />}
              ref={nextButton}
              onClick={onForward}
              disabled={navState.batches.length === 0}
            >
              Next
            </ShortcutButton>
            <ShortcutButton
              startIcon={<muic.KeyboardArrowLeft />}
              onClick={onBackward}
              ref={prevButton}
              disabled={getFilteredHistory().length === 0}
            >
              Previous
            </ShortcutButton>
            <ShortcutButton
              disabled={nSelected === navState.currentBatch.length - nLabeled}
              onClick={selectAll}
              startIcon={"\u2303A"}
              ref={selectAllButton}
            >
              Select All
            </ShortcutButton>
            <ShortcutButton
              startIcon={"\u2303\u21E7A"}
              disabled={nSelected === 0}
              onClick={selectNone}
              ref={selectNoneButton}
            >
              Select None
            </ShortcutButton>
          </mui.ButtonGroup>
          <mui.FormControlLabel
            control={
              <mui.Checkbox
                checked={navState.advanceOnSave}
                onChange={(event, advanceOnSave) =>
                  setNavState({ ...navState, advanceOnSave })
                }
                name="advanceOnSave"
              />
            }
            label="Advance when batch complete?"
          />
          {common.hasBoxLabels(navState.project.labelingConfiguration) ? (
            <mui.Typography variant="body1">
              This project has box-level labels which will be overwritten in
              batch mode.
            </mui.Typography>
          ) : null}
        </mui.Grid>
        <mui.Grid item>
          <mui.Divider style={{ marginBottom: "10px" }} />
          <mui.Typography variant={"h6"}>History</mui.Typography>
          <mui.Typography variant={"caption"}>
            Ten most recently reviewed batches.
          </mui.Typography>
          <muidg.DataGrid
            rows={navState.history.map((entry) => {
              return {
                ...entry,
                id: entry.images.map((image) => image.id).join(","),
              };
            })}
            hideFooterPagination
            disableColumnSelector
            disableSelectionOnClick
            disableColumnMenu
            hideFooter
            disableColumnReorder
            disableColumnFilter
            autoHeight
            columns={[
              {
                field: "images",
                headerName: "ID",
                flex: 1,
                renderCell: (params: muidg.CellParams) => {
                  const ids = (params.value as sharedTypes.Image[]).map(
                    (image) => image.id
                  );
                  return (
                    <rrd.Link
                      to={`/projects/${projectId}/images/${ids.join(",")}`}
                    >
                      {ids.slice(0, 5).join(", ") +
                        (ids.length > 5 ? ", ..." : "")}
                    </rrd.Link>
                  );
                },
              },
            ]}
          />
          {redirect}
          <mui.Divider style={{ marginBottom: "10px" }} />
          <mui.Link
            component={rrd.Link}
            variant={"body1"}
            to={`/projects/${projectId}`}
          >
            Return to Project Menu
          </mui.Link>
        </mui.Grid>
      </mui.Grid>
      <mui.Grid item xs={9}>
        {nLabeled + nIgnored < navState.currentBatch.length ? (
          <mui.Box>
            <BatchImageGrid
              items={navState.currentBatch
                .filter(
                  (image) =>
                    navState.currentBatchStatus[image.id].remoteStatus ===
                    "unknown"
                )
                .map((image) => {
                  return {
                    image,
                    selected: navState.currentBatchStatus[image.id].selected,
                  };
                })}
              thumbnailSize={navState.thumbnailSize}
              projectId={projectId}
              toggleSelected={(id) =>
                setNavState({
                  ...navState,
                  currentBatchStatus: {
                    ...navState.currentBatchStatus,
                    [id]: {
                      ...navState.currentBatchStatus[id],
                      selected: !navState.currentBatchStatus[id].selected,
                    },
                  },
                })
              }
            />
            <mui.Divider style={{ marginBottom: "10px" }} />
          </mui.Box>
        ) : null}
        <mui.Grid container direction={"row"} alignItems="center" spacing={1}>
          <mui.Grid item>
            <mui.Button
              onClick={onReset}
              disabled={nLabeled === 0 && nIgnored === 0}
              variant="contained"
            >
              Reset
            </mui.Button>
          </mui.Grid>
          <mui.Grid item>
            <mui.Typography variant={"body1"}>
              Hiding {nLabeled} labeled and {nIgnored} ignored images.
            </mui.Typography>
          </mui.Grid>
        </mui.Grid>
      </mui.Grid>
    </mui.Grid>
  );
};
