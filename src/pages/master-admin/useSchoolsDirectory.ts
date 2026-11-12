import { useState, useCallback, useEffect } from "react";
import type { MasterAdminSchoolSummary, MasterAdminSchoolKpis } from "../../types/masterAdmin";

export function useSchoolsDirectory(token?: string | null) {
  const [schools, setSchools] = useState<MasterAdminSchoolSummary[]>([]);
  const [kpis, setKpis] = useState<MasterAdminSchoolKpis>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [joinedFilter, setJoinedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<MasterAdminSchoolSummary | null>(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        plan: planFilter,
        status: statusFilter,
        state: stateFilter,
        joined: joinedFilter,
      });

      const res = await fetch(`/api/master-admin/schools?${params}`, {
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch schools directory: HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        setSchools(json.data || []);
        setTotal(json.meta?.total || 0);
        if (json.kpis) {
          setKpis(json.kpis);
        }

        setSelectedSchool((prev) => {
          if (!prev && json.data?.length > 0) {
            return json.data[0];
          }
          if (prev && json.data) {
            const refreshed = json.data.find((s: MasterAdminSchoolSummary) => s.id === prev.id);
            return refreshed || prev;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn("Failed to fetch schools directory:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, planFilter, statusFilter, stateFilter, joinedFilter, token]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams({
        search,
        plan: planFilter,
        status: statusFilter,
        state: stateFilter,
      });

      const res = await fetch(`/api/master-admin/schools/export?${params}`, {
        headers: {
          Authorization: `Bearer ${token || "test-token-admin"}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed: HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `myzkool-institutions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export institutions CSV.");
    }
  };

  return {
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
  };
}
