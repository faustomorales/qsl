import * as sharedTypes from "./sharedTypes";
import * as mui from "@material-ui/core";

const LabelingStatus = (props: {
  project: sharedTypes.Project;
  children: React.ReactNode;
}) => {
  const progress = Math.round(
    (100 * props.project.nLabeled) / props.project.nImages
  );
  return (
    <mui.AppBar position="static">
      <mui.Toolbar>
        <mui.Box position="relative" display="inline-flex">
          <mui.CircularProgress
            style={{ color: "white" }}
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
              style={{ color: "white" }}
            >{`${progress}%`}</mui.Typography>
          </mui.Box>
        </mui.Box>
        <mui.Typography variant="h6" style={{ marginLeft: "10px" }}>
          {props.children}
        </mui.Typography>
      </mui.Toolbar>
    </mui.AppBar>
  );
};
export default LabelingStatus;
