import React from "react";
import { pct2css } from "./library/utils";

const BORDER_THICKNESS = 2;

const RegionCursor: React.FC<
  {
    radius: number;
    x: number;
    y: number;
    crosshair: boolean;
    round: boolean;
  } & React.ComponentProps<"div">
> = ({ radius, round, x, y, crosshair, ...other }) => {
  return (
    <div
      {...other}
      className="mask-cursor"
      style={{
        ...(other.style || {}),
        height: `${radius * 2}px`,
        width: `${radius * 2}px`,
        boxSizing: "content-box",
        // Sort this out later after implementing
        // the calculations for radial search in fill()
        borderRadius: round ? `${radius + BORDER_THICKNESS}px` : undefined,
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
      }}
    >
      {crosshair ? (
        <svg
          style={{
            position: "absolute",
            left: "-10%",
            top: "-10%",
            height: "120%",
            width: "120%",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <line
            x1="50%"
            x2="50%"
            y1="0%"
            y2="100%"
            stroke="red"
            strokeWidth="2px"
          />
          <line
            y1="50%"
            y2="50%"
            x1="0%"
            x2="100%"
            stroke="red"
            strokeWidth="2px"
          />
        </svg>
      ) : null}
    </div>
  );
};

export default RegionCursor;
