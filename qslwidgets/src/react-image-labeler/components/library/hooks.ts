import React from "react";
import debounce from "lodash.debounce";
import {
  Point,
  Labels,
  DraftState,
  PolygonLabel,
  AlignedBoxLabel,
  TimestampedLabel,
  MediaRefs,
} from "./types";
import { useTheme, useMediaQuery } from "@mui/material";
import { labels2draft } from "./utils";
import { handleMediaClick } from "./handlers";
import { snapPolygonCoords } from "./geometry";
import GlobalLabelerContext from "../GlobalLabelerContext";

export const convertCoordinates = (
  point: Point,
  image: HTMLElement | null
): Point => {
  if (!image) {
    throw Error("Requested mouse position without a ref.");
  }
  const { x, y, width, height } = image.getBoundingClientRect();
  return {
    x: (point.x - window.scrollX - x) / width,
    y: (point.y - window.scrollY - y) / height,
  };
};

export const useMediaLarge = () =>
  useMediaQuery(useTheme().breakpoints.up("sm"));

export const useMediaEvent = <T>(
  func: (point: Point, event: React.MouseEvent, ...args: any[]) => void,
  elem: React.MutableRefObject<HTMLElement | null>,
  deps?: React.DependencyList,
  time?: number
) => {
  return React.useMemo(() => {
    const debounced = time && time !== 0 ? debounce(func, time) : func;
    return (event: React.MouseEvent, ...args: T[]) =>
      debounced(
        convertCoordinates(
          {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          },
          elem.current
        ),
        event,
        ...args
      );
  }, [...(deps || []), elem]);
};

export const useKeyboardEvent = (
  handler: (event: KeyboardEvent) => void,
  deps: React.DependencyList
) => {
  const { hasFocus } = React.useContext(GlobalLabelerContext);
  const wrapped = React.useCallback((event: KeyboardEvent) => {
    const inFocusingElement = !!(
      event.target &&
      (event.target as HTMLElement).closest(`.react-image-labeler-input-target`)
    );
    const nodeName = (event.target as HTMLElement | undefined)?.nodeName;
    const editable =
      (event.target as HTMLElement | undefined)?.contentEditable === "true";
    if (
      // We never take input if we're not in our element
      !hasFocus ||
      // or from textarea nodes.
      nodeName === "TEXTAREA" ||
      // or from input nodes *unless* they're checkbox/radio buttons in our own form.
      (nodeName === "INPUT" && !(inFocusingElement && hasFocus)) ||
      // or from editable nodes.
      editable
    ) {
      return;
    }
    handler(event);
  }, (deps || []).concat([handler, hasFocus]));
  React.useEffect(() => {
    document.addEventListener("keydown", wrapped, false);
    return () => {
      document.removeEventListener("keydown", wrapped, false);
    };
  }, [wrapped]);
};

export const delay = (amount: number) =>
  new Promise((resolve) => setTimeout(resolve, amount));

export const simulateClick = (target: HTMLElement | null, offset?: Point) =>
  new Promise<void>((resolve) => {
    if (!target) return;
    target.focus({ preventScroll: true });
    target.classList.add("active");
    const { x, y } = target.getBoundingClientRect();
    const args = {
      bubbles: true,
      cancelable: true,
      ...(offset
        ? {
            clientX: x + offset.x,
            clientY: y + offset.y,
          }
        : {}),
    };
    target.dispatchEvent(new MouseEvent("mousedown", args));
    target.dispatchEvent(new MouseEvent("mouseup", args));
    delay(100).then(() => {
      target.dispatchEvent(new MouseEvent("click", args));
      target.classList.remove("active");
      target.blur();
      resolve();
    });
  });

export const simulateScroll = async (
  target: HTMLElement | null,
  offset: Point,
  ctrlKey: boolean
) => {
  if (!target) {
    return;
  }
  target.dispatchEvent(
    new WheelEvent("wheel", { deltaX: offset.x, deltaY: offset.y, ctrlKey })
  );
};

export const simulateHover = (target: HTMLElement | null, offset: Point) => {
  if (!target) {
    return;
  }
  const { x, y } = target.getBoundingClientRect();
  target?.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      ...(offset
        ? {
            clientX: x + offset.x,
            clientY: y + offset.y,
          }
        : {}),
    })
  );
};

// From https://github.com/Hermanya/use-interval/blob/master/src/index.tsx
const noop = () => {};

export const useInterval = (
  callback: () => void,
  delay: number | null | false,
  immediate?: boolean,
  deps?: React.DependencyList
) => {
  const savedCallback = React.useRef(noop);

  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  });

  // Execute callback if immediate is set.
  React.useEffect(() => {
    if (!immediate) return;
    if (delay === null || delay === false) return;
    savedCallback.current();
  }, [immediate]);

  // Set up the interval.
  React.useEffect(() => {
    if (delay === null || delay === false) return undefined;
    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay].concat(deps || []));
};

export const useLoader = <T>(
  loader: (event: any) => Promise<T>,
  src?: string
) => {
  const { setToast } = React.useContext(GlobalLabelerContext);
  const [state, setState] = React.useState({
    disableControls: false,
    disableContents: !!src,
    timestamp: new Date().getTime(),
    mediaState: undefined as T | undefined,
  });
  const [visibleSource, setVisibleSource] = React.useState(src);
  React.useEffect(() => {
    if (src !== visibleSource) {
      setState({
        disableControls: false,
        disableContents: !!src,
        timestamp: new Date().getTime(),
        mediaState: state.mediaState,
      });
      setVisibleSource(src);
    }
  }, [src]);
  useInterval(
    () =>
      state.disableContents &&
      !state.disableControls &&
      new Date().getTime() - state.timestamp > 250
        ? setState({
            ...state,
            disableControls: true,
          })
        : null,
    100,
    true
  );
  return {
    visibleSource,
    mediaState: state.mediaState,
    disableControls: state.disableControls,
    disableContents: state.disableContents,
    loader: React.useCallback(
      (
        event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>
      ) => {
        loader(event).then(
          (mediaState) =>
            setState({
              mediaState,
              timestamp: new Date().getTime(),
              disableControls: false,
              disableContents: false,
            }),
          (message) => setToast(message)
        );
      },
      [loader, visibleSource]
    ),
  };
};

export const useDraftLabelState = (
  labels: Labels,
  deps?: React.DependencyList
) => {
  const [draft, setDraft] = React.useState<DraftState>({
    labels: labels2draft(labels || {}),
    dirty: false,
    canvas: null,
    cursor: {
      radius: 5,
      threshold: 1,
      coords: undefined,
    },
    drawing: {
      mode: "boxes",
    },
  });
  const resetDraft = React.useCallback(
    () =>
      setDraft({
        ...draft,
        labels: labels2draft(labels || {}),
        dirty: false,
        canvas: null,
        drawing:
          draft.drawing.mode === "masks"
            ? {
                mode: "masks",
                flood: draft.drawing.flood,
              }
            : {
                mode: draft.drawing.mode,
              },
      }),
    [labels, draft]
  );
  React.useEffect(() => {
    resetDraft();
  }, [labels].concat(deps || []));
  return { draft, setDraft, resetDraft };
};

export const useMediaMouseCallbacks = (
  draft: DraftState,
  setDraft: (draft: DraftState) => void,
  refs: MediaRefs,
  showCursor: boolean,
  maxCanvasSize?: number
) => {
  const { setFocus, setToast } = React.useContext(GlobalLabelerContext);
  return {
    onClick: useMediaEvent(
      (
        point,
        event,
        selected: PolygonLabel | AlignedBoxLabel,
        idx?: number
      ) => {
        setFocus();
        if (!showCursor || !refs.source.current || !refs.canvas.current) return;
        try {
          setDraft(
            handleMediaClick(
              draft,
              point,
              refs,
              event.altKey,
              selected,
              maxCanvasSize,
              idx
            )
          );
        } catch (e) {
          setToast(e as string);
        }
      },
      refs.source,
      [draft]
    ),
    onMouseMove: useMediaEvent(
      (coords) => {
        if (!showCursor || !refs.source.current) return;
        setDraft({
          ...draft,
          cursor: snapPolygonCoords(
            { ...draft.cursor, coords },
            draft.drawing,
            {
              width: refs.source.current.clientWidth,
              height: refs.source.current.clientHeight,
            }
          ),
        });
      },
      refs.source,
      [draft],
      0
    ),
  };
};

const labels4timestamp = (
  labels: TimestampedLabel[],
  timestamp: number
): TimestampedLabel => {
  if (!labels) return { timestamp, end: undefined, labels: {} };
  return (
    labels.filter((l) => l.timestamp === timestamp)[0] || {
      timestamp,
      end: undefined,
      labels: {},
    }
  );
};

export const usePlaybackState = (
  refs: {
    main: React.MutableRefObject<HTMLVideoElement | null>;
    mini: React.MutableRefObject<HTMLVideoElement | null>;
    secondaryThumbnail: React.MutableRefObject<HTMLVideoElement | null>;
  },
  labels: TimestampedLabel[]
) => {
  const { setFocus } = React.useContext(GlobalLabelerContext);
  const [playbackState, setPlaybackState] = React.useState({
    paused: true,
    playbackRate: 0,
    muted: false,
    ...labels4timestamp(labels, 0),
  });
  React.useEffect(() => {
    if (!refs.main.current) {
      return;
    }
    setPlaybackState({
      ...playbackState,
      ...labels4timestamp(labels, refs.main.current.currentTime),
    });
  }, [labels]);
  useInterval(
    () => {
      if (
        refs.main.current &&
        !(
          refs.main.current.paused === playbackState.paused &&
          refs.main.current.currentTime === playbackState.timestamp &&
          refs.main.current.playbackRate === playbackState.playbackRate
        )
      )
        setPlaybackState({
          ...playbackState,
          paused: refs.main.current.paused,
          playbackRate: refs.main.current.playbackRate,
          ...(refs.main.current.paused
            ? labels4timestamp(labels, refs.main.current.currentTime)
            : { end: undefined, labels: {} }),
          timestamp: refs.main.current.currentTime,
        });
      if (
        refs.secondaryThumbnail.current &&
        playbackState.end &&
        refs.secondaryThumbnail.current.currentTime !== playbackState.end
      )
        refs.secondaryThumbnail.current.currentTime = playbackState.end;
      ["main", "mini"].map((k) => {
        const current = refs[k as "main" | "mini"].current;
        if (!current) {
          return;
        }
        if (current && current.muted !== playbackState.muted) {
          current.muted = playbackState.muted;
        }
      });
    },
    10,
    true
  );
  const toggleMute = React.useCallback(
    () => setPlaybackState({ ...playbackState, muted: !playbackState.muted }),
    [playbackState]
  );
  const setPlayback = React.useCallback(
    (playbackRate: number, timestamp?: number, end?: number) => {
      if (!refs.main.current || !refs.mini.current) {
        return;
      }
      if (playbackRate == 0) {
        refs.main.current.pause();
        refs.mini.current.pause();
      } else if (playbackRate > 0) {
        refs.main.current.playbackRate = playbackRate;
        refs.mini.current.playbackRate = playbackRate;
        if (refs.main.current.paused) {
          refs.main.current.play();
          refs.mini.current.play();
        }
      } else if (playbackRate < 0) {
        throw "Rewinding is not supported.";
      }
      if (timestamp !== undefined) {
        refs.main.current.currentTime = timestamp;
        refs.mini.current.currentTime = timestamp;
      }
      if (end !== undefined) {
        setPlaybackState({ ...playbackState, end });
      }

      setFocus();
    },
    [refs, playbackState, setFocus]
  );
  return {
    playbackState,
    setPlaybackState: setPlayback,
    toggleMute,
  };
};
