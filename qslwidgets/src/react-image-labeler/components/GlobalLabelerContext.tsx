import React from "react";

type GlobalLabelerContextProps = {
  setFocus: () => void;
  setToast: (message: string) => void;
  hasFocus: boolean;
  container: React.MutableRefObject<HTMLElement | null>;
};

const GlobalLabelerContext = React.createContext<GlobalLabelerContextProps>(
  {} as GlobalLabelerContextProps
);

export default GlobalLabelerContext;
