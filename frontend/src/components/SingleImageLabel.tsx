import * as common from "./common";
import * as sharedTypes from "./sharedTypes";
import * as react from "react";
import * as mui from "@material-ui/core";
import * as muic from "@material-ui/icons";
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

interface DraftBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points: sharedTypes.Point[];
  next: 1 | 2;
  fixed: boolean;
  id: number;
  labels: sharedTypes.LabelGroup;
}

interface MousePosition {
  x: number;
  y: number;
}

const snap2point = (point: sharedTypes.Point, anchor: sharedTypes.Point) => {
  const distance = Math.sqrt(
    Math.pow(point.y - anchor.y, 2) + Math.pow(point.x - anchor.x, 2)
  );
  return distance < 0.001 ? anchor : point;
};

const float2css = (float: number) => `${float * 100}%`;
const draftBox2box = (box: DraftBox): sharedTypes.Box => {
  const isPolygon = box.points && box.points.length > 0;
  // If it's a polygon with two identical points, reduce it
  // down to a single point.
  const points =
    isPolygon &&
    box.points.length === 2 &&
    box.points[0].x === box.points[1].x &&
    box.points[0].y === box.points[1].y
      ? box.points.slice(0, 1)
      : box.points;
  return {
    x: isPolygon ? null : Math.min(box.x1, box.x2),
    y: isPolygon ? null : Math.min(box.y1, box.y2),
    w: isPolygon ? null : Math.abs(box.x2 - box.x1),
    h: isPolygon ? null : Math.abs(box.y2 - box.y1),
    id: box.id,
    labels: box.labels,
    points: points,
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
    next: null,
    fixed: true,
    points: box.points,
  };
};

const labels2string = (labels: sharedTypes.LabelGroup): string =>
  Object.values(labels.single)
    .filter((l) => l !== null)
    .concat(Object.values(labels.text).filter((l) => l !== null))
    .join(", ");

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

const Box = (props: {
  box?: sharedTypes.Box;
  draftBox?: DraftBox;
  onClick: (event: react.MouseEvent) => void;
  onMouseMove: (event: react.MouseEvent) => void;
}) => {
  if (!props.draftBox && !props.box) {
    // There's nothing here.
    return null;
  }
  const isPolygon =
    (props.box && props.box.points !== null) ||
    (props.draftBox && props.draftBox.points !== null);
  if (
    !isPolygon &&
    props.draftBox &&
    !(
      props.draftBox.x1 &&
      props.draftBox.x2 &&
      props.draftBox.y1 &&
      props.draftBox.y2
    )
  ) {
    // It's a draft box and we don't have the needed points.
    return null;
  }
  const box = props.draftBox ? draftBox2box(props.draftBox) : props.box;
  if (isPolygon && box.points.length === 0) {
    // It's a polygon and we don't have enough points.
    return null;
  }
  const color = props.draftBox ? "red" : "blue";
  const xmin = !isPolygon
    ? box.x
    : Math.min.apply(
        Math,
        box.points.map((p) => p.x)
      );
  const ymin = !isPolygon
    ? box.y
    : Math.min.apply(
        Math,
        box.points.map((p) => p.y)
      );
  const xmax = !isPolygon
    ? box.x + box.w
    : Math.max.apply(
        Math,
        box.points.map((p) => p.x)
      );
  const ymax = !isPolygon
    ? box.y + box.h
    : Math.max.apply(
        Math,
        box.points.map((p) => p.y)
      );
  const width = !isPolygon ? box.w : xmax - xmin;
  const height = !isPolygon ? box.h : ymax - ymin;
  let shape: react.ReactElement = null;
  if (isPolygon && width > 0 && height > 0) {
    shape = (
      <svg>
        {Array.from(Array(box.points.length - 1).keys()).map((index) => (
          <line
            key={index}
            stroke={color}
            strokeWidth="4"
            x1={float2css((box.points[index].x - xmin) / width)}
            y1={float2css((box.points[index].y - ymin) / height)}
            x2={float2css((box.points[index + 1].x - xmin) / width)}
            y2={float2css((box.points[index + 1].y - ymin) / height)}
          />
        ))}
      </svg>
    );
  } else if (isPolygon) {
    shape = (
      <rect transform="translate(-5, -5)" width={10} height={10} fill={color} />
    );
  } else {
    shape = (
      <rect
        width={"100%"}
        height={"100%"}
        stroke={color}
        fill="none"
        strokeWidth="4"
      />
    );
  }
  let indicator: react.ReactElement = null;
  if (
    props.draftBox &&
    props.draftBox.fixed &&
    !isPolygon &&
    props.draftBox.next !== null
  ) {
    const invertedY = props.draftBox.y1 > props.draftBox.y2;
    const invertedX = props.draftBox.x1 > props.draftBox.x2;
    const top =
      (props.draftBox.next === 1 && !invertedY) ||
      (props.draftBox.next === 2 && invertedY);
    const left =
      (props.draftBox.next === 1 && !invertedX) ||
      (props.draftBox.next === 2 && invertedX);
    indicator = (
      <rect
        x={left ? "0%" : "100%"}
        y={top ? "0%" : "100%"}
        transform="translate(-5, -5)"
        width={10}
        height={10}
        fill="red"
      />
    );
  } else if (
    props.draftBox &&
    isPolygon &&
    props.draftBox.next !== null &&
    width > 0 &&
    height > 0
  ) {
    indicator = (
      <rect
        x={float2css((box.points[0].x - xmin) / width)}
        y={float2css((box.points[0].y - ymin) / height)}
        transform="translate(-5, -5)"
        width={10}
        height={10}
        fill="red"
      />
    );
  }
  return (
    <svg
      width={width > 0 ? float2css(width) : 10}
      height={height > 0 ? float2css(height) : 10}
      onClick={props.onClick}
      onMouseMove={props.onMouseMove}
      style={{
        position: "absolute",
        left: float2css(xmin),
        top: float2css(ymin),
        overflow: "visible",
      }}
    >
      <text
        x={5}
        y={5}
        fill={color}
        fontFamily="Roboto,Helvetica,Arial,sans-serif"
        alignmentBaseline="hanging"
      >
        {labels2string(box.labels)}
      </text>
      {shape}
      {indicator}
    </svg>
  );
};

const Image = (props: {
  boxes: sharedTypes.Box[];
  draftBox: DraftBox;
  zoom: number;
  onClick?: (event: MousePosition) => void;
  onHover: (event: MousePosition) => void;
  onSelectBox: (boxIdx: number, event: MousePosition) => void;
}) => {
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
        <Box
          onMouseMove={onMouseMove}
          onClick={(event) =>
            props.onSelectBox(null, click2xy(event, ref.current, props.zoom))
          }
          draftBox={props.draftBox}
        />
        <mui.Paper>
          {props.boxes.map((box, index) => (
            <Box
              box={box}
              key={index}
              onMouseMove={onMouseMove}
              onClick={(event) =>
                props.onSelectBox(
                  index,
                  click2xy(event, ref.current, props.zoom)
                )
              }
            />
          ))}
          <img
            onClick={onClick}
            onMouseMove={onMouseMove}
            ref={ref}
            src={common.getImageUrl(projectId, imageId)}
            alt={`ID: ${imageId}`}
            style={{ display: "block", zoom: props.zoom }}
          />
        </mui.Paper>
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
    usePolygon: false,
    labels: null as sharedTypes.ImageLabels,
    advanceOnSave: true,
    dirty: false,
    notice: null as string,
    history: [] as HistoryEntry[],
    queue: [] as sharedTypes.Image[],
    unlabeledOnly: true,
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
          x1: navState.usePolygon ? null : pos.x,
          y1: navState.usePolygon ? null : pos.y,
          x2: null,
          y2: null,
          labels: common.buildEmptyLabelGroup(
            project.labelingConfiguration.box
          ),
          id: null,
          fixed: navState.usePolygon ? true : false,
          points: navState.usePolygon
            ? [
                {
                  x: pos.x,
                  y: pos.y,
                },
              ]
            : null,
          next: 2,
        });
      } else if (draftBox && draftBox.next !== null) {
        const isPolygon = draftBox.points && draftBox.points.length > 0;
        const snapped = isPolygon
          ? snap2point({ x: pos.x, y: pos.y }, draftBox.points[0])
          : null;
        setDraftBox({
          ...draftBox,
          x1: !isPolygon ? (draftBox.next === 1 ? pos.x : draftBox.x1) : null,
          y1: !isPolygon ? (draftBox.next === 1 ? pos.y : draftBox.y1) : null,
          x2: !isPolygon ? (draftBox.next === 2 ? pos.x : draftBox.x2) : null,
          y2: !isPolygon ? (draftBox.next === 2 ? pos.y : draftBox.y2) : null,
          fixed: true,
          next: draftBox.next === 1 ? 2 : 1,
          points: isPolygon ? draftBox.points.concat([snapped]) : null,
        });
      } else {
        setNavState({
          ...navState,
          labels: {
            ...navState.labels,
            boxes: [draftBox2box(draftBox)].concat(navState.labels.boxes),
            default: false,
          },
        });
        setDraftBox(null);
      }
    },
    [navState, draftBox, project]
  );

  const hover = react.useCallback(
    (pos: MousePosition) => {
      if (
        draftBox &&
        !draftBox.points &&
        !draftBox.fixed &&
        draftBox.next !== null
      ) {
        setDraftBox({ ...draftBox, x2: pos.x, y2: pos.y });
      }
      // Handling hovers for polygons is a bit tough, so
      // deferring on that for now.
    },
    [navState, draftBox]
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
      } else if (draftBox && draftBox.next !== null) {
        click(pos);
      } else if (draftBox && draftBox.next === null) {
        // We're de-selecting this box and moving it to the
        // bottom of the pile.
        setNavState({
          ...navState,
          labels: {
            ...navState.labels,
            boxes: [draftBox2box(draftBox)].concat(navState.labels.boxes),
            default: false,
          },
        });
        setDraftBox(null);
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
            navState.queueSize - existing.length,
            true,
            navState.unlabeledOnly ? true : false,
            navState.unlabeledOnly ? 0 : -1
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
    setNavState({ ...navState, dirty: true });
    setDraftBox(null);
  }, [navState]);

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
          target = boxMode ? deleteBoxButton : null;
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
  const drawerWidth = 250;
  return (
    <div style={{ display: "flex" }}>
      <mui.CssBaseline />
      <LabelingStatus project={project} position={"fixed"}>
        <rrd.Link to={`/`}>QSL</rrd.Link> /{" "}
        <rrd.Link to={`/projects/${projectId}`}>{project.name}</rrd.Link> /
        Images / {imageId}
      </LabelingStatus>
      <mui.Drawer variant="permanent" style={{ flexShrink: 0 }}>
        <mui.Box style={{ padding: "10px", width: drawerWidth }}>
          <mui.Toolbar />
          {redirect}
          <mui.Typography style={{ marginBottom: "10px" }} variant={"h6"}>
            {boxMode ? "Box-Level Labels" : "Image-Level Labels"}
          </mui.Typography>
          <LabelPanel
            configGroup={configGroup}
            labels={labelGroup}
            setLabelGroup={setLabelGroup}
          />
          <mui.Divider style={{ marginTop: "10px" }} />
          <mui.Typography variant={"h6"}>View Settings</mui.Typography>
          <mui.FormControl
            style={{ margin: "10px 0px", width: "100%" }}
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
          <mui.FormControlLabel
            control={
              <mui.Checkbox
                checked={navState.usePolygon}
                onChange={(event, usePolygon) =>
                  setNavState({ ...navState, usePolygon })
                }
                name="usePolygon"
              />
            }
            label="Use polygons instead of boxes?"
          />
          <mui.FormControlLabel
            control={
              <mui.Checkbox
                checked={navState.unlabeledOnly}
                onChange={(event, unlabeledOnly) =>
                  setNavState({ ...navState, unlabeledOnly })
                }
                name="unlabeledOnly"
              />
            }
            label="Show only unlabeled / unignored images?"
          />
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
                renderCell: (params: muidg.GridCellParams) => (
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
        </mui.Box>
      </mui.Drawer>
      <div
        style={{ width: `calc(100%-${drawerWidth}px`, marginLeft: drawerWidth }}
      >
        <mui.Toolbar />
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
                key={image.id}
                alt={`Background Load: ${image.id}`}
                src={common.getImageUrl(projectId, image.id)}
                style={{ width: 0, height: 0 }}
              />
            ))
          : null}
      </div>
    </div>
  );
};
