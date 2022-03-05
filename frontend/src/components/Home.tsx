import ProjectList from './ProjectList';
import UserList from './UserList';
import LabelingStatus from './LabelingStatus';
import * as mui from '@material-ui/core';
import * as rrd from 'react-router-dom';

export const Home = () => {
  // Set state variables
  return (
    <mui.Grid container spacing={2}>
      <mui.Grid item xs={12}>
        <LabelingStatus>
          <rrd.Link to="/">QSL</rrd.Link>
        </LabelingStatus>
      </mui.Grid>
      <mui.Grid item xs={12}>
        <mui.Typography
          style={{ marginTop: '10px', marginBottom: '10px' }}
          variant={'h4'}
        >
          Projects
        </mui.Typography>
        <ProjectList />
        <mui.Typography
          style={{ marginTop: '20px', marginBottom: '10px' }}
          variant={'h4'}
        >
          Users
        </mui.Typography>
        <UserList />
      </mui.Grid>
    </mui.Grid>
  );
};
