import React from "react";

export interface AdminTableHeaderColumn {
  key?: string;
  label: string;
  align?: "left" | "right";
}

export interface AdminTableHeaderProps {
  columns: AdminTableHeaderColumn[];
}

export const AdminTableHeader: React.FC<AdminTableHeaderProps> = ({ columns }) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        {columns.map((col) => (
          <th
            key={col.key ?? col.label}
            className={`px-4 py-3 font-semibold text-gray-600 ${
              col.align === "right" ? "text-right" : "text-left"
            }`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
};

export default AdminTableHeader;
