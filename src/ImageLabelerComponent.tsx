import React from 'react';
import { Streamlit, withStreamlitConnection } from 'streamlit-component-lib';
import ImageLabeler, { Labels, Config } from 'react-image-labeler';

interface State {
  src: string;
  labels: Labels;
  config: Config;
  key: string;
  action: 'next' | 'prev' | 'delete' | 'ignore' | 'unignore' | '';
  metadata: { [key: string]: string };
  progress: number;
  buttons: {
    next: boolean;
    prev: boolean;
    save: boolean;
    config: boolean;
    delete: boolean;
    ignore: boolean;
    unignore: boolean;
  };
}

const useStreamlitState = <T extends { key: string }>(
  python: T
): [T, (updated: T) => void] => {
  const [state, setState] = React.useState<T>(python);
  React.useEffect(() => {
    setState(python);
  }, [python]);
  React.useEffect(() => Streamlit.setComponentValue(state), []);
  return [
    state,
    (updated: T) => {
      setState(updated);
      Streamlit.setComponentValue(updated);
    },
  ];
};

const ImageLabelerComponent: React.FC<{ args: State }> = ({ args }) => {
  const [state, setState] = useStreamlitState(args);
  const mode =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  React.useEffect(() => Streamlit.setFrameHeight());
  return (
    <div>
      <ImageLabeler
        src={state.src}
        labels={state.labels}
        config={state.config}
        options={{ mode, progress: state.progress }}
        metadata={state.metadata}
        callbacks={{
          onSave: (labels) => setState({ ...state, labels }),
          onSaveConfig: state.buttons['config']
            ? (config) => setState({ ...state, config })
            : undefined,
          onNext: state.buttons['next']
            ? () => setState({ ...state, action: 'next' })
            : undefined,
          onPrev: state.buttons['prev']
            ? () => setState({ ...state, action: 'prev' })
            : undefined,
          onDelete: state.buttons['delete']
            ? () => setState({ ...state, action: 'delete' })
            : undefined,
          onIgnore: state.buttons['ignore']
            ? () => setState({ ...state, action: 'ignore' })
            : undefined,
          onUnignore: state.buttons['unignore']
            ? () => setState({ ...state, action: 'unignore' })
            : undefined,
        }}
      />
    </div>
  );
};

export default withStreamlitConnection(ImageLabelerComponent);
