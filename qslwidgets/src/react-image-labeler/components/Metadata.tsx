import React from "react";
import {
  TableBody,
  TableContainer,
  Table,
  Paper,
  TableRow,
  TableCell,
} from "@mui/material";

type MetadataProps = {
  data: { [key: string]: string };
};

const Metadata: React.FC<MetadataProps> = ({ data }) => {
  return (
    <TableContainer tabIndex={0} component={Paper} sx={{ mb: 0, mt: 0 }}>
      <Table aria-label="metadata table">
        <TableBody>
          {Object.entries(data).map(([key, value], idx) => (
            <TableRow
              key={idx}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell align="right" component="th" scope="row">
                <b>{key}</b>
              </TableCell>
              <TableCell>{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
export default Metadata;
