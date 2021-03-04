import * as rrd from "react-router-dom";
import { Context } from "./Context";
import * as common from "./common";
import * as sharedTypes from "./sharedTypes";
import * as react from "react";
import * as mui from "@material-ui/core";
import * as muic from "@material-ui/icons";
import * as muis from "@material-ui/styles";
import _ from "lodash";
import LabelPanel from "./LabelPanel";

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

const click2xy = (event: react.MouseEvent, img: HTMLImageElement) => {
  const { x, y, width, height } = img.getBoundingClientRect();
  return {
    x: (event.nativeEvent.pageX - x) / width,
    y: (event.nativeEvent.pageY - y) / height,
  };
};

const Image = (props: {
  boxes: sharedTypes.Box[];
  draftBox: DraftBox;
  onClick?: (event: MousePosition) => void;
  onHover: (event: MousePosition) => void;
  onSelectBox: (boxIdx: number, event: MousePosition) => void;
}) => {
  const classes = useStyles();
  const { apiUrl } = react.useContext(Context);
  const { projectId, imageId } = rrd.useRouteMatch<{
    projectId: string;
    imageId: string;
  }>().params;
  const ref = react.useRef<HTMLImageElement>();
  const onMouseMove = _.debounce((event: react.MouseEvent) => {
    props.onHover(click2xy(event, ref.current));
  }, 10);
  const onClick = (event: react.MouseEvent) => {
    if (!props.onClick) {
      return;
    }
    props.onClick(click2xy(event, ref.current));
  };
  return (
    <div>
      <div style={{ position: "relative", display: "inline-block" }}>
        <img
          ref={ref}
          src={`${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/file`}
          alt={`ID: ${imageId}`}
          onMouseMove={onMouseMove}
          onClick={onClick}
        />
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
          </div>
        ) : null}
        {props.boxes.map((box, index) => (
          <div
            onMouseMove={onMouseMove}
            className={classes.box}
            style={box2styles(box)}
            onClick={(event) => {
              props.onSelectBox(index, click2xy(event, ref.current));
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

export const SingleImageLabel = () => {
  // Get context variables.
  const { apiUrl, postHeaders, getHeaders, queueSize } = react.useContext(
    Context
  );
  const { projectId, imageId } = rrd.useRouteMatch<{
    projectId: string;
    imageId: string;
  }>().params;

  // Create state variables
  const [draftBox, setDraftBox] = react.useState<DraftBox>(null);
  const [labels, setLabels] = react.useState(null as sharedTypes.ImageLabels);
  const [project, setProject] = react.useState(null as sharedTypes.Project);
  const [queue, setQueue] = react.useState([] as sharedTypes.Image[]);
  const [status, setStatus] = react.useState(
    "initializing" as "initializing" | "waiting" | "saving" | "redirecting"
  );
  const [desiredImageId, setDesiredImageId] = react.useState(imageId);
  const [dirty, setDirty] = react.useState(false);
  const [notice, setNotice] = react.useState<string>(null);

  // Create calculated variables
  const boxMode = draftBox && draftBox.fixed;
  const configGroup = project
    ? boxMode
      ? project.labelingConfiguration.box
      : project.labelingConfiguration.image
    : null;
  const labelGroup = labels ? (boxMode ? draftBox.labels : labels.image) : null;

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
      } else if (draftBox.next === 2) {
        setDraftBox({
          ...draftBox,
          x2: pos.x,
          y2: pos.y,
          fixed: true,
          next: 1,
        });
      } else if (draftBox.next === 1) {
        setDraftBox({
          ...draftBox,
          x1: pos.x,
          y1: pos.y,
          fixed: true,
          next: 2,
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
        const selected = labels.boxes.splice(boxIdx, 1)[0];
        setDraftBox(box2draftBox(selected));
        setLabels({ ...labels, boxes: labels.boxes });
      } else {
        click(pos);
      }
    },
    [labels, draftBox]
  );

  // Implement backend API operations
  react.useEffect(() => {
    fetch(`${apiUrl}/api/v1/projects/${projectId}`, { ...getHeaders })
      .then((r) => r.json())
      .then(setProject);
  }, [projectId]);

  const populate = react.useCallback(() => {
    const existing = queue.filter((image) => image.id.toString() !== imageId);
    if (queueSize === existing.length) {
      setQueue(existing);
      setStatus("waiting");
    } else {
      const exclusionString = existing
        .concat(imageId ? [{ id: parseInt(imageId) }] : [])
        .map((image) => `exclude=${image.id}`)
        .join("&");
      const desired = queueSize - existing.length + (desiredImageId ? 0 : 1);
      fetch(
        `${apiUrl}/api/v1/projects/${projectId}/images?labeling_mode=1&limit=${desired}&max_labels=0&${exclusionString}`,
        { ...getHeaders }
      )
        .then((r) => r.json())
        .then((q) => {
          if (imageId) {
            setQueue(existing.concat(q));
          } else if (q.length > 0) {
            setDesiredImageId(q[0].id.toString());
            setQueue(existing.concat(q.slice(1)));
            setStatus("redirecting");
          } else {
            setDesiredImageId(null);
          }
          setStatus("waiting");
        });
    }
  }, [imageId]);

  react.useEffect(() => {
    populate();
    if (!imageId) {
      return;
    }
    fetch(`${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`, {
      ...getHeaders,
    })
      .then((r) => r.json())
      .then((labels) => {
        setLabels(labels);
        setStatus("waiting");
      });
  }, [imageId, populate]);

  // Create callbacks
  const onDel = react.useCallback(() => {
    if (boxMode) {
      setDraftBox(null);
    } else if (!labels.default) {
      fetch(`${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`, {
        ...getHeaders,
        method: "DELETE",
      })
        .then((r) => r.json())
        .then((updated) => {
          setLabels(updated);
          setDirty(false);
          setNotice("Deleted");
        });
    }
  }, [boxMode, labels]);

  const closeNotice = react.useCallback(() => setNotice(null), []);

  const advance = react.useCallback(() => {
    setDesiredImageId(queue.length > 0 ? queue[0].id.toString() : null);
    populate();
    setStatus("redirecting");
  }, [queue]);

  const onCtrlEnter = react.useCallback(() => {
    if (!boxMode) {
      setNotice("Advancing without saving.");
      advance();
    }
  }, [advance, boxMode]);

  const save = react.useCallback(() => {
    return fetch(
      `${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`,
      {
        ...postHeaders,
        body: JSON.stringify(labels),
      }
    )
      .then((r) => r.json())
      .then((updated) => {
        setLabels(updated);
        setDirty(false);
        setNotice("Saved");
      });
  }, [labels]);

  const onEnter = react.useCallback(() => {
    if (boxMode) {
      setLabels({
        ...labels,
        boxes: labels.boxes.concat([draftBox2box(draftBox)]),
      });
      setDraftBox(null);
      setDirty(true);
    } else {
      save().then(() => advance());
    }
  }, [draftBox, labels, queue, populate]);

  const onShiftEnter = react.useCallback(() => {
    if (boxMode) {
      return;
    }
    save();
  }, [save, boxMode]);

  const setLabelGroup = react.useCallback(
    (updated) => {
      if (boxMode) {
        setDraftBox({ ...draftBox, labels: updated });
      } else {
        setLabels({ ...labels, image: updated });
      }
      setDirty(true);
    },
    [draftBox, labels]
  );
  if (
    status === "redirecting" &&
    desiredImageId &&
    desiredImageId !== imageId
  ) {
    return (
      <rrd.Redirect
        to={`/projects/${projectId}/images/${desiredImageId}`}
        push={true}
      />
    );
  } else if (status === "waiting" && !desiredImageId) {
    return <rrd.Redirect to={`/projects/${projectId}`} push={true} />;
  }

  if (!labels || !project) {
    return null;
  }

  let actions: JSX.Element = null;
  if (boxMode) {
    actions = (
      <mui.ButtonGroup
        size="medium"
        color="primary"
        aria-label="acton button group"
      >
        <mui.Button onClick={onEnter}>{"\u23CE Set Box Label"}</mui.Button>
        <mui.Button onClick={onDel}>{"\u232B Delete Box"}</mui.Button>
      </mui.ButtonGroup>
    );
  } else {
    actions = (
      <mui.ButtonGroup
        size="medium"
        color="primary"
        aria-label="acton button group"
      >
        <mui.Button disabled={!labels.default && !dirty} onClick={onShiftEnter}>
          {labels.default && !dirty
            ? "\u21E7\u23CE Confirm Defaults"
            : "\u21E7 \u23CE Save"}
        </mui.Button>
        <mui.Button disabled={!labels.default && !dirty} onClick={onEnter}>
          {labels.default && !dirty
            ? "\u23CE Confirm and Advance"
            : "\u23CE Save and Advance"}
        </mui.Button>
        <mui.Button onClick={onCtrlEnter}>
          {dirty
            ? "^\u23CE Advance without Saving"
            : labels.default
            ? "^\u23CE Skip"
            : "^\u23CE Next"}
        </mui.Button>
        {labels.default ? null : (
          <mui.Button onClick={onDel}>{"\u232B Delete Labels"}</mui.Button>
        )}
      </mui.ButtonGroup>
    );
  }
  return (
    <div>
      <Image
        onClick={
          common.hasBoxLabels(project.labelingConfiguration) ? click : null
        }
        onHover={hover}
        onSelectBox={selectBox}
        boxes={labels.boxes}
        draftBox={draftBox}
      />
      <LabelPanel
        configGroup={configGroup}
        labels={labelGroup}
        onEnter={onEnter}
        onShiftEnter={onShiftEnter}
        onCtrlEnter={onCtrlEnter}
        onDel={onDel}
        setLabelGroup={setLabelGroup}
      />
      {actions}
      <mui.Link
        style={{ marginLeft: "10px" }}
        component={rrd.Link}
        variant={"body1"}
        to={`/projects/${projectId}`}
      >
        Return to Project Menu
      </mui.Link>
      <mui.Snackbar
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        open={notice !== null}
        autoHideDuration={1000}
        onClose={closeNotice}
        message={notice}
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
      {queue && queue.length
        ? queue.map((image) => (
            <img
              key={image.id}
              alt={`Background Load: ${image.id}`}
              src={`${apiUrl}/api/v1/projects/${projectId}/images/${image.id}/file`}
              style={{ width: 0, height: 0 }}
            />
          ))
        : null}
    </div>
  );
};
