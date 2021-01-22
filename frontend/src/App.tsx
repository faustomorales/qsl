import * as mui from "@material-ui/core";
import * as rrd from "react-router-dom";
import * as components from "./components";
import * as react from "react";

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
  const [context, setContext] = react.useState({
    queueSize: 20,
    apiUrl: process.env.REACT_APP_API_URL || "",
    postHeaders: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include" as RequestCredentials,
    },
    getHeaders: {
      credentials: "include" as RequestCredentials,
    },
    user: undefined,
  });
  react.useEffect(() => {
    fetch(`${context.apiUrl}/api/v1/users/me`, { ...context.getHeaders })
      .then((r) => {
        if (r.ok) {
          return r;
        }
        throw Error(r.statusText);
      })
      .then(
        (r) =>
          r.json().then((user) => {
            setContext({ ...context, user });
          }),
        () => {
          setContext({ ...context, user: null });
        }
      );
  }, []);
  if (context.user === undefined) {
    return null;
  } else if (context.user === null) {
    window.location.href = `${context.apiUrl}/login`;
    return null;
  }
  return (
    <components.Context.Provider value={context}>
      <mui.ThemeProvider theme={theme}>
        <rrd.BrowserRouter>
          <rrd.Switch>
            <rrd.Route path="/projects/:projectId/images/:imageId?">
              <components.SingleImageLabel />
            </rrd.Route>
            <rrd.Route path="/projects/:projectId/batches/:imageIds?">
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
              <components.ProjectList />
            </rrd.Route>
            <rrd.Route path="/users">
              <components.UserCreator />
            </rrd.Route>
            <rrd.Route path="/">
              <rrd.Redirect to={"/projects"} />
            </rrd.Route>
          </rrd.Switch>
        </rrd.BrowserRouter>
      </mui.ThemeProvider>
    </components.Context.Provider>
  );
};

export default App;
