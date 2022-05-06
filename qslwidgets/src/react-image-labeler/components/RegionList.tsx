import React from "react";
import { Box } from "@mui/material";
import Polygon from "./Polygon";
import AlignedBox from "./AlignedBox";
import RegionCursor from "./RegionCursor";
import Mask from "./Mask";
import { isPolygonClosed } from "./library/geometry";
import { Config, DraftState } from "./library/types";

interface RegionListProps {
  config: Config;
  draft: DraftState;
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

const RegionList: React.FC<RegionListProps> = ({
  config,
  draft,
  callbacks,
}) => {
  const cursor =
    config?.regions && config.regions.length > 0 ? "none" : undefined;
  return (
    <Box>
      {draft.labels.masks.map((mask, index) =>
        draft.drawing.mode !== "masks" ||
        draft.drawing.active?.idx !== index ? (
          <Mask
            activeColor="blue"
            key={index}
            bitmap={mask.map}
            style={{
              cursor,
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
              cursor,
              pointerEvents:
                draft.drawing.mode === "polygons" ? undefined : "none",
            }}
            key={index}
            color="blue"
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
            color="blue"
            box={box}
            key={index}
            style={{
              cursor,
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
          candidate={
            draft.drawing.active.idx > -1 ? undefined : draft.cursor.coords
          }
          style={{ cursor }}
        />
      ) : draft.drawing.mode === "boxes" ? (
        <AlignedBox
          color="red"
          box={draft.drawing.active.region}
          candidate={
            draft.drawing.active.idx > -1 ? undefined : draft.cursor.coords
          }
          style={{ cursor }}
          {...callbacks}
        />
      ) : draft.drawing.mode === "masks" ? (
        <Mask
          activeColor="red"
          {...callbacks}
          bitmap={draft.drawing.active.region.map}
          style={{ cursor }}
        />
      ) : null}
      {draft.cursor.coords && cursor !== undefined ? (
        <RegionCursor
          {...callbacks}
          radius={draft.drawing.mode === "masks" ? draft.cursor.radius : 5}
          x={draft.cursor.coords.x}
          y={draft.cursor.coords.y}
          crosshair={
            draft.drawing.mode === "masks"
              ? false
              : draft.drawing.mode === "boxes"
              ? true
              : isPolygonClosed(
                  draft.cursor.coords,
                  draft.drawing.active?.region?.points
                )
              ? false
              : true
          }
          round={draft.drawing.mode !== "masks"}
        />
      ) : null}
    </Box>
  );
};

export default RegionList;
