import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export interface StudentPageHeaderProps {
  currentPage: string;
  title: string;
  description: string;
}

export const StudentPageHeader: React.FC<StudentPageHeaderProps> = ({
  currentPage,
  title,
  description,
}) => {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link to="/admin/students" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Students
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-900">{currentPage}</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
};

export default StudentPageHeader;
