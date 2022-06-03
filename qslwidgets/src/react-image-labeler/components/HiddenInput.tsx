import React from "react";

const HiddenInput = React.forwardRef<HTMLDivElement, {}>((props, ref) => (
  <div style={{ width: 0, height: 0, overflow: "hidden" }}>
    <div ref={ref} className="react-image-labeler-input-target" tabIndex={-1} />
  </div>
));

export default HiddenInput;
