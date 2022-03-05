import * as mui from '@material-ui/core';
import * as muis from '@material-ui/styles';

const ShortcutButton = muis.withStyles({
  startIcon: {
    position: 'absolute',
    left: '8px',
  },
  label: {
    paddingLeft: '40px',
  },
})(mui.Button);

export default ShortcutButton;
