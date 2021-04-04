import * as sharedTypes from "./sharedTypes";
import * as common from "./common";

import * as react from "react";
import * as mui from "@material-ui/core";
import * as muidg from "@material-ui/data-grid";

const UserList = () => {
  // Set state variables
  const [state, setState] = react.useState({
    newUserName: "",
    users: [] as sharedTypes.User[],
    myUser: null as sharedTypes.User,
    authConfig: null as sharedTypes.AuthConfig,
    newUserAdmin: false,
  });

  // Implement backend API operations
  react.useEffect(() => {
    Promise.all([
      common.getMyUser(),
      common.getUsers(),
      common.getAuthConfig(),
    ]).then(([myUser, users, authConfig]) => {
      setState({
        ...state,
        myUser,
        users,
        authConfig,
      });
    });
  }, []);

  const createUser = react.useCallback(() => {
    common
      .createUser({
        name: state.newUserName,
        isAdmin: state.newUserAdmin,
        id: null,
      })
      .then((newUser) => {
        setState({
          ...state,
          newUserName: "",
          users: state.users.concat([newUser]),
        });
      });
  }, [state]);
  if (!state.myUser || !state.authConfig) {
    return null;
  }
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <mui.Typography variant={"body1"}>
          {state.authConfig.provider === "github"
            ? "You are using GitHub as the authentication provider. Usernames should match GitHub usernames."
            : null}
          {state.authConfig.provider === "google"
            ? "You are using Google as the authentication provider. Usernames should match email addresses."
            : null}
          {state.authConfig.provider === null
            ? "You are not using an authentication provider. You will always be logged in as the first user."
            : null}
        </mui.Typography>
      </mui.Grid>
      <mui.Grid item xs={12}>
        <muidg.DataGrid
          rows={state.users}
          autoHeight
          columns={[
            {
              field: "id",
              headerName: "ID",
              flex: 1,
              disableColumnMenu: true,
            },
            {
              field: "name",
              headerName: "Name",
              flex: 5,
              disableColumnMenu: true,
            },
            {
              field: "isAdmin",
              headerName: "Adminstrator",
              flex: 2,
              valueFormatter: (params: muidg.ValueFormatterParams) =>
                params.value ? "Yes" : "No",
              disableColumnMenu: true,
            },
          ]}
        />
      </mui.Grid>
      <mui.Grid item xs={12}>
        {state.myUser.isAdmin ? (
          <mui.Grid container direction={"row"}>
            <mui.Input
              value={state.newUserName}
              onChange={(event) =>
                setState({ ...state, newUserName: event.target.value })
              }
              placeholder={"New user name"}
            />
            <mui.FormControlLabel
              control={
                <mui.Checkbox
                  checked={state.newUserAdmin}
                  onChange={(event, checked) =>
                    setState({ ...state, newUserAdmin: checked })
                  }
                  name="makeAdmin"
                />
              }
              label="Administrator"
            />
            <mui.Button
              disabled={state.newUserName === ""}
              onClick={createUser}
            >
              Create User
            </mui.Button>
          </mui.Grid>
        ) : null}
      </mui.Grid>
    </mui.Grid>
  );
};

export default UserList;
