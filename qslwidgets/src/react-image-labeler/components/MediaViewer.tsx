import React from "react";
import { Box, Paper, CircularProgress, styled } from "@mui/material";
import RangeSlider from "./RangeSlider";
import GlobalLabelerContext from "./GlobalLabelerContext";
import ClickTarget from "./ClickTarget";
import { Dimensions, Point, MediaLoadState } from "./library/types";
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

  & .viewport img .viewport video {
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
    loadState: MediaLoadState;
    maxViewHeight?: number;
    cursor?: Point;
    onMouseLeave?: () => void;
  } & React.ComponentProps<"div">
> = ({
  children,
  media,
  size,
  controls,
  loadState,
  onMouseLeave,
  cursor,
  maxViewHeight = 512,
}) => {
  const { setFocus } = React.useContext(GlobalLabelerContext);
  const refs = {
    viewport: React.useRef<HTMLDivElement>(null),
    minimap: React.useRef<HTMLDivElement>(null),
    media: React.useRef<HTMLDivElement>(null),
  };
  const [state, setState] = React.useState({
    zoom: 1.0,
    pos: { x: 0, y: 0 } as Point,
    minimapSize: { width: MAP_SIZE, height: MAP_SIZE },
    zoomInitialized: false,
  });
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
      setState({
        ...state,
        zoomInitialized: true,
        zoom: Math.min(maxViewWidth / size.width, maxViewHeight / size.height),
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
  const zoomedSize = React.useMemo(() => {
    if (!size) {
      return;
    }
    return {
      width: state.zoom * size.width,
      height: state.zoom * size.height,
    };
  }, [state.zoom]);
  const viewportSize = React.useMemo(() => {
    if (!zoomedSize) {
      return;
    }
    return {
      width: Math.min(maxViewWidth, zoomedSize.width),
      height: Math.min(maxViewHeight, zoomedSize.height),
    };
  }, [maxViewWidth, maxViewHeight, zoomedSize]);
  const onMapClick = useMediaEvent(
    (point) => {
      setFocus();
      if (!zoomedSize || !viewportSize) {
        throw "Failed to process minimap position.";
      }
      const margin = {
        x: viewportSize.width / zoomedSize.width / 2,
        y: viewportSize.height / zoomedSize.height / 2,
      };
      setState({
        ...state,
        pos: {
          x: Math.max(point.x - margin.x, 0),
          y: Math.max(point.y - margin.y, 0),
        },
      });
    },
    refs.minimap,
    [setFocus, state, viewportSize, zoomedSize]
  );
  const onImageScroll = React.useCallback(
    (event: WheelEvent) => {
      if (!size) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.ctrlKey) {
        setState({
          ...state,
          pos: {
            x: Math.max(
              state.pos.x + event.deltaX / (size.width * state.zoom),
              0
            ),
            y: Math.max(
              state.pos.y + event.deltaY / (size.height * state.zoom),
              0
            ),
          },
        });
      } else {
        const newZoom = Math.max(
          state.zoom - event.deltaY / (2 * 100),
          10 / Math.min(size.width, size.height)
        );
        let newPos: Point;
        if (cursor) {
          newPos = {
            x: Math.max(
              cursor.x - (state.zoom * (cursor.x - state.pos.x)) / newZoom,
              0
            ),
            y: Math.max(
              cursor.y - (state.zoom * (cursor.y - state.pos.y)) / newZoom,
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
    [state, cursor, size]
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
              zoomedSize?.height || maxViewHeight
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
            onMouseLeave={loadState == "loaded" ? onMouseLeave : undefined}
            style={
              loadState === "loaded"
                ? ({
                    "--media-viewer-scale": state.zoom,
                    transform: `scale(${state.zoom}) translate(${pct2css(
                      -state.pos.x
                    )}, ${pct2css(-state.pos.y)})`,
                    transformOrigin: "0 0",
                    position: "absolute",
                  } as React.CSSProperties)
                : { width: 0, height: 0, overflow: "hidden" }
            }
          >
            {loadState === "loaded" ? children : null}
            {media.main}
          </Box>
        </Box>
        {controls || null}
      </Box>
      <Box
        className="controls"
        style={{
          display: "grid",
          gridTemplateColumns: `${state.minimapSize.width}px 1fr`,
          gridTemplateRows: "auto",
          gridTemplateAreas: '"minimap zoom"',
          gridColumnGap: 10,
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
              {viewportSize && zoomedSize ? (
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
                        viewportSize.width / zoomedSize.width
                      )
                    ),
                    height: pct2css(
                      Math.min(
                        1 - state.pos.y,
                        viewportSize.height / zoomedSize.height
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
        <RangeSlider
          name="Zoom"
          className={"zoom"}
          min={Math.min(1, Math.round(100 * state.zoom))}
          max={Math.max(500, Math.round(100 * state.zoom))}
          width={"100%"}
          value={Math.round(100 * state.zoom)}
          onValueChange={(zoom) =>
            setState({
              ...state,
              zoom: zoom / 100,
            })
          }
        />
      </Box>
    </MediaViewerBox>
  );
};

export default MediaViewer;
