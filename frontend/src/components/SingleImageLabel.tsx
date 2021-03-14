import * as common from "./common";
import * as sharedTypes from "./sharedTypes";
import * as react from "react";
import * as mui from "@material-ui/core";
import * as muic from "@material-ui/icons";
import * as muis from "@material-ui/styles";
import * as muidg from "@material-ui/data-grid";
import * as rrd from "react-router-dom";
import _ from "lodash";
import LabelPanel from "./LabelPanel";
import ShortcutButton from "./ShortcutButton";
import LabelingStatus from "./LabelingStatus";

interface HistoryEntry {
  id: number;
  status: "Ignored" | "Unlabeled" | "Labeled";
}

const useStyles = muis.makeStyles((theme) => ({
  box: {
    position: "absolute",
    border: "2px solid black",
    backgroundColor: "rgba(255,255,255,0.5)",
    color: "black",
  },
  selectedBox: {
    border: "2px solid red",
    color: "red",
  },
  startIcon: {
    position: "absolute",
    left: "8px",
  },
  iconButtonSpan: {
    paddingLeft: "40px",
  },
}));

interface DraftBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  next: 1 | 2;
  fixed: boolean;
  id: number;
  labels: sharedTypes.LabelGroup;
}

interface MousePosition {
  x: number;
  y: number;
}

const float2css = (float: number) => `${float * 100}%`;
const box2styles = (box: sharedTypes.Box) => {
  return {
    left: float2css(box.x),
    top: float2css(box.y),
    width: float2css(box.w),
    height: float2css(box.h),
  };
};
const draftBox2box = (box: DraftBox): sharedTypes.Box => {
  return {
    x: Math.min(box.x1, box.x2),
    y: Math.min(box.y1, box.y2),
    w: Math.abs(box.x2 - box.x1),
    h: Math.abs(box.y2 - box.y1),
    id: box.id,
    labels: box.labels,
  };
};
const draftBox2styles = (box: DraftBox) => {
  const converted = draftBox2box(box);
  return {
    left: float2css(converted.x),
    top: float2css(converted.y),
    width: float2css(converted.w),
    height: float2css(converted.h),
  };
};

const draftBox2indicatorStyles = (box: DraftBox): react.CSSProperties => {
  const invertedY = box.y1 > box.y2;
  const invertedX = box.x1 > box.x2;
  const top = (box.next === 1 && !invertedY) || (box.next === 2 && invertedY);
  const left = (box.next === 1 && !invertedX) || (box.next === 2 && invertedX);
  return {
    left: left ? "0%" : "auto",
    top: top ? "0%" : "auto",
    right: left ? "auto" : "0%",
    bottom: top ? "auto" : "0%",
    width: "10px",
    height: "10px",
    position: "absolute",
    backgroundColor: "red",
    marginLeft: left ? "-5px" : "0",
    marginRight: left ? "0" : "-5px",
    marginTop: top ? "-5px" : "0",
    marginBottom: top ? "0" : "-5px",
  };
};

const box2draftBox = (box: sharedTypes.Box): DraftBox => {
  return {
    x1: box.x,
    x2: box.x + box.w,
    y1: box.y,
    y2: box.y + box.h,
    labels: box.labels,
    id: box.id,
    next: 2,
    fixed: true,
  };
};

const labels2string = (labels: sharedTypes.LabelGroup): string =>
  Object.values(labels.single).join(", ");

const click2xy = (
  event: react.MouseEvent,
  img: HTMLImageElement,
  zoom: number
) => {
  const { x, y, width, height } = img.getBoundingClientRect();
  return {
    x: (event.nativeEvent.pageX - window.scrollX - x * zoom) / (width * zoom),
    y: (event.nativeEvent.pageY - window.scrollY - y * zoom) / (height * zoom),
  };
};

const Image = (props: {
  boxes: sharedTypes.Box[];
  draftBox: DraftBox;
  zoom: number;
  onClick?: (event: MousePosition) => void;
  onHover: (event: MousePosition) => void;
  onSelectBox: (boxIdx: number, event: MousePosition) => void;
}) => {
  const classes = useStyles();
  const { projectId, imageId } = rrd.useRouteMatch<{
    projectId: string;
    imageId: string;
  }>().params;
  const ref = react.useRef<HTMLImageElement>();
  const onMouseMove = _.debounce((event: react.MouseEvent) => {
    props.onHover(click2xy(event, ref.current, props.zoom));
  }, 5);
  const onClick = (event: react.MouseEvent) => {
    if (!props.onClick) {
      return;
    }
    props.onClick(click2xy(event, ref.current, props.zoom));
  };
  return (
    <div>
      <div style={{ position: "relative", display: "inline-block" }}>
        <mui.Paper>
          <img
            ref={ref}
            src={common.getImageUrl(projectId, imageId)}
            alt={`ID: ${imageId}`}
            onMouseMove={onMouseMove}
            onClick={onClick}
            style={{ display: "block", zoom: props.zoom }}
          />
        </mui.Paper>
        {props.draftBox &&
        props.draftBox.x1 &&
        props.draftBox.y1 &&
        props.draftBox.x2 &&
        props.draftBox.y2 ? (
          <div
            onMouseMove={onMouseMove}
            className={`${classes.box} ${classes.selectedBox}`}
            style={draftBox2styles(props.draftBox)}
            onClick={onClick}
          >
            <mui.Typography variant={"caption"}>
              {labels2string(props.draftBox.labels)}
            </mui.Typography>
            {props.draftBox.fixed ? (
              <div style={draftBox2indicatorStyles(props.draftBox)} />
            ) : null}
          </div>
        ) : null}
        {props.boxes.map((box, index) => (
          <div
            onMouseMove={onMouseMove}
            className={classes.box}
            style={box2styles(box)}
            onClick={(event) => {
              props.onSelectBox(
                index,
                click2xy(event, ref.current, props.zoom)
              );
            }}
            key={index}
          >
            <mui.Typography variant={"caption"}>
              {labels2string(box.labels)}
            </mui.Typography>
          </div>
        ))}
      </div>
    </div>
  );
};

const getNextDesiredImageId = (queue: sharedTypes.Image[]): string => {
  return queue.length > 0 ? queue[0].id.toString() : null;
};

const updateHistory = (
  imageId: string,
  status: "Ignored" | "Unlabeled" | "Labeled",
  current: HistoryEntry[]
): HistoryEntry[] => {
  return [
    {
      id: parseInt(imageId),
      status,
    },
  ]
    .concat(current.filter((entry) => entry.id !== parseInt(imageId)))
    .slice(0, 10);
};

export const SingleImageLabel = () => {
  // Get context variables.
  const { projectId, imageId } = rrd.useRouteMatch<{
    projectId: string;
    imageId: string;
  }>().params;

  // Create state variables
  const nextButton = react.useRef<HTMLButtonElement>();
  const prevButton = react.useRef<HTMLButtonElement>();
  const saveButton = react.useRef<HTMLButtonElement>();
  const ignoreButton = react.useRef<HTMLButtonElement>();
  const deleteButton = react.useRef<HTMLButtonElement>();
  const setBoxButton = react.useRef<HTMLButtonElement>();
  const deleteBoxButton = react.useRef<HTMLButtonElement>();
  const [draftBox, setDraftBox] = react.useState<DraftBox>(null);
  const [project, setProject] = react.useState(null as sharedTypes.Project);
  const [navState, setNavState] = react.useState({
    queueSize: 20,
    desiredImageId: imageId,
    status: "initializing" as
      | "initializing"
      | "waiting"
      | "saving"
      | "redirecting",
    labels: null as sharedTypes.ImageLabels,
    advanceOnSave: false,
    dirty: false,
    notice: null as string,
    history: [] as HistoryEntry[],
    queue: [] as sharedTypes.Image[],
  });
  const [zoom, setZoom] = react.useState<number>(1);

  // Create calculated variables
  const boxMode = draftBox && draftBox.fixed;
  const configGroup = project
    ? boxMode
      ? project.labelingConfiguration.box
      : project.labelingConfiguration.image
    : null;
  const labelGroup = navState.labels
    ? boxMode
      ? draftBox.labels
      : navState.labels.image
    : null;

  // Implement UI event handlers
  const click = react.useCallback(
    (pos: MousePosition) => {
      if (!draftBox) {
        setDraftBox({
          x1: pos.x,
          y1: pos.y,
          x2: null,
          y2: null,
          labels: common.buildEmptyLabelGroup(
            project.labelingConfiguration.box
          ),
          id: null,
          fixed: false,
          next: 2,
        });
      } else {
        setDraftBox({
          ...draftBox,
          x1: draftBox.next === 1 ? pos.x : draftBox.x1,
          y1: draftBox.next === 1 ? pos.y : draftBox.y1,
          x2: draftBox.next === 2 ? pos.x : draftBox.x2,
          y2: draftBox.next === 2 ? pos.y : draftBox.y2,
          fixed: true,
          next: draftBox.next === 1 ? 2 : 1,
        });
      }
    },
    [draftBox, project]
  );

  const hover = react.useCallback(
    (pos: MousePosition) => {
      if (draftBox && !draftBox.fixed) {
        setDraftBox({ ...draftBox, x2: pos.x, y2: pos.y });
      }
    },
    [draftBox]
  );

  const selectBox = react.useCallback(
    (boxIdx: number, pos: MousePosition) => {
      if (!draftBox) {
        const selected = navState.labels.boxes.splice(boxIdx, 1)[0];
        setDraftBox(box2draftBox(selected));
        setNavState({
          ...navState,
          labels: {
            ...navState.labels,
            boxes: navState.labels.boxes,
            default: false,
          },
        });
      } else {
        click(pos);
      }
    },
    [navState, draftBox]
  );

  // Implement backend API operations
  react.useEffect(() => {
    common.getProject(projectId).then(setProject);
  }, [projectId, imageId]);

  // This runs any time the imageId changes in the URL, which is also the
  // only time that the queue needs updating.
  react.useEffect(() => {
    const existing = navState.queue.filter(
      (image) => image.id.toString() !== imageId
    );
    const excludedIds = existing
      .map((image) => image.id)
      .concat(imageId ? [parseInt(imageId)] : []);
    Promise.all([
      imageId
        ? common.getImageLabels(projectId, imageId)
        : Promise.resolve(null),
      navState.queueSize <= existing.length
        ? Promise.resolve([])
        : common.getImages(
            projectId,
            excludedIds,
            navState.queueSize - existing.length
          ),
    ]).then(([labels, additions]) => {
      const updated = existing.concat(additions);
      setNavState({
        ...navState,
        labels,
        queue: updated,
        status: imageId ? "waiting" : "redirecting",
        desiredImageId: imageId ? imageId : getNextDesiredImageId(updated),
      });
    });
  }, [imageId]);

  // Create callbacks
  const onDeleteBox = react.useCallback(() => {
    setDraftBox(null);
  }, []);

  const onDelete = react.useCallback(() => {
    if (!navState.labels.default) {
      common.deleteLabels(projectId, imageId).then((updated) => {
        setNavState({
          ...navState,
          labels: updated,
          dirty: false,
          history: updateHistory(imageId, "Unlabeled", navState.history),
          notice: "Deleted your label and reverted to default.",
        });
      });
    }
  }, [imageId, navState]);

  const closeNotice = react.useCallback(
    () => setNavState({ ...navState, notice: null }),
    [navState]
  );

  const onSave = react.useCallback(() => {
    common
      .setLabels(projectId, imageId, {
        ...navState.labels,
        ignored: false,
      })
      .then(async (updated) => {
        setNavState({
          ...navState,
          labels: updated,
          dirty: false,
          history: updateHistory(imageId, "Labeled", navState.history),
          notice: "Saved your labels.",
        });
        if (navState.advanceOnSave) {
          common.simulateClick(nextButton);
        }
      });
  }, [navState, nextButton]);

  const onSetBox = react.useCallback(() => {
    setDraftBox(null);
    setNavState({
      ...navState,
      dirty: true,
      labels: {
        ...navState.labels,
        boxes: navState.labels.boxes.concat([draftBox2box(draftBox)]),
      },
    });
  }, [draftBox, navState]);

  const onIgnore = react.useCallback(() => {
    if (boxMode) {
      return;
    } else {
      common
        .setLabels(projectId, imageId, {
          ...navState.labels,
          ignored: true,
        })
        .then((updated) => {
          setNavState({
            ...navState,
            labels: updated,
            dirty: false,
            history: updateHistory(imageId, "Ignored", navState.history),
            notice: "Ignored this image.",
          });
        });
    }
  }, [navState, boxMode]);

  const onForward = react.useCallback(() => {
    if (boxMode) {
      return;
    }
    setNavState({
      ...navState,
      desiredImageId: getNextDesiredImageId(navState.queue),
      history: updateHistory(
        imageId,
        navState.labels.ignored
          ? "Ignored"
          : navState.labels.default
          ? "Unlabeled"
          : "Labeled",
        navState.history
      ),
      notice: "Advancing to next image.",
      status: "redirecting",
    });
  }, [imageId, navState.labels, navState]);

  const onBackward = react.useCallback(() => {
    if (boxMode || navState.history.length === 0) {
      return;
    }
    setNavState({
      ...navState,
      desiredImageId:
        navState.history.length > 0 ? navState.history[0].id.toString() : null,
      history: navState.history.slice(1),
      queue: [{ id: parseInt(imageId) }].concat(navState.queue),
      status: "redirecting",
    });
  }, [imageId, navState]);

  const setLabelGroup = react.useCallback(
    (updated) => {
      if (boxMode) {
        setDraftBox({ ...draftBox, labels: updated });
        setNavState({ ...navState, dirty: true });
      } else {
        setNavState({
          ...navState,
          dirty: true,
          labels: { ...navState.labels, image: updated, default: false },
        });
      }
    },
    [navState, draftBox]
  );

  react.useEffect(() => {
    const handler = async (event: KeyboardEvent) => {
      let target: react.MutableRefObject<HTMLButtonElement> = null;
      switch (event.key) {
        case "ArrowRight":
          target = nextButton;
          break;
        case "ArrowLeft":
          target = prevButton;
          break;
        case "Enter":
          if (!boxMode) {
            target = event.shiftKey ? ignoreButton : saveButton;
          } else {
            target = setBoxButton;
          }
          break;
        case "Backspace":
        case "Delete":
          target = boxMode ? deleteBoxButton : deleteButton;
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
    boxMode,
    setBoxButton,
    deleteBoxButton,
    nextButton,
    prevButton,
    saveButton,
    ignoreButton,
    deleteButton,
  ]);
  const redirect =
    navState.status === "redirecting" ? (
      <rrd.Redirect
        to={
          navState.desiredImageId
            ? `/projects/${projectId}/images/${navState.desiredImageId}`
            : `/projects/${projectId}`
        }
        push={true}
      />
    ) : null;

  if (!navState.labels || !project) {
    return redirect;
  }
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <LabelingStatus project={project}>
          {project.name} / Images / {imageId}
        </LabelingStatus>
      </mui.Grid>
      <mui.Grid container item xs={12} sm={3} direction="column" spacing={2}>
        <mui.Grid item>
          {redirect}
          <mui.Typography style={{ marginBottom: "10px" }} variant={"h6"}>
            {boxMode ? "Box-Level Labels" : "Image-Level Labels"}
          </mui.Typography>
          <LabelPanel
            configGroup={configGroup}
            labels={labelGroup}
            setLabelGroup={setLabelGroup}
          />
          <mui.Divider />
        </mui.Grid>
        <mui.Grid item>
          <mui.Typography variant={"h6"}>View Settings</mui.Typography>
          <mui.FormControl
            style={{ width: "100%", margin: "10px 0px" }}
            component="fieldset"
          >
            <mui.FormLabel component="legend">Zoom</mui.FormLabel>
            <mui.Slider
              style={{ margin: "0 5px" }}
              valueLabelDisplay="auto"
              aria-labelledby="zoom-slider"
              value={zoom}
              min={1}
              max={5}
              onChange={(event, value) => setZoom(value as number)}
            />
          </mui.FormControl>
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
            {boxMode ? (
              <ShortcutButton
                startIcon={"\u23CE"}
                onClick={onSetBox}
                ref={setBoxButton}
              >
                Set Box Label
              </ShortcutButton>
            ) : null}
            {boxMode ? (
              <ShortcutButton
                startIcon={"\u232B"}
                onClick={onDeleteBox}
                ref={deleteBoxButton}
              >
                Delete Box
              </ShortcutButton>
            ) : null}
            {boxMode ? null : (
              <ShortcutButton
                startIcon={"\u23CE"}
                disabled={!navState.labels.default && !navState.dirty}
                onClick={onSave}
                ref={saveButton}
              >
                Save
              </ShortcutButton>
            )}
            {boxMode ? null : (
              <ShortcutButton
                startIcon={"\u21E7\u23CE"}
                disabled={navState.labels.ignored}
                onClick={onIgnore}
                ref={ignoreButton}
              >
                Ignore
              </ShortcutButton>
            )}
            {boxMode ? null : (
              <ShortcutButton
                startIcon={<muic.KeyboardArrowRight />}
                ref={nextButton}
                onClick={onForward}
              >
                Next
              </ShortcutButton>
            )}
            {boxMode ? null : (
              <ShortcutButton
                startIcon={<muic.KeyboardArrowLeft />}
                onClick={onBackward}
                ref={prevButton}
                disabled={
                  navState.history.filter(
                    (entry) => entry.id !== parseInt(imageId)
                  ).length === 0
                }
              >
                Previous
              </ShortcutButton>
            )}
            {boxMode ? null : (
              <ShortcutButton
                disabled={navState.labels.default}
                startIcon={"\u232B"}
                ref={deleteButton}
                onClick={onDelete}
              >
                {navState.labels.ignored ? "Unignore" : "Remove Label"}
              </ShortcutButton>
            )}
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
            label="Advance on saving?"
          />
        </mui.Grid>
        <mui.Grid item>
          <mui.Divider style={{ marginBottom: "10px" }} />
          <mui.Typography variant={"h6"}>History</mui.Typography>
          <mui.Typography variant={"caption"}>
            Ten most recently reviewed images.
          </mui.Typography>
          <muidg.DataGrid
            rows={navState.history}
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
                field: "id",
                headerName: "ID",
                flex: 1,
                renderCell: (params: muidg.CellParams) => (
                  <rrd.Link
                    to={`/projects/${projectId}/images/${params.value}`}
                  >
                    {params.value}
                  </rrd.Link>
                ),
              },

              {
                field: "status",
                headerName: "Status",
                flex: 3,
              },
            ]}
          />
        </mui.Grid>
        <mui.Grid item>
          <mui.Link
            component={rrd.Link}
            variant={"body1"}
            to={`/projects/${projectId}`}
          >
            Return to Project Menu
          </mui.Link>
        </mui.Grid>
      </mui.Grid>
      <mui.Grid item xs={12} sm={9}>
        <Image
          onClick={
            common.hasBoxLabels(project.labelingConfiguration) ? click : null
          }
          onHover={hover}
          onSelectBox={selectBox}
          boxes={navState.labels.boxes}
          draftBox={draftBox}
          zoom={zoom}
        />

        <mui.Snackbar
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          open={navState.notice !== null}
          autoHideDuration={1500}
          onClose={closeNotice}
          message={navState.notice}
          action={
            <react.Fragment>
              <mui.IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={closeNotice}
              >
                <muic.Close fontSize="small" />
              </mui.IconButton>
            </react.Fragment>
          }
        />
        {navState.queue && navState.queue.length
          ? navState.queue.map((image, index) => (
              <img
                key={index}
                alt={`Background Load: ${image.id}`}
                src={common.getImageUrl(projectId, imageId)}
                style={{ width: 0, height: 0 }}
              />
            ))
          : null}
      </mui.Grid>
    </mui.Grid>
  );
};
