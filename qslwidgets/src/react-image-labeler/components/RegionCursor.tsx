import React from "react";
import { pct2css } from "./library/utils";

const BORDER_THICKNESS = 2;

const RegionCursor: React.FC<{
  radius: number;
  x: number;
  y: number;
}> = ({ radius, x, y }) => {
  return (
    <div
      className="mask-cursor"
      style={{
        height: `${radius * 2}px`,
        width: `${radius * 2}px`,
        boxSizing: "content-box",
        transform: `translate(${-radius - BORDER_THICKNESS}px, ${
          -radius - BORDER_THICKNESS
        }px) scale(calc(1/var(--media-viewer-scale, 1)))`,
        left: pct2css(x),
        top: pct2css(y),
        position: "absolute",
        border: `${BORDER_THICKNESS}px solid red`,
        cursor: "none",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
};

export default RegionCursor;
