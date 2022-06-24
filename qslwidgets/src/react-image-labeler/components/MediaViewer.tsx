import React from "react";
import { Box, Paper, CircularProgress, styled } from "@mui/material";
import RangeSlider from "./RangeSlider";
import GlobalLabelerContext from "./GlobalLabelerContext";
import ClickTarget from "./ClickTarget";
import { Dimensions, Point, MediaLoadState } from "./library/types";
import { pct2css } from "./library/utils";
import {
  useInterval,
  useMediaEvent,
  convertCoordinates,
} from "./library/hooks";
import { useGesture } from "@use-gesture/react";

const MAP_SIZE = 128;

const MediaViewerBox = styled(Box)`
  & .minimap .mask-cursor {
    display: none;
  }

  & .minimap .region text {
    visibility: hidden;
  }

  & .viewport img,
  .viewport video {
    vertical-align: bottom;
  }

  & .viewport .loading-placeholder .region {
    visibility: hidden;
  }

  & img,
  & video {
    max-width: none;
    max-height: none;
    image-rendering: pixelated;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    user-drag: none;
  }
`;

const MediaViewer: React.FC<
  {
    media: {
      main: React.ReactNode;
      mini: React.ReactNode;
    };
    cursor?: string;
    size?: Dimensions;
    controls?: React.ReactNode;
    loadState: MediaLoadState;
    onMouseLeave?: () => void;
  } & React.ComponentProps<"div">
> = ({ children, media, size, controls, loadState, cursor, onMouseLeave }) => {
  const { setFocus, maxViewHeight } = React.useContext(GlobalLabelerContext);
  const refs = {
    viewport: React.useRef<HTMLDivElement>(null),
    minimap: React.useRef<HTMLDivElement>(null),
    media: React.useRef<HTMLDivElement>(null),
  };
  const [state, setState] = React.useState({
    zoom: 1.0,
    initialZoom: 1.0,
    pos: { x: 0, y: 0 } as Point,
    minimapSize: { width: MAP_SIZE, height: MAP_SIZE },
    zoomInitialized: false,
  });
  const [dragging, setDragging] = React.useState(false);
  const [maxViewWidth, setMaxViewWidth] = React.useState(maxViewHeight);
  React.useEffect(() => {
    if (loadState === "loading") {
      setState({ ...state, pos: { x: 0, y: 0 }, zoomInitialized: false });
    } else if (
      loadState == "loaded" &&
      size &&
      !state.zoomInitialized &&
      maxViewWidth > 0
    ) {
      const minimapScale = MAP_SIZE / Math.max(size.width, size.height);
      const initialZoom = Math.min(
        maxViewWidth / size.width,
        maxViewHeight / size.height
      );
      setState({
        ...state,
        zoomInitialized: true,
        initialZoom,
        zoom: initialZoom,
        minimapSize: {
          width: minimapScale * size.width,
          height: minimapScale * size.height,
        },
      });
    }
  }, [loadState, size, maxViewWidth]);
  useInterval(
    () => {
      if (
        refs.viewport.current &&
        (!maxViewWidth || refs.viewport.current.clientWidth !== maxViewWidth)
      ) {
        setMaxViewWidth(refs.viewport.current.clientWidth);
      }
    },
    100,
    true,
    [maxViewWidth]
  );
  const contentSizes = React.useMemo(() => {
    if (!size) {
      return;
    }
    const zoomed = {
      width: state.zoom * size.width,
      height: state.zoom * size.height,
    };
    const viewport = {
      width: Math.min(maxViewWidth, zoomed.width),
      height: Math.min(maxViewHeight, zoomed.height),
    };
    return {
      raw: size,
      zoomed,
      viewport,
      margin: {
        width: viewport.width / zoomed.width / 2,
        height: viewport.height / zoomed.height / 2,
      },
    };
  }, [size, maxViewWidth, maxViewHeight, state.zoom]);
  const onMapClick = useMediaEvent(
    (point) => {
      setFocus();
      if (!contentSizes) {
        throw `Failed to process minimap position.`;
      }
      setState({
        ...state,
        pos: {
          x: Math.max(point.x - contentSizes.margin.width, 0),
          y: Math.max(point.y - contentSizes.margin.height, 0),
        },
      });
    },
    refs.minimap,
    [setFocus, state, contentSizes]
  );
  const onImageScroll = React.useCallback(
    (event: {
      deltaX: number;
      deltaY: number;
      ctrlKey: boolean;
      preventDefault?: () => void;
      stopPropagation?: () => void;
      pageX?: number;
      pageY?: number;
      cursor?: Point;
    }) => {
      if (!contentSizes) return;
      event.preventDefault ? event.preventDefault() : null;
      event.stopPropagation ? event.stopPropagation() : null;
      if (!event.ctrlKey) {
        setState({
          ...state,
          pos: {
            x: Math.max(
              state.pos.x + event.deltaX / contentSizes.zoomed.width,
              0
            ),
            y: Math.max(
              state.pos.y + event.deltaY / contentSizes.zoomed.height,
              0
            ),
          },
        });
      } else {
        const center =
          event.cursor ||
          (event.pageX && event.pageY
            ? convertCoordinates(
                {
                  x: event.pageX,
                  y: event.pageY,
                },
                refs.media.current
              )
            : null);
        const newZoom = Math.max(
          state.zoom - event.deltaY / (2 * 100),
          10 / Math.min(contentSizes.raw.width, contentSizes.raw.height)
        );
        let newPos: Point;
        if (center) {
          newPos = {
            x: Math.max(
              center.x - (state.zoom * (center.x - state.pos.x)) / newZoom,
              0
            ),
            y: Math.max(
              center.y - (state.zoom * (center.y - state.pos.y)) / newZoom,
              0
            ),
          };
        } else {
          newPos = state.pos;
        }
        setState({
          ...state,
          zoom: newZoom,
          pos: newPos,
        });
      }
      setFocus();
      return false;
    },
    [state, contentSizes]
  );
  const bind = useGesture(
    {
      onDrag: ({ delta: [deltaX, deltaY] }) => {
        if (deltaX !== 0 || deltaY !== 0) {
          onImageScroll({
            deltaX: -deltaX,
            deltaY: -deltaY,
            ctrlKey: false,
          });
          setDragging(true);
        }
      },
      onDragEnd: () => setTimeout(() => setDragging(false), 250),
      onPinch: (event) => {
        if (event.memo && event.memo > 0 && contentSizes) {
          const cursor = convertCoordinates(
            {
              x: event.origin[0] + window.scrollX,
              y: event.origin[1] + window.scrollY,
            },
            refs.media.current
          );
          onImageScroll({
            deltaX: 0,
            deltaY: event.memo - event.da[0],
            ctrlKey: true,
            cursor,
          });
        }
        return event.last ? -1 : event.da[0];
      },
    },
    {
      drag: {
        preventDefault: true,
      },
    }
  );
  // Do this instead of onWheel in order to
  // make it non-passive.
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
  const zoomProps = React.useMemo(() => {
    return {
      marks: [
        { value: 100, label: "Full Size" },
        { value: state.initialZoom * 100, label: "Fit" },
      ],
      min: Math.min(1, Math.round(100 * state.zoom)),
      max: Math.max(500, Math.round(100 * state.zoom)),
      value: Math.round(100 * state.zoom),
    };
  }, [state.zoom, state.initialZoom]);
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
              contentSizes?.zoomed.height || maxViewHeight
            ),
          }}
          ref={refs.viewport}
        >
          <ClickTarget />
          {loadState == "loading" ? (
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
            ref={refs.media}
            {...bind()}
            onMouseLeave={loadState == "loaded" ? onMouseLeave : undefined}
            style={
              loadState === "loaded"
                ? ({
                    "--media-viewer-scale": state.zoom,
                    transform: `scale(${state.zoom}) translate(${pct2css(
                      -state.pos.x
                    )}, ${pct2css(-state.pos.y)})`,
                    "--media-viewer-dragging": dragging ? 1 : 0,
                    transformOrigin: "0 0",
                    position: "absolute",
                    touchAction: "none",
                    cursor: dragging ? "grab" : cursor,
                  } as React.CSSProperties)
                : { width: 0, height: 0, overflow: "hidden" }
            }
          >
            {loadState === "loaded" ? children : null}
            {media.main}
          </Box>
        </Box>
      </Box>
      <Box
        className="controls"
        style={{
          display: "grid",
          gridTemplateColumns: `${state.minimapSize.width}px 1fr`,
          gridTemplateRows: "auto",
          gridTemplateAreas: '"minimap zoom"',
          gridColumnGap: 10,
          alignItems: "center",
        }}
      >
        <Paper
          className="minimap"
          style={{
            ...state.minimapSize,
            position: "relative",
          }}
          onClick={onMapClick}
        >
          {loadState === "loaded" && size ? (
            <div style={{ width: "100%", height: "100%" }}>
              <div
                style={{
                  transform: `scale(${state.minimapSize.width / size.width})`,
                  transformOrigin: "0 0",
                }}
              >
                {media.mini}
              </div>
              {children}
              {contentSizes ? (
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
                        contentSizes.viewport.width / contentSizes.zoomed.width
                      )
                    ),
                    height: pct2css(
                      Math.min(
                        1 - state.pos.y,
                        contentSizes.viewport.height /
                          contentSizes.zoomed.height
                      )
                    ),
                  }}
                />
              ) : null}
              <div
                ref={refs.minimap}
                className="hover-target"
                style={{
                  position: "absolute",
                  top: 0,
                  ...state.minimapSize,
                  display: "block",
                }}
              />
            </div>
          ) : null}
        </Paper>
        <Box>
          {controls || null}
          <RangeSlider
            name="Zoom"
            {...zoomProps}
            onValueChange={(zoom) =>
              setState({
                ...state,
                zoom: zoom / 100,
              })
            }
          />
        </Box>
      </Box>
    </MediaViewerBox>
  );
};

export default MediaViewer;
