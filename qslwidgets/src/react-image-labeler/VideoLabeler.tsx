import React from "react";
import { Stack, IconButton, Box } from "@mui/material";
import {
  useLoader,
  usePlaybackState,
  useDraftLabelState,
  useMediaMouseCallbacks,
  useKeyboardEvent,
  simulateClick,
} from "./components/library/hooks";
import MediaViewer from "./components/MediaViewer";
import LabelerLayout from "./components/LabelerLayout";
import ControlMenu from "./components/ControlMenu";
import Playbar from "./components/Playbar";
import RegionList from "./components/RegionList";
import GlobalLabelerContext from "./components/GlobalLabelerContext";
import { Dimensions, VideoLabelerProps } from "./components/library/types";
import {
  FastForward,
  PlayArrow,
  Pause,
  VolumeMute,
  VolumeUp,
} from "@mui/icons-material";
import {
  insertOrAppendByTimestamp,
  draft2labels,
} from "./components/library/utils";

const VideoLabeler: React.FC<VideoLabelerProps> = ({
  target,
  config = { image: [], regions: [] },
  labels,
  metadata,
  options,
  callbacks,
}) => {
  const refs = {
    mini: React.useRef<HTMLVideoElement>(null),
    main: React.useRef<HTMLVideoElement>(null),
    secondaryThumbnail: React.useRef<HTMLVideoElement>(null),
    viewer: React.useRef<HTMLDivElement>(null),
    canvas: React.useRef<HTMLCanvasElement>(null),
    playpause: React.useRef<HTMLButtonElement>(null),
    fastforward: React.useRef<HTMLButtonElement>(null),
    mute: React.useRef<HTMLButtonElement>(null),
  };
  const { setFocus, setToast } = React.useContext(GlobalLabelerContext);
  const memoized = React.useMemo(() => labels || [], [labels]);
  const { playbackState, setPlaybackState, toggleMute } = usePlaybackState(
    refs,
    memoized
  );
  const { draft, setDraft, resetDraft, cursor, setCursor } = useDraftLabelState(
    playbackState.labels,
    [playbackState.timestamp]
  );
  useKeyboardEvent(
    (event: KeyboardEvent) => {
      let target: keyof typeof refs | null;
      switch (event.key) {
        case "Spacebar":
        case " ":
          target = !draft.dirty ? "playpause" : null;
          if (!target) {
            setToast("Save or reset your labels to continue playback.");
          }
          break;
        case "ArrowRight":
          target = event.altKey && !draft.dirty ? "fastforward" : null;
          if (!target && event.altKey) {
            setToast("Save or reset your labels to continue playback.");
          }
          break;
        case "m":
          target = event.altKey ? "mute" : null;
        default:
          return;
      }
      if (target && refs[target].current) {
        simulateClick(refs[target].current).then(setFocus);
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [refs]
  );
  const loader = useLoader<{
    duration: number;
    size: Dimensions;
    layout: "horizontal" | "vertical";
  }>(
    (event: any) =>
      new Promise((resolve, reject) => {
        if (!refs.main.current) {
          reject("Could not handle loading because video element was missing.");
        } else {
          const size = {
            width: refs.main.current.videoWidth,
            height: refs.main.current.videoHeight,
          };
          resolve({
            duration: refs.main.current.duration,
            layout: size.height > size.width ? "horizontal" : "vertical",
            size,
          });
        }
      }),
    target
  );
  const mediaCallbacks = useMediaMouseCallbacks(
    draft,
    setDraft,
    cursor,
    setCursor,
    { source: refs.main, canvas: refs.canvas },
    config.regions && config.regions.length > 0 ? true : false,
    options?.maxCanvasSize
  );
  const playbackSensitiveMediaCallbacks = React.useMemo(() => {
    if (playbackState.paused) {
      return mediaCallbacks;
    } else {
      return {
        onClick: () => setPlaybackState(0),
        onMouseMove: undefined,
      };
    }
  }, [playbackState.paused, setPlaybackState]);
  const buttons = [
    {
      icon: playbackState.paused ? PlayArrow : Pause,
      label: playbackState.paused ? "play (spacebar)" : "pause (spacebar)",
      className: "playpause",
      disabled: playbackState.paused && draft.dirty,
      ref: refs.playpause,
      callbacks: {
        onClick: () => setPlaybackState(playbackState.paused ? 1 : 0),
      },
    },
    {
      icon: FastForward,
      label: "forward (alt\u2192)",
      className: "fastforward",
      ref: refs.fastforward,
      disabled: playbackState.paused && draft.dirty,
      callbacks: {
        onClick: () => setPlaybackState(playbackState.playbackRate + 1),
      },
    },
    {
      icon: playbackState.muted ? VolumeMute : VolumeUp,
      label: "mute/unmute forward (alt+m)",
      className: "mute",
      ref: refs.mute,
      disabled: !playbackState.paused,
      callbacks: {
        onClick: toggleMute,
      },
    },
  ];

  return (
    <LabelerLayout
      metadata={metadata}
      layout={loader.mediaState?.layout || "horizontal"}
      progress={options?.progress}
      control={
        <ControlMenu
          cursor={cursor}
          setCursor={setCursor}
          config={config}
          disabled={loader.loadState === "loading" || !playbackState.paused}
          direction={
            (loader.mediaState?.layout || "horizontal") === "horizontal"
              ? "column"
              : "row"
          }
          draft={draft}
          showNavigation={options?.showNavigation}
          setDraft={setDraft}
          callbacks={{
            ...callbacks,
            onSave: () =>
              callbacks?.onSave
                ? callbacks.onSave(
                    insertOrAppendByTimestamp(
                      {
                        labels: draft2labels(draft.labels),
                        timestamp: playbackState.timestamp,
                        end: playbackState.end,
                      },
                      labels || []
                    )
                  )
                : undefined,
            onReset: resetDraft,
          }}
        />
      }
      content={
        <Box>
          <MediaViewer
            maxViewHeight={options?.maxViewHeight}
            size={loader.mediaState?.size}
            loadState={loader.loadState}
            cursor={cursor.coords}
            onMouseLeave={() => setCursor({ ...cursor, coords: undefined })}
            media={{
              main: (
                <video
                  disablePictureInPicture
                  onLoadedMetadata={loader.callbacks.onLoad}
                  onError={loader.callbacks.onError}
                  {...playbackSensitiveMediaCallbacks}
                  ref={refs.main}
                  src={loader.src}
                  style={{
                    cursor:
                      config.regions &&
                      config.regions.length > 0 &&
                      playbackState.paused
                        ? "none"
                        : undefined,
                  }}
                />
              ),
              mini: <video src={target} ref={refs.mini} />,
            }}
            controls={
              <Stack direction="row" alignItems="center" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={0}>
                  {buttons.map((button) => (
                    <IconButton
                      {...button.callbacks}
                      disabled={button.disabled}
                      className={button.className}
                      ref={button.ref}
                      key={button.label}
                      aria-label={button.label}
                      title={button.label}
                      size="small"
                    >
                      <button.icon fontSize="small" />
                    </IconButton>
                  ))}
                </Stack>
                <Playbar
                  marks={(labels || []).map((t) => t.timestamp)}
                  timestamp={playbackState.timestamp}
                  duration={loader.mediaState?.duration}
                  secondary={playbackState.end}
                  secondaryThumbnail={
                    <video
                      src={target}
                      ref={refs.secondaryThumbnail}
                      style={{ maxWidth: "100%", maxHeight: "100%" }}
                    />
                  }
                  setSecondary={(timestamp) =>
                    setPlaybackState(0, undefined, timestamp)
                  }
                  setTimestamp={(timestamp) =>
                    draft.dirty ? undefined : setPlaybackState(0, timestamp)
                  }
                />
              </Stack>
            }
          >
            <RegionList
              config={config}
              cursor={cursor}
              draft={draft}
              callbacks={mediaCallbacks}
            />
          </MediaViewer>
          {loader.loadState !== "loading" ? (
            <canvas style={{ display: "none" }} ref={refs.canvas} />
          ) : null}
        </Box>
      }
    />
  );
};

export default VideoLabeler;
