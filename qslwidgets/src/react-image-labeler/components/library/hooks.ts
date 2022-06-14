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
  MediaLoadState,
  CursorData,
  ImageEnhancements,
} from "./types";
import { useTheme, useMediaQuery } from "@mui/material";
import { labels2draft } from "./utils";
import { handleMediaClick } from "./handlers";
import { snapPolygonCoords } from "./geometry";
import GlobalLabelerContext from "../GlobalLabelerContext";

const MAX_UNDO_HISTORY = 10;

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
    src: src,
    loadState: "loading" as MediaLoadState,
    mediaState: undefined as T | undefined,
  });
  React.useEffect(() => {
    if (src !== state.src) {
      setState({
        src,
        loadState: src ? "loading" : "loaded",
        mediaState: state.mediaState,
      });
    }
  }, [src]);
  return {
    ...state,
    callbacks: {
      onError: React.useCallback(() => {
        setState({
          ...state,
          loadState: "error",
        });
        setToast(`An error occurred loading ${state.src}.`);
      }, [state]),
      onLoad: React.useCallback(
        (
          event: React.SyntheticEvent<
            HTMLImageElement | HTMLVideoElement,
            Event
          >
        ) => {
          loader(event).then(
            (mediaState) =>
              setState({
                mediaState,
                loadState: "loaded",
                src: state.src,
              }),
            (message) => setToast(`An error occurred loading ${state.src}.`)
          );
        },
        [loader, state]
      ),
    },
  };
};

export const useDraftLabelState = (
  labels: Labels,
  deps?: React.DependencyList,
  historyDeps?: React.DependencyList
) => {
  const [draft, setDraftInner] = React.useState<DraftState>({
    labels: labels2draft(labels || {}),
    dirty: false,
    canvas: null,
    drawing: {
      mode: "boxes",
    },
  });
  const [history, setHistory] = React.useState<DraftState[]>([]);

  const setDraft = React.useCallback(
    (update: DraftState) => {
      if (historyDeps && historyDeps.length > 0) {
        setHistory([draft].concat(history).slice(0, MAX_UNDO_HISTORY));
      }
      setDraftInner(update);
    },
    [history, draft]
  );
  const [cursor, setCursor] = React.useState<CursorData>({
    radius: 5,
    threshold: 1,
    coords: undefined,
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
  const resetHistory = React.useCallback(() => setHistory([]), []);
  const undo = React.useCallback(() => {
    if (history.length > 0) {
      setDraftInner({ ...history[0], dirty: true });
      setHistory(history.slice(1));
    }
  }, [history]);
  React.useEffect(resetDraft, [labels].concat(deps || []));
  React.useEffect(resetHistory, historyDeps || []);
  return {
    cursor,
    setCursor,
    draft,
    setDraft,
    resetDraft,
    undo: history.length > 0 ? undo : undefined,
  };
};

export const useMediaMouseCallbacks = (
  draft: DraftState,
  setDraft: (draft: DraftState) => void,
  cursor: CursorData,
  setCursor: (cursor: CursorData) => void,
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
        if (
          !showCursor ||
          !refs.source.current ||
          (!refs.canvas.current && !draft.canvas)
        )
          return;
        try {
          setDraft(
            handleMediaClick(
              draft,
              cursor,
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
      [draft, cursor]
    ),
    onMouseMove: useMediaEvent(
      (coords) => {
        if (!showCursor || !refs.source.current) return;
        const mediaViewerScale = parseFloat(
          getComputedStyle(refs.source.current).getPropertyValue(
            "--media-viewer-scale"
          ) || "1"
        );
        setCursor(
          snapPolygonCoords({ ...cursor, coords }, draft.drawing, {
            width: refs.source.current.clientWidth * mediaViewerScale,
            height: refs.source.current.clientHeight * mediaViewerScale,
          })
        );
      },
      refs.source,
      [draft, cursor],
      0
    ),
  };
};

const labels4timestamp = (
  labels: TimestampedLabel[],
  timestamp: number
): TimestampedLabel => {
  if (!labels) return { timestamp, end: undefined, labels: { image: {} } };
  return (
    labels.filter((l) => l.timestamp === timestamp)[0] || {
      timestamp,
      end: undefined,
      labels: { image: {} },
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
    timestamp: 0,
    labels: { image: {} } as Labels,
    end: undefined as number | undefined,
  });
  React.useEffect(() => {
    if (!refs.main.current) {
      return;
    }
    setPlaybackState({
      ...playbackState,
      ...labels4timestamp(labels, refs.main.current.currentTime),
    });
  }, [labels, refs.main]);
  useInterval(
    () => {
      if (
        refs.main.current &&
        !(
          refs.main.current.paused === playbackState.paused &&
          refs.main.current.currentTime === playbackState.timestamp &&
          refs.main.current.playbackRate === playbackState.playbackRate
        )
      ) {
        setPlaybackState({
          ...playbackState,
          paused: refs.main.current.paused,
          playbackRate: refs.main.current.playbackRate,
          ...(refs.main.current.paused
            ? labels4timestamp(labels, refs.main.current.currentTime)
            : { end: undefined, labels: {} }),
          timestamp: refs.main.current.currentTime,
        });
      }
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

export const useImageEnhancements = () => {
  const [value, set] = React.useState<ImageEnhancements>({
    contrast: 1.0,
    brightness: 1.0,
    saturation: 1.0,
  });
  const filter = React.useMemo(
    () =>
      `contrast(${value.contrast}) brightness(${value.brightness}) saturate(${value.saturation})`,
    [value]
  );
  return { value, filter, set };
};
