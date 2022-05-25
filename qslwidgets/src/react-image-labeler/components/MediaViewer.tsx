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
    onMouseLeave?: () => void;
  } & React.ComponentProps<"div">
> = ({
  children,
  media,
  size,
  controls,
  loadState,
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
    minimapSize: { width: MAP_SIZE, height: MAP_SIZE },
  });
  React.useEffect(() => {
    if (loadState === "loading") {
      setState({ ...state, pos: { x: 0, y: 0 } });
    }
  }, [loadState]);
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
    if (!size || !refs.viewport.current) {
      return;
    }
    const minimapScale = size
      ? MAP_SIZE / Math.max(size.width, size.height)
      : undefined;
    setState({
      ...state,
      zoom:
        100 *
        Math.min(
          refs.viewport.current.clientWidth / size.width,
          maxViewHeight / size.height
        ),
      minimapSize: minimapScale
        ? {
            width: minimapScale * size.width,
            height: minimapScale * size.height,
          }
        : state.minimapSize || { width: MAP_SIZE, height: MAP_SIZE },
    });
  }, [size, refs.viewport]);
  const scale = React.useMemo(() => state.zoom / 100, [state.zoom]);
  const zoomedSize = React.useMemo(() => {
    if (!size) {
      return;
    }
    return {
      width: scale * size.width,
      height: scale * size.height,
    };
  }, [state.zoom, size]);
  const margin = React.useMemo(() => {
    return state.viewportSize && zoomedSize
      ? {
          x:
            Math.min(state.viewportSize.width, zoomedSize.width) /
            zoomedSize.width /
            2,
          y:
            Math.min(state.viewportSize.height, zoomedSize.height) /
            zoomedSize.height /
            2,
        }
      : { x: 0, y: 0 };
  }, [state.viewportSize, zoomedSize]);
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
      if (!zoomedSize) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.ctrlKey) {
        setPos({
          x: state.pos.x + event.deltaX / zoomedSize.width,
          y: state.pos.y + event.deltaY / zoomedSize.height,
        });
      } else {
        setState({
          ...state,
          zoom: state.zoom - event.deltaY / 2,
        });
      }
      return false;
    },
    [state, zoomedSize]
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
              zoomedSize ? zoomedSize.height : maxViewHeight
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
                    "--media-viewer-scale": scale,
                    transform: `scale(${scale}) translate(${pct2css(
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
              {state.viewportSize && zoomedSize ? (
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
                        state.viewportSize.width / zoomedSize.width
                      )
                    ),
                    height: pct2css(
                      Math.min(
                        1 - state.pos.y,
                        state.viewportSize.height / zoomedSize.height
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
    </MediaViewerBox>
  );
};

export default MediaViewer;
