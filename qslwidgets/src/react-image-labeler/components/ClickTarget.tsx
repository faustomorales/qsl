import React from "react";
import { Box } from "@mui/material";
import GlobalLabelerContext from "./GlobalLabelerContext";

const ClickTarget: React.FC = () => {
  const context = React.useContext(GlobalLabelerContext);
  return (
    <Box
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
      }}
      onClick={context.setFocus}
    />
  );
};

export default ClickTarget;
