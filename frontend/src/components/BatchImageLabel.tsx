import * as sharedTypes from "./sharedTypes";
import LabelPanel from "./LabelPanel";
import { Context } from "./Context";

import * as react from "react";
import * as rrd from "react-router-dom";
import * as mui from "@material-ui/core";
import * as muic from "@material-ui/icons";
import * as muis from "@material-ui/core/styles";
import * as common from "./common";

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
  images: sharedTypes.Image[];
  projectId: string;
  selected: number[];
  thumbnailSize: number;
  setSelected: (selected: number[]) => void;
}) => {
  const { apiUrl } = react.useContext(Context);
  const { selected, setSelected } = props;
  const classes = useStyles();
  const toggleImage = react.useCallback(
    (id) => {
      if (selected.indexOf(id) >= 0) {
        setSelected(selected.filter((currentId) => currentId !== id));
      } else {
        setSelected(selected.concat([id]));
      }
    },
    [selected, setSelected]
  );

  const getIcon = (image: sharedTypes.Image) => {
    const isSelected = props.selected.indexOf(image.id) >= 0;
    return (
      <mui.IconButton
        className={`${classes.checkbox} ${
          isSelected ? classes.checked : classes.unchecked
        }`}
        onClick={() => toggleImage(image.id)}
        aria-label={`selected ${image.id}`}
      >
        {isSelected ? <muic.CheckBox /> : <muic.CheckBoxOutlineBlank />}
      </mui.IconButton>
    );
  };
  return (
    <mui.ImageList
      rowHeight={props.thumbnailSize}
      cols={Math.ceil(800 / props.thumbnailSize)}
    >
      {props.images.map((image, imageIdx) => (
        <mui.ImageListItem key={image.id} cols={1}>
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
            src={`${apiUrl}/api/v1/projects/${props.projectId}/images/${image.id}/file`}
            alt={`ID: ${image.id}`}
            onClick={() => toggleImage(image.id)}
          />
          {getIcon(image)}
        </mui.ImageListItem>
      ))}
    </mui.ImageList>
  );
};

export const BatchImageLabel = () => {
  // Get context variables.
  const { apiUrl, postHeaders, getHeaders } = react.useContext(Context);
  const { projectId, imageIds } = rrd.useRouteMatch<{
    projectId: string;
    imageIds: string;
  }>().params;

  // Set state variables.
  const [queueSize, setQueueSize] = react.useState(20);
  const [thumbnailSize, setThumbnailSize] = react.useState(160);
  const [project, setProject] = react.useState<sharedTypes.Project>(null);
  const [labels, setLabels] = react.useState<sharedTypes.ImageLabels>(null);
  const [queue, setQueue] = react.useState<sharedTypes.Image[]>(
    imageIds
      ? imageIds.split(",").map((id) => {
          return { id: parseInt(id) };
        })
      : []
  );
  const [nextQueue, setNextQueue] = react.useState<sharedTypes.Image[]>([]);
  const [selected, setSelected] = react.useState<number[]>(
    imageIds ? imageIds.split(",").map((id) => parseInt(id)) : []
  );
  const [status, setStatus] = react.useState<
    "waiting" | "redirecting" | "populating"
  >("waiting");

  // Implement backend API operations.
  react.useEffect(() => {
    fetch(`${apiUrl}/api/v1/projects/${projectId}`, { ...getHeaders })
      .then((r) => r.json())
      .then(setProject);
  }, [projectId]);

  react.useEffect(() => {
    if (!queue || queue.length === 0) {
      return;
    }
    fetch(
      `${apiUrl}/api/v1/projects/${projectId}/images/${queue[0].id}/labels`,
      { ...getHeaders }
    )
      .then((r) => r.json())
      .then((labels) => {
        setLabels(labels);
        setStatus("waiting");
      });
  }, [queue]);

  react.useEffect(() => {
    // This effect accounts for the user navigating
    // back and forth in the browser.
    const expectedImageIds = queue
      ? queue.map((image) => image.id).join(",")
      : null;
    if (imageIds && expectedImageIds && expectedImageIds !== imageIds) {
      const ids = imageIds.split(",");
      setQueue(
        ids.map((id) => {
          return { id: parseInt(id) };
        })
      );
      setSelected(ids.map((id) => parseInt(id)));
    }
  }, [imageIds]);

  const selectAll = react.useCallback(() => {
    setSelected(queue.map((image) => image.id));
  }, [queue]);

  const selectNone = react.useCallback(() => setSelected([]), []);

  const populateQueue = react.useCallback(() => {
    if (nextQueue === null) {
      setQueue(nextQueue);
      setStatus("redirecting");
      return;
    }
    if (status === "populating") {
      return;
    }
    setStatus("populating");
    const querySize = nextQueue.length > 0 ? queueSize : 2 * queueSize;
    const exclusionString = (nextQueue ? nextQueue : [])
      .concat(queue ? queue : [])
      .map((image) => `exclude=${image.id}`)
      .join("&");
    fetch(
      `${apiUrl}/api/v1/projects/${projectId}/images?shuffle=1&limit=${querySize}&max_labels=0&${exclusionString}`,
      { ...getHeaders }
    )
      .then((r) => r.json())
      .then((response: sharedTypes.Image[]) => {
        if (nextQueue.length === 0) {
          const responseQueue = response.slice(0, queueSize);
          const responseNextQueue = response.slice(queueSize);
          setQueue(responseQueue);
          setNextQueue(responseNextQueue.length > 0 ? responseNextQueue : null);
          setSelected(
            responseQueue.length > 0
              ? responseQueue.map((image) => image.id)
              : null
          );
          setStatus("redirecting");
        } else {
          setQueue(nextQueue);
          setSelected(
            nextQueue.length > 0 ? nextQueue.map((image) => image.id) : null
          );
          setNextQueue(response.length > 0 ? response : null);
          setStatus("redirecting");
        }
      });
  }, [queueSize, status, projectId, nextQueue]);

  react.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === "A") {
        selectNone();
      } else if (event.ctrlKey && !event.shiftKey && event.key === "a") {
        selectAll();
      }
    };
    document.addEventListener("keydown", handler, false);
    return () => {
      document.removeEventListener("keydown", handler, false);
    };
  }, [selectNone, selectAll]);

  const save = react.useCallback(() => {
    const filtered = queue.filter((image) => selected.indexOf(image.id) < 0);
    Promise.all(
      queue
        .filter((image) => selected.indexOf(image.id) >= 0)
        .map((image) =>
          fetch(
            `${apiUrl}/api/v1/projects/${projectId}/images/${image.id}/labels`,
            { ...postHeaders, body: JSON.stringify(labels) }
          ).then((r) => r.json())
        )
    ).then(() => {
      if (filtered.length > 0) {
        setQueue(filtered);
        setSelected([]);
      } else {
        populateQueue();
      }
      setStatus("redirecting");
    });
  }, [labels, projectId, selected, queue]);
  let redirect: JSX.Element = null;
  const expectedImageIds = queue
    ? queue.map((image) => image.id).join(",")
    : null;
  if (!queue) {
    // There are no remaining images to label.
    return <rrd.Redirect to={`/projects/${projectId}`} push={true} />;
  } else if (queue.length === 0) {
    // The queue hasn't been initialized.
    populateQueue();
  } else if (expectedImageIds !== imageIds && status === "redirecting") {
    // We're not at the right URL.
    redirect = (
      <rrd.Redirect
        to={`/projects/${projectId}/batches/${expectedImageIds}`}
        push={true}
      />
    );
  }
  if (!project) {
    return null;
  }
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <rrd.Link to={`/projects/${projectId}`}>
          <mui.Typography variant="subtitle1">
            Back to project menu
          </mui.Typography>
        </rrd.Link>
        {common.hasBoxLabels(project.labelingConfiguration) ? (
          <mui.Grid container direction="row" alignItems="center" spacing={1}>
            <mui.Grid item>
              <muic.Warning />
            </mui.Grid>
            <mui.Grid item>
              <mui.Typography variant="body1">
                This project has box-level labels which will be overwritten in
                batch mode.
              </mui.Typography>
            </mui.Grid>
          </mui.Grid>
        ) : null}
      </mui.Grid>
      <mui.Grid item xs={6}>
        <mui.Typography id="batch-size-selector" gutterBottom>
          Target Batch Size
        </mui.Typography>
        <mui.Slider
          value={queueSize}
          aria-labelledby="batch-size-selector"
          valueLabelDisplay="auto"
          onChange={(event, value) => setQueueSize(value as number)}
          step={10}
          marks
          min={10}
          max={110}
        />
      </mui.Grid>
      <mui.Grid item xs={6}>
        <mui.Typography id="batch-size-selector" gutterBottom>
          Thumbnail Size
        </mui.Typography>
        <mui.Slider
          value={thumbnailSize}
          aria-labelledby="batch-size-selector"
          valueLabelDisplay="auto"
          onChange={(event, value) => setThumbnailSize(value as number)}
          step={20}
          marks
          min={160}
          max={500}
        />
      </mui.Grid>
      <mui.Grid item xs={12}>
        {selected && queue ? (
          <BatchImageGrid
            images={queue}
            thumbnailSize={thumbnailSize}
            projectId={projectId}
            setSelected={setSelected}
            selected={selected}
          />
        ) : null}
        {labels && project ? (
          <LabelPanel
            configGroup={project.labelingConfiguration.image}
            labels={labels.image}
            onEnter={save}
            setLabelGroup={(labels) =>
              setLabels({
                boxes: [],
                image: labels,
                default: false,
                ignored: false,
              })
            }
          />
        ) : null}
      </mui.Grid>
      <mui.Grid item>
        <mui.Button
          disabled={selected.length === 0}
          onClick={save}
          startIcon={<muic.KeyboardReturn />}
        >
          Save
        </mui.Button>
        <mui.Button
          disabled={selected.length === queue.length}
          onClick={selectAll}
        >
          Select All (Ctrl+A)
        </mui.Button>
        <mui.Button disabled={selected.length === 0} onClick={selectNone}>
          Select None (Ctrl+Shift+A)
        </mui.Button>
        {redirect}
      </mui.Grid>
    </mui.Grid>
  );
};
