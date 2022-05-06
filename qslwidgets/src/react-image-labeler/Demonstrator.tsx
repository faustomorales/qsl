import React from "react";
import { delay } from "./components/library/hooks";
import { Point } from "./components/library/types";
import { Box, Typography, useTheme } from "@mui/material";

import { pct2css } from "./components/library/utils";

type Step = {
  target: string;
  text: string;
  offset: Point;
};

const animationMs = 250;

const getPosition = (
  target: HTMLElement,
  container: HTMLElement,
  offset?: Point
) => {
  const trect = target.getBoundingClientRect();
  const crect = container.getBoundingClientRect();
  const initial = {
    x: trect.x + (offset ? offset.x : trect.width / 2),
    y: trect.y + (offset ? offset.y : trect.height / 2),
  };
  return {
    x: (initial.x - crect.x) / crect.width,
    y: (initial.y - crect.y) / crect.height,
  };
};

const Demonstrator: React.FC<{ steps: Step[] }> = ({ children, steps }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const [idx, setIdx] = React.useState(0);
  const [message, setMessage] = React.useState({
    text: "",
    show: false,
    position: { x: 0.5, y: 0.5 },
  } as { text: string; show: boolean; position: Point });
  React.useEffect(() => {
    if (!ref) {
      return;
    }
    (() => {
      const step = steps[idx];
      const nextIdx = idx + 1 < steps.length ? idx + 1 : 0;
      if (!ref.current) {
        return;
      }
      const target = ref.current.querySelector(step.target) as HTMLElement;
      if (!target) {
        console.error("Failed to find target", step.target);
        setIdx(nextIdx);
        return;
      }
      const offset = step.offset
        ? {
            x: step.offset.x * target.clientWidth,
            y: step.offset.y * target.clientHeight,
          }
        : undefined;
      const position = getPosition(target, ref.current, offset);
      setMessage({
        text: step.text,
        show: true,
        position,
      });
      delay(1500)
        .then(() => setMessage({ show: false, position, text: step.text }))
        .then(() => delay(animationMs))
        .then(() => setIdx(nextIdx));
    })();
  }, [ref, idx]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      {children}
      <Box
        sx={{
          position: "absolute" as "absolute",
          left: pct2css(message.position.x),
          top: pct2css(message.position.y),
          width: 250,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          border: "2px solid #000",
          boxShadow: 36,
          transition: `opacity ${animationMs / 2}ms`,
          p: 2,
          zIndex: 100,
          opacity: message.show ? 1.0 : 0.0,
        }}
      >
        <Typography>{message.text}</Typography>
      </Box>
    </div>
  );
};

export default Demonstrator;
export { Step };
