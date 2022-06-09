import React from "react";
import { Button, Box, ButtonGroup, styled } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { ArrowBack } from "@mui/icons-material";
import GlobalLabelerContext from "./components/GlobalLabelerContext";
import { IndexState } from "./components/library/types";
import { simulateClick, useKeyboardEvent } from "./components/library/hooks";

interface MediaIndexProps<T extends string> {
  idx: number;
  rowKey: T;
  indexState: IndexState<T>;
  setIndexState: (indexState: IndexState<T>) => void;
  label: (idx: number) => void;
}

const StyledGrid = styled(DataGrid)`
  & .MuiDataGrid-cell:focus {
    outline: none;
  }
`;

const MediaIndex = <T extends string>({
  idx,
  indexState,
  setIndexState,
  label,
  rowKey,
}: MediaIndexProps<T>) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { setFocus, maxViewHeight } = React.useContext(GlobalLabelerContext);
  useKeyboardEvent(
    (event) => {
      if (!ref.current) {
        return;
      }
      let target: string;
      switch (event.key) {
        case "ArrowRight":
          target = `.MuiTablePagination-actions button:nth-of-type(2)`;
          break;
        case "ArrowLeft":
          target = `.MuiTablePagination-actions button:nth-of-type(1)`;
          break;
        default:
          return;
      }
      if (!target) {
        return;
      }
      const element = ref.current.querySelector(target);
      if (element) {
        simulateClick(element as HTMLElement);
        setFocus();
      }
    },
    [ref]
  );
  return (
    <Box onClick={setFocus}>
      <Box style={{ height: maxViewHeight, width: "100%" }} ref={ref}>
        <StyledGrid
          disableColumnFilter
          rows={indexState.rows}
          rowCount={indexState.rowCount}
          columns={indexState.columns}
          paginationMode="server"
          autoHeight
          pageSize={indexState.rowsPerPage}
          rowsPerPageOptions={[indexState.rowsPerPage]}
          disableSelectionOnClick
          onRowClick={(params) => label(params.id as number)}
          selectionModel={[idx]}
          page={indexState.page}
          onPageChange={(page) => setIndexState({ ...indexState, page })}
          sortModel={indexState.sortModel}
          onSortModelChange={(sortModel) =>
            setIndexState({ ...indexState, sortModel })
          }
          hideFooterSelectedRowCount
          getRowId={(row) => row[rowKey]}
        />
      </Box>
      <ButtonGroup
        sx={{ mt: 2 }}
        fullWidth
        size="small"
        aria-label="index control menu"
      >
        <Button onClick={() => label(idx)} startIcon={<ArrowBack />}>
          Back to Labeling
        </Button>
      </ButtonGroup>
    </Box>
  );
};

export default MediaIndex;
