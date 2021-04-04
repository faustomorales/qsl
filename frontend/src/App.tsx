import * as mui from "@material-ui/core";
import * as rrd from "react-router-dom";
import * as components from "./components";
import * as react from "react";
import * as common from "./components/common";

const theme = mui.createMuiTheme({
  components: {
    // Name of the component
    MuiImageListItem: {
      styleOverrides: {
        // Name of the slot
        img: {
          maxWidth: "100%",
          maxHeight: "100%",
          height: "auto",
          width: "auto",
          transform: "none",
          margin: "auto",
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
    },
  },
});

const App = () => {
  const [state, setState] = react.useState({user: undefined})
  react.useEffect(() => {
    common.getMyUser().then((user) => setState({ user }), () => {
      setState({user: null})
    })
  }, [])
  if (state.user === undefined) {
    return null;
  } else if (state.user === null) {
    window.location.href = `${common.apiUrl}/auth/login`;
    return null;
  }
  return (
    <mui.ThemeProvider theme={theme}>
      <rrd.BrowserRouter>
        <rrd.Switch>
          <rrd.Route path="/projects/:projectId/images/:imageId">
            <components.SingleImageLabel />
          </rrd.Route>
          <rrd.Route path="/projects/:projectId/batches/:imageIds">
            <components.BatchImageLabel />
          </rrd.Route>
          <rrd.Route path="/projects/:projectId/edit-project">
            <components.ProjectEditor />
          </rrd.Route>
          <rrd.Route path="/projects/:projectId/add-images">
            <components.ImageAdder />
          </rrd.Route>
          <rrd.Route path="/projects/:projectId">
            <components.ProjectSummary />
          </rrd.Route>
          <rrd.Route path="/projects">
            <components.Home />
          </rrd.Route>
          <rrd.Route path="/users">
            <components.Home />
          </rrd.Route>
          <rrd.Route path="/">
            <components.Home />
          </rrd.Route>
        </rrd.Switch>
      </rrd.BrowserRouter>
    </mui.ThemeProvider>
  );
};

export default App;
