import { Context } from "./Context";
import LabelingStatus from "./LabelingStatus";
import * as sharedTypes from "./sharedTypes";

import * as react from "react";
import * as rrd from "react-router-dom";
import * as mui from "@material-ui/core";
import * as muidg from "@material-ui/data-grid";

export const UserCreator = () => {
  // Get context variables.
  const context = react.useContext(Context);

  // Set state variables
  const [name, setName] = react.useState("");
  const [admin, setAdmin] = react.useState(false);
  const [users, setUsers] = react.useState([]);
  const [myUser, setMyUser] = react.useState<sharedTypes.User>(null);
  const [authConfig, setAuthConfig] = react.useState<sharedTypes.AuthConfig>(
    null
  );

  // Implement backend API operations
  react.useEffect(() => {
    fetch(`${context.apiUrl}/api/v1/users/me`, { ...context.getHeaders })
      .then((r) => r.json())
      .then(setMyUser);
  }, []);

  react.useEffect(() => {
    fetch(`${context.apiUrl}/api/v1/users`, { ...context.getHeaders })
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  react.useEffect(() => {
    fetch(`${context.apiUrl}/api/v1/auth/config`, { ...context.getHeaders })
      .then((r) => r.json())
      .then(setAuthConfig);
  }, []);

  const createUser = react.useCallback(() => {
    fetch(`${context.apiUrl}/api/v1/users`, {
      ...context.postHeaders,
      body: JSON.stringify({ name, isAdmin: admin }),
    })
      .then((r) => r.json())
      .then((user: sharedTypes.User) => {
        setUsers(users.concat([user]));
        setName("");
      });
  }, [admin, name, users, setUsers]);
  if (!myUser || !authConfig) {
    return null;
  }
  return (
    <mui.Grid container spacing={2}>
      <LabelingStatus>
        QSL / <rrd.Link to="/users">Users</rrd.Link>
      </LabelingStatus>
      <mui.Grid item xs={12}>
        <mui.Typography variant={"body1"}>
          {authConfig.provider === "github"
            ? "You are using GitHub as the authentication provider. Usernames should match GitHub usernames."
            : null}
          {authConfig.provider === "google"
            ? "You are using Google as the authentication provider. Usernames should match email addresses."
            : null}
          {authConfig.provider === null
            ? "You are not using an authentication provider. You will always be logged in as the first user."
            : null}
        </mui.Typography>
      </mui.Grid>
      <mui.Grid item xs={12}>
        <muidg.DataGrid
          rows={users}
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
        {myUser.isAdmin ? (
          <mui.Grid container direction={"row"}>
            <mui.Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={"New user name"}
            />
            <mui.FormControlLabel
              control={
                <mui.Checkbox
                  checked={admin}
                  onChange={(event, checked) => setAdmin(checked)}
                  name="makeAdmin"
                />
              }
              label="Administrator"
            />
            <mui.Button disabled={name === ""} onClick={createUser}>
              Create User
            </mui.Button>
          </mui.Grid>
        ) : null}
      </mui.Grid>
    </mui.Grid>
  );
};
