import React from "react";
import { MediaIndex, Labeler } from "../react-image-labeler";

const grid = {
  columns: [
    { field: "id", headerName: "ID", width: 90 },
    {
      field: "firstName",
      headerName: "First name",
      width: 150,
    },
    {
      field: "lastName",
      headerName: "Last name",
      width: 150,
    },
    {
      field: "age",
      headerName: "Age",
      type: "number",
      width: 110,
    },
  ],
  rows: [
    { id: 0, lastName: "Snow", firstName: "Jon", age: 35 },
    { id: 1, lastName: "Lannister", firstName: "Cersei", age: 42 },
    { id: 2, lastName: "Lannister", firstName: "Jaime", age: 45 },
    { id: 3, lastName: "Stark", firstName: "Arya", age: 16 },
    { id: 4, lastName: "Targaryen", firstName: "Daenerys", age: null },
    { id: 5, lastName: "Melisandre", firstName: null, age: 150 },
    { id: 6, lastName: "Clifford", firstName: "Ferrara", age: 44 },
    { id: 7, lastName: "Frances", firstName: "Rossini", age: 36 },
    { id: 8, lastName: "Roxie", firstName: "Harvey", age: 65 },
  ],
};

export const BasicUsage: React.FC = () => {
  const [idx, setIdx] = React.useState(0);
  const [sortedIdxs, setSortedIdxs] = React.useState(
    grid.rows.map((r) => r.id)
  );
  return (
    <Labeler>
      <MediaIndex
        viewHeight={400}
        setSortedIdxs={setSortedIdxs}
        sortedIdxs={sortedIdxs}
        grid={grid}
        idx={idx}
        label={setIdx}
        rowKey={"id"}
        visible={true}
      />
    </Labeler>
  );
};

export default {
  title: "MediaIndex",
};
