import React from "react";
import { Box } from "@mui/material";
import RangeSlider from "./RangeSlider";
import { useMediaLarge } from "./library/hooks";
import { ImageEnhancements } from "./library/types";

const EnhancementControls: React.FC<{
  enhancements: ImageEnhancements;
  setEnhancements: (updated: ImageEnhancements) => void;
}> = ({ enhancements, setEnhancements }) => {
  const large = useMediaLarge();
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: large ? `1fr 1fr 1fr` : `1fr`,
        columnGap: 2,
      }}
    >
      {[
        { key: "saturation", name: "Saturation" },
        { key: "brightness", name: "Brightness" },
        { key: "contrast", name: "Contrast" },
      ].map((e) => (
        <RangeSlider
          min={0}
          max={10}
          step={0.1}
          name={e.name}
          key={e.key}
          value={enhancements[e.key as keyof ImageEnhancements]}
          onValueChange={(value) =>
            setEnhancements({ ...enhancements, [e.key]: value })
          }
          marks={[{ value: 1 }]}
        />
      ))}
    </Box>
  );
};

export default EnhancementControls;
