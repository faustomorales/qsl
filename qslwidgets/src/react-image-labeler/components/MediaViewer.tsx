import React from "react";
import { Box, Paper, CircularProgress, styled } from "@mui/material";
import RangeSlider from "./RangeSlider";
import GlobalLabelerContext from "./GlobalLabelerContext";
import ClickTarget from "./ClickTarget";
import { Dimensions, Point } from "./library/types";
import { pct2css } from "./library/utils";
import { useInterval, useMediaEvent } from "./library/hooks";

const MAP_SIZE = 96;

const MediaViewerBox = styled(Box)`
  & .minimap .mask-cursor {
    display: none;
  }

  & .minimap .box-text {
    visibility: hidden;
  }

  & .viewport .media img,
  .viewport .media video {
    vertical-align: bottom;
  }

  & .viewport .loading-placeholder .region {
    visibility: hidden;
  }

  & img,
  & video {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    image-rendering: pixelated;
  }
`;

const MediaViewer: React.FC<
  {
    media: {
      main: React.ReactNode;
      mini: React.ReactNode;
    };
    size?: Dimensions;
    controls?: React.ReactNode;
    loading?: boolean;
    maxViewHeight?: number;
    onMouseLeave?: () => void;
  } & React.ComponentProps<"div">
> = ({
  children,
  media,
  size,
  controls,
  loading,
  onMouseLeave,
  maxViewHeight = 512,
}) => {
  const { setFocus } = React.useContext(GlobalLabelerContext);
  const refs = {
    viewport: React.useRef<HTMLDivElement>(null),
    minimap: React.useRef<HTMLDivElement>(null),
    media: React.useRef<HTMLDivElement>(null),
  };
  const [state, setState] = React.useState({
    zoom: 100,
    pos: { x: 0, y: 0 } as Point,
    viewportSize: undefined as Dimensions | undefined,
  });
  React.useEffect(() => setState({ ...state, pos: { x: 0, y: 0 } }), [loading]);
  useInterval(
    () => {
      if (
        refs.viewport.current &&
        (!state.viewportSize ||
          refs.viewport.current.clientHeight !== state.viewportSize.height ||
          refs.viewport.current.clientWidth !== state.viewportSize.width)
      ) {
        setState({
          ...state,
          viewportSize: {
            width: refs.viewport.current.clientWidth,
            height: refs.viewport.current.clientHeight,
          },
        });
      }
    },
    100,
    true
  );
  React.useEffect(() => {
    if (!size) {
      return;
    }
    setState({
      ...state,
      zoom:
        100 *
        Math.min(
          (refs.viewport.current?.clientWidth || maxViewHeight) / size.width,
          maxViewHeight / size.height
        ),
    });
  }, [size]);
  const elementSize = React.useMemo(() => {
    return size
      ? {
          width: (size.width * state.zoom) / 100,
          height: (size.height * state.zoom) / 100,
        }
      : undefined;
  }, [state.zoom, size]);
  const minimapSize = React.useMemo(() => {
    if (!elementSize) return null;
    const scale = MAP_SIZE / Math.max(elementSize.width, elementSize.height);
    return {
      width: scale * elementSize.width,
      height: scale * elementSize.height,
    };
  }, [elementSize]);
  const margin = React.useMemo(() => {
    return state.viewportSize && elementSize
      ? {
          x:
            Math.min(state.viewportSize.width, elementSize.width) /
            elementSize.width /
            2,
          y:
            Math.min(state.viewportSize.height, elementSize.height) /
            elementSize.height /
            2,
        }
      : { x: 0, y: 0 };
  }, [state]);
  const clip = React.useMemo(() => {
    return {
      left: state.pos.x * (elementSize?.width || 0),
      top: state.pos.y * (elementSize?.height || 0),
    };
  }, [state.pos, elementSize]);
  const setPos = React.useCallback(
    (point) => {
      if (!margin) {
        console.error("Tried to set position without available data.");
        return;
      }
      setState({
        ...state,
        pos: {
          x: Math.min(Math.max(point.x, 0), Math.max(0, 1 - 2 * margin.x)),
          y: Math.min(Math.max(point.y, 0), Math.max(0, 1 - 2 * margin.y)),
        },
      });
    },
    [state, margin]
  );
  React.useEffect(() => {
    const offsetX = Math.min(1 - (state.pos.x + 2 * margin.x), 0);
    const offsetY = Math.min(1 - (state.pos.y + 2 * margin.y), 0);
    if (offsetX || offsetY) {
      setPos({ x: state.pos.x + offsetX, y: state.pos.y + offsetY });
    }
  }, [margin]);
  const onMapClick = useMediaEvent(
    (point) => {
      setFocus();
      setPos({ x: point.x - margin.x, y: point.y - margin.y });
    },
    refs.minimap,
    [setPos, margin, setFocus]
  );
  const onImageScroll = React.useCallback(
    (event: WheelEvent) => {
      if (!elementSize) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.ctrlKey) {
        setPos({
          x: state.pos.x + event.deltaX / elementSize.width,
          y: state.pos.y + event.deltaY / elementSize.height,
        });
      } else {
        setState({
          ...state,
          zoom: state.zoom - event.deltaY,
        });
      }
      return false;
    },
    [state, elementSize]
  );
  React.useEffect(() => {
    if (!refs.media.current) return;
    refs.media.current.addEventListener("wheel", onImageScroll, {
      passive: false,
    });
    return () => {
      if (!refs.media.current) return;
      refs.media.current.removeEventListener("wheel", onImageScroll);
    };
  }, [refs.media, onImageScroll]);
  return (
    <MediaViewerBox className="media-viewer">
      <Box sx={{ mb: 2 }}>
        <Box
          className="viewport"
          style={{
            position: "relative",
            overflow: "hidden",
            height: Math.min(
              maxViewHeight,
              elementSize ? elementSize.height : maxViewHeight
            ),
          }}
          ref={refs.viewport}
        >
          <ClickTarget />
          <Box>
            {loading ? (
              <CircularProgress
                style={{
                  position: "absolute",
                  left: "50%",
                  right: "50%",
                  top: "50%",
                  bottom: "50%",
                }}
              />
            ) : null}
            <Box
              className="media"
              onMouseLeave={loading ? undefined : onMouseLeave}
              ref={refs.media}
              style={{
                position: "absolute",
                overflow: "hidden",
                clip: `rect(${clip.top}px, auto, auto, ${clip.left}px)`,
                left: `${-clip.left}px`,
                top: `${-clip.top}px`,
              }}
            >
              <Box
                className="raw"
                style={
                  loading
                    ? { width: 0, height: 0, overflow: "hidden" }
                    : elementSize || { width: 0, height: 0 }
                }
              >
                {children}
                {media.main}
              </Box>
            </Box>
          </Box>
        </Box>
        {controls || null}
      </Box>
      {loading || !state.viewportSize || !elementSize ? (
        <Box sx={{ height: minimapSize?.height || MAP_SIZE }} />
      ) : (
        <Box
          className="controls"
          style={{
            display: "grid",
            gridTemplateColumns: `${minimapSize?.width || MAP_SIZE}px 1fr`,
            gridTemplateRows: "auto",
            gridTemplateAreas: '"minimap zoom"',
            gridColumnGap: 10,
          }}
        >
          <Paper
            className="minimap"
            style={{
              ...minimapSize,
              position: "relative",
            }}
            onClick={onMapClick}
          >
            {children}
            {media.mini}
            <div
              style={{
                outline: "2px solid red",
                outlineOffset: "-1px",
                position: "absolute",
                left: pct2css(state.pos.x),
                top: pct2css(state.pos.y),
                width: pct2css(
                  Math.min(
                    1 - state.pos.x,
                    state.viewportSize.width / elementSize.width
                  )
                ),
                height: pct2css(
                  Math.min(
                    1 - state.pos.y,
                    state.viewportSize.height / elementSize.height
                  )
                ),
              }}
            />
            <div
              ref={refs.minimap}
              className="hover-target"
              style={{
                position: "absolute",
                top: 0,
                ...minimapSize,
                display: "block",
              }}
            />
          </Paper>
          <RangeSlider
            name="Zoom"
            className={"zoom"}
            min={1}
            max={Math.max(500, state.zoom)}
            width={"100%"}
            value={state.zoom}
            onValueChange={(zoom) =>
              setState({
                ...state,
                zoom,
              })
            }
          />
        </Box>
      )}
    </MediaViewerBox>
  );
};

export default MediaViewer;
