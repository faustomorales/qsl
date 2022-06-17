import React from "react";
import { Box, styled } from "@mui/material";
import Polygon from "./Polygon";
import AlignedBox from "./AlignedBox";
import RegionCursor from "./RegionCursor";
import Mask from "./Mask";
import { Config, DraftState, CursorData } from "./library/types";

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
  .box-text {
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
`;

const RegionList: React.FC<RegionListProps> = ({
  draft,
  callbacks,
  cursor,
}) => {
  return (
    <StyledBox>
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
          <Polygon
            polygon={polygon}
            style={{
              pointerEvents:
                draft.drawing.mode === "polygons" ? undefined : "none",
            }}
            key={index}
            color={polygon.readonly ? "yellow" : "blue"}
            {...callbacks}
            onClick={(event: React.MouseEvent) =>
              callbacks.onClick(event, polygon, index)
            }
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
            style={{
              pointerEvents:
                draft.drawing.mode === "boxes" ? undefined : "none",
            }}
            {...callbacks}
            onClick={(event: React.MouseEvent) =>
              callbacks.onClick(event, box, index)
            }
          />
        ) : null
      )}
      {!draft.drawing.active ? null : draft.drawing.mode === "polygons" ? (
        <Polygon
          color="red"
          polygon={draft.drawing.active.region}
          {...callbacks}
          candidate={draft.drawing.active.idx > -1 ? undefined : cursor.coords}
          style={{ pointerEvents: "none" }}
        />
      ) : draft.drawing.mode === "boxes" ? (
        <AlignedBox
          color="red"
          box={draft.drawing.active.region}
          candidate={draft.drawing.active.idx > -1 ? undefined : cursor.coords}
          style={{ pointerEvents: "none" }}
          {...callbacks}
        />
      ) : draft.drawing.mode === "masks" ? (
        <Mask
          color="red"
          {...callbacks}
          bitmap={draft.drawing.active.region.map}
          style={{ pointerEvents: "none" }}
        />
      ) : null}
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
