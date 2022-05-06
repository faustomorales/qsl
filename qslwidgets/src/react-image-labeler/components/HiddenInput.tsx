import React from "react";

const HiddenInput = React.forwardRef<HTMLInputElement, {}>((props, ref) => (
  <div style={{ width: 0, height: 0, overflow: "hidden" }}>
    <input ref={ref} className="react-image-labeler-input-target" />
  </div>
));

export default HiddenInput;
