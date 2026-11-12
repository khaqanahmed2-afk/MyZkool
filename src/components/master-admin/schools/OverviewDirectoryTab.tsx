import React from "react";
import type { MasterAdminSchoolSummary, SchoolActionType } from "../../../types/masterAdmin";
import { SchoolsDirectoryTable } from "./SchoolsDirectoryTable";
import { InstitutionDetailDrawer } from "./InstitutionDetailDrawer";

interface OverviewDirectoryTabProps {
  schools: MasterAdminSchoolSummary[];
  total: number;
  page: number;
  limit: number;
  search: string;
  planFilter: string;
  statusFilter: string;
  stateFilter: string;
  joinedFilter: string;
  onSearchChange: (v: string) => void;
  onPlanChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onJoinedChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onLimitChange: (lim: number) => void;
  onSelectSchool: (s: MasterAdminSchoolSummary) => void;
  selectedSchoolId?: string;
  onAction: (action: SchoolActionType, school: MasterAdminSchoolSummary) => void;
  onExport: () => void;
  onBulkAction: (schools: MasterAdminSchoolSummary[]) => void;
  loading: boolean;
  selectedSchool: MasterAdminSchoolSummary | null;
  onCloseDrawer: () => void;
  token: string | null;
}

export const OverviewDirectoryTab: React.FC<OverviewDirectoryTabProps> = ({
  schools,
  total,
  page,
  limit,
  search,
  planFilter,
  statusFilter,
  stateFilter,
  joinedFilter,
  onSearchChange,
  onPlanChange,
  onStatusChange,
  onStateChange,
  onJoinedChange,
  onPageChange,
  onLimitChange,
  onSelectSchool,
  selectedSchoolId,
  onAction,
  onExport,
  onBulkAction,
  loading,
  selectedSchool,
  onCloseDrawer,
  token,
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className={selectedSchool ? "xl:col-span-8" : "xl:col-span-12"}>
        <SchoolsDirectoryTable
          schools={schools}
          total={total}
          page={page}
          limit={limit}
          search={search}
          planFilter={planFilter}
          statusFilter={statusFilter}
          stateFilter={stateFilter}
          joinedFilter={joinedFilter}
          onSearchChange={onSearchChange}
          onPlanChange={onPlanChange}
          onStatusChange={onStatusChange}
          onStateChange={onStateChange}
          onJoinedChange={onJoinedChange}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          onSelectSchool={onSelectSchool}
          selectedSchoolId={selectedSchoolId}
          onAction={onAction}
          onExport={onExport}
          onBulkAction={onBulkAction}
          loading={loading}
        />
      </div>

      {selectedSchool && (
        <div className="xl:col-span-4">
          <InstitutionDetailDrawer
            school={selectedSchool}
            onClose={onCloseDrawer}
            onAction={onAction}
            token={token}
          />
        </div>
      )}
    </div>
  );
};
