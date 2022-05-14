import React from "react";
import { Button, Box, ButtonGroup, styled } from "@mui/material";
import { DataGrid, GridColDef, GridSortModel } from "@mui/x-data-grid";
import { ArrowBack } from "@mui/icons-material";
import GlobalLabelerContext from "./components/GlobalLabelerContext";
import { simulateClick, useKeyboardEvent } from "./components/library/hooks";

interface MediaIndexProps<T extends string> {
  idx: number;
  grid: {
    rows: {
      [key in T | string]: key extends T ? number : number | string | null;
    }[];
    columns: GridColDef[];
  };
  rowKey: T;
  label: (idx: number) => void;
  visible: boolean;
  viewHeight: number;
  sortedIdxs: number[];
  setSortedIdxs: (updated: number[]) => void;
}

const StyledGrid = styled(DataGrid)`
  & .MuiDataGrid-cell:focus {
    outline: none;
  }
`;

const MediaIndex = <T extends string>(props: MediaIndexProps<T>) => {
  const {
    idx,
    grid,
    label,
    rowKey,
    visible,
    viewHeight,
    sortedIdxs,
    setSortedIdxs,
  } = props;
  const rowsPerPage = Math.floor(viewHeight / 60);
  const ref = React.useRef<HTMLDivElement>(null);
  const [page, setPage] = React.useState(0);
  const [sortModel, setSortModel] = React.useState([] as GridSortModel);
  const { setFocus } = React.useContext(GlobalLabelerContext);
  React.useEffect(() => {
    if (sortModel.length > 0) {
      const sortKey = sortModel[0].field;
      if (sortKey === "mediaIndexSortState") {
        return;
      }
      const sortOrd = sortModel[0].sort;
      setSortedIdxs(
        grid.rows
          .slice()
          .sort((r1, r2) => {
            const v1 = r1[sortKey] as any;
            const v2 = r2[sortKey] as any;
            const sv = sortOrd === "asc" ? 1 : -1;
            return v1 == v2 ? 0 : v1 > v2 ? sv : -sv;
          })
          .map((r) => r[rowKey] as number)
      );
    } else {
      setSortedIdxs(grid.rows.map((r) => r[rowKey] as number));
    }
  }, [sortModel]);
  React.useEffect(() => {
    if (!visible) {
      return;
    }
    setSortModel([{ field: "mediaIndexSortState", sort: "asc" }]);
  }, [visible]);
  const setPageToShowSelected = React.useCallback(() => {
    if (!visible) {
      // Don't bother doing anything if we're not visible.
      return;
    }
    const sortedIdx = sortedIdxs.findIndex((sIdx) => sIdx === idx);
    setPage(Math.floor(sortedIdx / rowsPerPage)), [idx];
  }, [idx, sortModel, visible]);

  useKeyboardEvent(
    (event) => {
      if (!ref.current || !visible) {
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
    [page, ref, visible]
  );
  // Whenever the index or visibility changes, try
  // to set the page to show the currently selected
  // image in the table.
  React.useEffect(setPageToShowSelected, [idx, visible]);
  const rows = React.useMemo(
    () =>
      grid.rows.map((r) => {
        return {
          ...r,
          mediaIndexSortState: sortedIdxs.indexOf(r[rowKey] as number),
        };
      }),
    [sortedIdxs, grid.rows]
  );
  return (
    <Box onClick={setFocus}>
      <Box style={{ height: viewHeight, width: "100%" }} ref={ref}>
        <StyledGrid
          disableColumnFilter
          rows={rows}
          columns={grid.columns.concat({
            field: "mediaIndexSortState",
            hide: true,
          })}
          pageSize={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          disableSelectionOnClick
          onRowClick={(params) => {
            label(params.id as number);
          }}
          selectionModel={[idx]}
          page={page}
          onPageChange={setPage}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
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
