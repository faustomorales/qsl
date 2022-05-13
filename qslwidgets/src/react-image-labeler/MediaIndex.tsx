import React from "react";
import { Button, Box, ButtonGroup } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ArrowBack } from "@mui/icons-material";

interface MediaIndexProps {
  idx: number;
  grid: {
    rows: { [key: string]: string | number | null }[];
    columns: GridColDef[];
  };
  label: (idx: number) => void;
}

const MediaIndex: React.FC<MediaIndexProps> = ({ idx, grid, label }) => {
  const rowsPerPage = 5;
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(Math.floor(idx / rowsPerPage)), [idx]);
  return (
    <Box>
      <Box style={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={grid.rows}
          columns={grid.columns}
          pageSize={5}
          rowsPerPageOptions={[rowsPerPage]}
          disableSelectionOnClick
          onRowClick={(params) => label(params.id as number)}
          selectionModel={[idx]}
          page={page}
          onPageChange={setPage}
          hideFooterSelectedRowCount
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
