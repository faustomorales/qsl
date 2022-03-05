import * as sharedTypes from './sharedTypes';
import * as mui from '@material-ui/core';
import * as muis from '@material-ui/core/styles';

const useStyles = muis.makeStyles((theme) => ({
  root: {
    '& a': {
      color: 'white',
      textDecoration: 'none',
    },
  },
}));

const LabelingStatus = (props: {
  project?: sharedTypes.Project;
  children: React.ReactNode;
  position?: 'static' | 'fixed';
}) => {
  const progress =
    props.project && props.project.nImages !== 0
      ? Math.round((100 * props.project.nLabeled) / props.project.nImages)
      : null;
  const classes = useStyles();
  return (
    <mui.AppBar position={props.position ?? 'static'} style={{ zIndex: 1201 }}>
      <mui.Toolbar>
        {progress !== null ? (
          <mui.Box position="relative" display="inline-flex">
            <mui.CircularProgress
              style={{ color: 'white' }}
              variant="determinate"
              size={40}
              color="secondary"
              value={progress}
            />
            <mui.Box
              top={0}
              left={0}
              bottom={0}
              right={0}
              position="absolute"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <mui.Typography
                variant="caption"
                component="div"
                style={{ color: 'white' }}
              >{`${progress}%`}</mui.Typography>
            </mui.Box>
          </mui.Box>
        ) : null}
        <mui.Typography
          variant="h6"
          style={{ marginLeft: '10px' }}
          className={classes.root}
        >
          {props.children}
        </mui.Typography>
      </mui.Toolbar>
    </mui.AppBar>
  );
};
export default LabelingStatus;
