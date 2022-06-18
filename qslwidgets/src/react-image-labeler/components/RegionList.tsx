import React from "react";
import { Box, styled } from "@mui/material";
import AlignedBox from "./AlignedBox";
import Mask from "./Mask";
import { Config, DraftState, CursorData } from "./library/types";
import toReact from "svelte-adapter/react";
import RegionCursorSvelte from "./RegionCursor.svelte";
import PolygonSvelte from "./Polygon.svelte";

const PolygonSvelteAdapted = toReact(PolygonSvelte, {}, "div");
const RegionCursor = toReact(RegionCursorSvelte, {}, "div");
const useSvelteCallback = (
  inner: (
    event: React.MouseEvent<Element, MouseEvent>,
    ...args: unknown[]
  ) => void
) => React.useCallback((raw: any) => inner(raw.detail), [inner]);

interface RegionListProps {
  config: Config;
  draft: DraftState;
  cursor: CursorData;
  callbacks: {
    onClick: (
      event: React.MouseEvent<Element, MouseEvent>,
      ...args: unknown[]
    ) => void;
    onMouseMove: (
      event: React.MouseEvent<Element, MouseEvent>,
      ...args: unknown[]
    ) => void;
  };
}

const StyledBox = styled(Box)`
  .region text {
    font-size: calc(10pt / var(--media-viewer-scale, 1));
    font-family: Roboto, Helvetica, Arial, sans-serif;
    transform: translate(
      calc(10px / var(--media-viewer-scale, 1)),
      calc(10px / var(--media-viewer-scale, 1))
    );
  }

  svg,
  canvas {
    z-index: 1;
  }

  .active-region .region,
  .inactive-regions.boxes-mode .polygon .inactive-regions.boxes-mode .mask,
  .inactive-regions.masks-mode .polygon,
  .inactive-regions.masks-mode .box,
  .inactive-regions.polygons-mode .mask,
  .inactive-regions.polygons-mode .box {
    pointer-events: none;
  }
`;

const RegionList: React.FC<RegionListProps> = ({
  draft,
  callbacks,
  cursor,
}) => {
  return (
    <StyledBox>
      <div className={`inactive-regions ${draft.drawing.mode}-mode`}>
        {draft.labels.masks.map((mask, index) =>
          draft.drawing.mode !== "masks" ||
          draft.drawing.active?.idx !== index ? (
            <Mask
              color={mask.readonly ? "yellow" : "blue"}
              key={index}
              bitmap={mask.map}
              style={{
                pointerEvents:
                  draft.drawing.mode === "masks" ? undefined : "none",
              }}
              {...callbacks}
            />
          ) : null
        )}
        {draft.labels.polygons.map((polygon, index) =>
          draft.drawing.mode !== "polygons" ||
          draft.drawing.active?.idx !== index ? (
            <PolygonSvelteAdapted
              polygon={polygon}
              key={index}
              color={polygon.readonly ? "yellow" : "blue"}
              onMouseMove={useSvelteCallback(callbacks.onMouseMove)}
              onClick={useSvelteCallback((event: React.MouseEvent) =>
                callbacks.onClick(event, polygon, index)
              )}
            />
          ) : null
        )}
        {draft.labels.boxes.map((box, index) =>
          draft.drawing.mode !== "boxes" ||
          draft.drawing.active?.idx !== index ? (
            <AlignedBox
              color={box.readonly ? "yellow" : "blue"}
              box={box}
              key={index}
              {...callbacks}
              onClick={(event: React.MouseEvent) =>
                callbacks.onClick(event, box, index)
              }
            />
          ) : null
        )}
      </div>
      {!draft.drawing.active ? null : (
        <div className="active-region">
          {draft.drawing.mode === "polygons" ? (
            <PolygonSvelteAdapted
              color="red"
              polygon={draft.drawing.active.region}
              candidate={
                draft.drawing.active.idx > -1 ? undefined : cursor.coords
              }
            />
          ) : draft.drawing.mode === "boxes" ? (
            <AlignedBox
              color="red"
              box={draft.drawing.active.region}
              candidate={
                draft.drawing.active.idx > -1 ? undefined : cursor.coords
              }
            />
          ) : draft.drawing.mode === "masks" ? (
            <Mask color="red" bitmap={draft.drawing.active.region.map} />
          ) : null}
        </div>
      )}
      {cursor.coords && draft.drawing.mode === "masks" ? (
        <RegionCursor
          x={cursor.coords.x}
          y={cursor.coords.y}
          radius={draft.drawing.radius}
        />
      ) : null}
    </StyledBox>
  );
};

export default RegionList;
