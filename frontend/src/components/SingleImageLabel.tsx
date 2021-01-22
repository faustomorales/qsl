import * as rrd from "react-router-dom";
import { Context } from "./Context";
import * as common from "./common";
import * as sharedTypes from "./sharedTypes";
import * as react from "react";
import * as muic from "@material-ui/icons";
import * as mui from "@material-ui/core";
import * as muis from "@material-ui/styles";
import _ from "lodash";
import LabelPanel from "./LabelPanel";

const useStyles = muis.makeStyles((theme) => ({
  box: {
    position: "absolute",
    border: "5px solid black",
    backgroundColor: "rgba(255,255,255,0.5)",
    color: "black",
  },
  selectedBox: {
    border: "5px solid red",
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
            {labels2string(props.draftBox.labels)}
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
            {labels2string(box.labels)}
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
  const [nextImageId, setNextImageId] = react.useState(imageId);

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
      const desired = queueSize - existing.length + (nextImageId ? 0 : 1);
      fetch(
        `${apiUrl}/api/v1/projects/${projectId}/images?labeling_mode=1&limit=${desired}&max_labels=0&${exclusionString}`,
        { ...getHeaders }
      )
        .then((r) => r.json())
        .then((q) => {
          if (imageId) {
            setQueue(existing.concat(q));
          } else if (q.length > 0) {
            setNextImageId(q[0].id.toString());
            setQueue(existing.concat(q.slice(1)));
            setStatus("redirecting");
          } else {
            setNextImageId(null);
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

  const save = react.useCallback(() => {
    setStatus("saving");
    fetch(`${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`, {
      ...postHeaders,
      body: JSON.stringify(labels),
    }).then(() => {
      setNextImageId(queue.length > 0 ? queue[0].id.toString() : null);
      populate();
      setStatus("redirecting");
    });
  }, [labels, queue, populate]);

  const saveBox = react.useCallback(() => {
    setLabels({
      ...labels,
      boxes: labels.boxes.concat([draftBox2box(draftBox)]),
    });
    setDraftBox(null);
  }, [draftBox, labels]);

  const boxMode = draftBox && draftBox.fixed;
  let button: JSX.Element = null;
  if (status === "waiting" && imageId && nextImageId === imageId) {
    if (boxMode) {
      button = (
        <mui.Button onClick={save} startIcon={<muic.KeyboardReturn />}>
          Save Box
        </mui.Button>
      );
    } else {
      button = (
        <mui.Button onClick={save} startIcon={<muic.KeyboardReturn />}>
          Save
        </mui.Button>
      );
    }
  } else if (status === "saving") {
    button = <mui.Button disabled={true}>Saving</mui.Button>;
  } else if (
    status === "redirecting" &&
    nextImageId &&
    nextImageId !== imageId
  ) {
    button = (
      <rrd.Redirect
        to={`/projects/${projectId}/images/${nextImageId}`}
        push={true}
      />
    );
  } else if (status === "waiting" && !nextImageId) {
    button = <rrd.Redirect to={`/projects/${projectId}`} push={true} />;
  }
  return (
    <div>
      <rrd.Link to={`/projects/${projectId}`}>
        <mui.Typography variant="subtitle1">
          Back to project menu
        </mui.Typography>
      </rrd.Link>
      {labels ? (
        <Image
          onClick={
            common.hasBoxLabels(project.labelingConfiguration) ? click : null
          }
          onHover={hover}
          onSelectBox={selectBox}
          boxes={labels.boxes}
          draftBox={draftBox}
        />
      ) : null}
      {project && labels ? (
        <LabelPanel
          configGroup={
            boxMode
              ? project.labelingConfiguration.box
              : project.labelingConfiguration.image
          }
          labels={boxMode ? draftBox.labels : labels.image}
          onEnter={boxMode ? saveBox : save}
          onDel={() => (boxMode ? setDraftBox(null) : null)}
          setLabelGroup={(updated) => {
            boxMode
              ? setDraftBox({ ...draftBox, labels: updated })
              : setLabels({ ...labels, image: updated });
          }}
        />
      ) : null}
      {button}
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
