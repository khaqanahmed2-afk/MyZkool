import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type {
  MasterAdminSchoolSummary,
} from "../../services/masterAdminSchoolService";

import { SchoolsPageHeader } from "../../components/master-admin/schools/SchoolsPageHeader";
import { SchoolsNavTabs, type NavTab } from "../../components/master-admin/schools/SchoolsNavTabs";
import { SchoolsOverviewKpiSection } from "../../components/master-admin/schools/SchoolsOverviewKpiSection";
import { OverviewDirectoryTab } from "../../components/master-admin/schools/OverviewDirectoryTab";
import {
  MasterAdminSchoolModals,
  type SchoolActiveModalType,
} from "../../components/master-admin/schools/MasterAdminSchoolModals";
import { OnboardingTab } from "../../components/master-admin/schools/OnboardingTab";
import { SubscriptionsTab } from "../../components/master-admin/schools/SubscriptionsTab";
import { TenantsTab } from "../../components/master-admin/schools/TenantsTab";
import { ActivityMonitoringTab } from "../../components/master-admin/schools/ActivityMonitoringTab";
import { ReportsTab } from "../../components/master-admin/schools/ReportsTab";
import { useSchoolsDirectory } from "./useSchoolsDirectory";

export default function MasterAdminSchools() {
  const { token, hasPermission } = useMasterAdminAuth();
  const navigate = useNavigate();

  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<NavTab>("overview");

  // School directory custom hook (state, fetching, CSV export)
  const {
    schools,
    kpis,
    total,
    page,
    limit,
    search,
    planFilter,
    statusFilter,
    stateFilter,
    joinedFilter,
    loading,
    selectedSchool,
    setSelectedSchool,
    setPage,
    setLimit,
    setSearch,
    setPlanFilter,
    setStatusFilter,
    setStateFilter,
    setJoinedFilter,
    fetchSchools,
    handleExportCsv,
  } = useSchoolsDirectory(token);

  // Modals state
  const [activeModal, setActiveModal] = useState<SchoolActiveModalType>(null);
  const [modalSchool, setModalSchool] = useState<MasterAdminSchoolSummary | null>(null);
  const [bulkTargetSchools, setBulkTargetSchools] = useState<MasterAdminSchoolSummary[]>([]);

  // Action dispatcher from table or drawer
  const handleAction = (school: MasterAdminSchoolSummary, action: string) => {
    switch (action) {
      case "edit":
        navigate(`/master-admin/schools/${school.id}`);
        break;
      case "change_plan":
        setModalSchool(school);
        setActiveModal("change_plan");
        break;
      case "extend_trial":
        setModalSchool(school);
        setActiveModal("extend_trial");
        break;
      case "extend_subscription":
        setModalSchool(school);
        setActiveModal("extend_subscription");
        break;
      case "suspend":
        setModalSchool(school);
        setActiveModal("suspend");
        break;
      case "reactivate":
        setModalSchool(school);
        setActiveModal("reactivate");
        break;
      case "manage_modules":
        setModalSchool(school);
        setActiveModal("manage_modules");
        break;
      case "subscription_history":
        setModalSchool(school);
        setActiveModal("subscription_history");
        break;
      case "manage_users":
        navigate(`/master-admin/users?school_id=${school.id}`);
        break;
      case "view_logs":
      case "activity":
        setSelectedSchool(school);
        break;
      default:
        setSelectedSchool(school);
        break;
    }
  };

  const pendingOnboardingCount = kpis.pending_onboarding || 0;

  return (
    <div className="space-y-6">
      <SchoolsPageHeader canCreate={hasPermission("schools.create")} />
      <SchoolsNavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingOnboardingCount={pendingOnboardingCount}
      />

      {/* ── TAB 1: OVERVIEW (Mockup Primary Layout) ──────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top 4 Big KPI Cards + 6 Secondary Metrics Ribbon */}
          <SchoolsOverviewKpiSection kpis={kpis} loading={loading} />

          {/* Main Content: Split Grid with Directory Table & Selected School Drawer */}
          <OverviewDirectoryTab
            schools={schools}
            total={total}
            page={page}
            limit={limit}
            search={search}
            planFilter={planFilter}
            statusFilter={statusFilter}
            stateFilter={stateFilter}
            joinedFilter={joinedFilter}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            onPlanChange={(v) => {
              setPlanFilter(v);
              setPage(1);
            }}
            onStatusChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            onStateChange={(v) => {
              setStateFilter(v);
              setPage(1);
            }}
            onJoinedChange={(v) => {
              setJoinedFilter(v);
              setPage(1);
            }}
            onPageChange={setPage}
            onLimitChange={(lim) => {
              setLimit(lim);
              setPage(1);
            }}
            onSelectSchool={setSelectedSchool}
            selectedSchoolId={selectedSchool?.id}
            onAction={handleAction}
            onExport={handleExportCsv}
            onBulkAction={(targeted) => {
              setBulkTargetSchools(targeted);
              setActiveModal("bulk_action");
            }}
            loading={loading}
            selectedSchool={selectedSchool}
            onCloseDrawer={() => setSelectedSchool(null)}
            token={token}
          />
        </div>
      )}

      {/* ── TAB 2: ALL SCHOOLS ───────────────────────────────────────── */}
      {activeTab === "all_schools" && (
        <OverviewDirectoryTab
          schools={schools}
          total={total}
          page={page}
          limit={limit}
          search={search}
          planFilter={planFilter}
          statusFilter={statusFilter}
          stateFilter={stateFilter}
          joinedFilter={joinedFilter}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onPlanChange={(v) => {
            setPlanFilter(v);
            setPage(1);
          }}
          onStatusChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          onStateChange={(v) => {
            setStateFilter(v);
            setPage(1);
          }}
          onJoinedChange={(v) => {
            setJoinedFilter(v);
            setPage(1);
          }}
          onPageChange={setPage}
          onLimitChange={(lim) => {
            setLimit(lim);
            setPage(1);
          }}
          onSelectSchool={setSelectedSchool}
          selectedSchoolId={selectedSchool?.id}
          onAction={handleAction}
          onExport={handleExportCsv}
          onBulkAction={(targeted) => {
            setBulkTargetSchools(targeted);
            setActiveModal("bulk_action");
          }}
          loading={loading}
          selectedSchool={selectedSchool}
          onCloseDrawer={() => setSelectedSchool(null)}
          token={token}
        />
      )}

      {/* ── TAB 3: ONBOARDING ───────────────────────────────────────── */}
      {activeTab === "onboarding" && (
        <OnboardingTab
          schools={schools}
          onSelectSchool={(s) => {
            setSelectedSchool(s);
            setActiveTab("overview");
          }}
          onReviewSchool={(s) => {
            setModalSchool(s);
            setActiveModal("onboarding_review");
          }}
        />
      )}

      {/* ── TAB 4: SUBSCRIPTIONS ────────────────────────────────────── */}
      {activeTab === "subscriptions" && (
        <SubscriptionsTab
          schools={schools}
          onAction={handleAction}
          onSelectSchool={(s) => {
            setSelectedSchool(s);
            setActiveTab("overview");
          }}
        />
      )}

      {/* ── TAB 5: TENANTS ──────────────────────────────────────────── */}
      {activeTab === "tenants" && (
        <TenantsTab
          schools={schools}
          onSelectSchool={(s) => {
            setSelectedSchool(s);
            setActiveTab("overview");
          }}
        />
      )}

      {/* ── TAB 6: ACTIVITY & MONITORING ────────────────────────────── */}
      {activeTab === "activity" && (
        <ActivityMonitoringTab
          schools={schools}
          token={token}
          onSelectSchool={(s) => {
            setSelectedSchool(s);
            setActiveTab("overview");
          }}
        />
      )}

      {/* ── TAB 7: REPORTS ──────────────────────────────────────────── */}
      {activeTab === "reports" && (
        <ReportsTab schools={schools} onExport={handleExportCsv} />
      )}

      {/* ── ACTION MODALS ────────────────────────────────────────── */}
      <MasterAdminSchoolModals
        activeModal={activeModal}
        modalSchool={modalSchool}
        bulkTargetSchools={bulkTargetSchools}
        token={token}
        onClose={() => {
          setActiveModal(null);
          setModalSchool(null);
          setBulkTargetSchools([]);
        }}
        onSuccess={fetchSchools}
      />
    </div>
  );
}
