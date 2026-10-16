import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Bus,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  ArrowLeft,
  CheckCircle2,
  X,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
  FileText,
  Fuel,
  Users,
} from "lucide-react";
import {
  getVehicles,
  createVehicle,
  deleteVehicle,
  getVehicleDocuments,
  updateVehicle,
} from "../../../services/transportCoreService";
import type {
  EnrichedVehicle,
  VehicleDocument,
  VehicleType,
  VehicleOwnership,
} from "../../../types/transport";
import { VehicleProfileModal } from "./VehicleProfileModal";
import { useAuth } from "../../../hooks/useAuth";
import { checkSchoolFeature } from "../../../middleware/features";
import { TransportLockedPreview } from "./TransportLockedPreview";

export function VehiclesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { schoolId } = useAuth();

  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [vehicles, setVehicles] = useState<EnrichedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Search and Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [docFilter, setDocFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");

  // Selected vehicle for profile modal
  const [selectedVehicle, setSelectedVehicle] = useState<EnrichedVehicle | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<VehicleDocument[]>([]);

  // Add Vehicle modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("bus");
  const [makeModel, setMakeModel] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [fuelType, setFuelType] = useState("diesel");
  const [ownership, setOwnership] = useState<VehicleOwnership>("owned");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [addError, setAddError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form has unsaved edits
  const hasUnsavedModalEdits = Boolean(
    regNo.trim() || makeModel.trim() || vendorName.trim() || vendorPhone.trim()
  );

  // Safe Back Navigation
  const handleBack = () => {
    if (showAddModal && hasUnsavedModalEdits) {
      if (!window.confirm("You have unsaved changes in the vehicle form. Are you sure you want to discard them and go back?")) {
        return;
      }
    }
    // Check if previous history state exists and was from within this application session
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/admin/transport");
    }
  };

  useEffect(() => {
    if (!schoolId) return;
    checkSchoolFeature(schoolId, "transport").then((enabled) => {
      setHasFeature(enabled);
      if (enabled) {
        loadVehicles();
        // Check if query params have ?action=new
        if (searchParams.get("action") === "new") {
          setShowAddModal(true);
        }
      } else {
        setLoading(false);
      }
    });
  }, [schoolId]);

  async function loadVehicles() {
    if (!schoolId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await getVehicles(schoolId);
      setVehicles(data);

      // If URL has ?id=xxx, auto open its profile modal
      const targetId = searchParams.get("id");
      if (targetId) {
        const found = data.find((v) => v.id === targetId);
        if (found) {
          handleOpenProfile(found);
        }
      }
    } catch (err) {
      console.error("Failed to load fleet vehicles:", err);
      setErrorMessage("Unable to load fleet vehicles. Please check connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!schoolId || refreshing) return;
    setRefreshing(true);
    try {
      const data = await getVehicles(schoolId);
      setVehicles(data);
    } catch (err) {
      console.error("Failed to refresh vehicles:", err);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleOpenProfile(v: EnrichedVehicle) {
    if (!schoolId) return;
    try {
      const docs = await getVehicleDocuments(schoolId, v.id);
      setSelectedDocs(docs);
      setSelectedVehicle(v);
    } catch (err) {
      console.error("Failed to load vehicle documents:", err);
    }
  }

  async function handleRefreshProfile() {
    if (!schoolId || !selectedVehicle) return;
    const updatedList = await getVehicles(schoolId);
    setVehicles(updatedList);
    const found = updatedList.find((v) => v.id === selectedVehicle.id);
    if (found) {
      setSelectedVehicle(found);
      const docs = await getVehicleDocuments(schoolId, found.id);
      setSelectedDocs(docs);
    }
  }

  async function handleDelete(v: EnrichedVehicle) {
    if (!schoolId) return;
    if (!confirm(`Are you sure you want to retire vehicle ${v.registration_no}? Assigned routes may require reassignment.`)) return;
    const res = await deleteVehicle(schoolId, v.id);
    if (!res.success) {
      alert(res.error || "Failed to delete vehicle.");
      return;
    }
    loadVehicles();
  }

  async function handleQuickStatusChange(v: EnrichedVehicle, newStatus: "active" | "maintenance" | "retired") {
    if (!schoolId || v.status === newStatus) return;
    const res = await updateVehicle(schoolId, v.id, { status: newStatus });
    if (!res.success) {
      alert(res.error || "Failed to update vehicle status.");
      return;
    }
    loadVehicles();
  }

  async function handleCreateVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setAddError("");
    setIsSubmitting(true);

    const res = await createVehicle(schoolId, {
      registration_no: regNo,
      vehicle_type: vehicleType,
      make_model: makeModel.trim(),
      capacity: Number(capacity) || 30,
      fuel_type: fuelType,
      ownership,
      vendor_name: ownership === "contract" ? vendorName.trim() : null,
      vendor_phone: ownership === "contract" ? vendorPhone.trim() : null,
      status: "active",
      safety_items: {
        first_aid: false,
        fire_extinguisher: false,
        speed_governor: false,
        cctv: false,
        gps: false,
        attendant_seat: false,
      },
    });

    setIsSubmitting(false);
    if (!res.success) {
      setAddError(res.error || "Failed to register vehicle.");
      return;
    }

    setShowAddModal(false);
    setRegNo("");
    setMakeModel("");
    setCapacity(40);
    setVendorName("");
    setVendorPhone("");
    // Clear ?action=new if present
    if (searchParams.get("action")) {
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
    loadVehicles();
  }

  const handleCloseAddModal = () => {
    if (hasUnsavedModalEdits) {
      if (!window.confirm("Discard changes in the registration form?")) {
        return;
      }
    }
    setShowAddModal(false);
    setAddError("");
    if (searchParams.get("action")) {
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  };

  // Metrics calculation
  const totalCount = vehicles.length;
  const activeCount = useMemo(() => vehicles.filter((v) => v.status === "active").length, [vehicles]);
  const maintenanceCount = useMemo(() => vehicles.filter((v) => v.status === "maintenance").length, [vehicles]);
  const docAlertsCount = useMemo(
    () => vehicles.filter((v) => v.document_status.status === "expired" || v.document_status.status === "expiring_soon").length,
    [vehicles]
  );

  // Filtered list
  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const q = search.toLowerCase().trim();
      const matchQuery =
        !q ||
        v.registration_no.toLowerCase().includes(q) ||
        v.make_model.toLowerCase().includes(q) ||
        (v.vendor_name && v.vendor_name.toLowerCase().includes(q));

      const matchStatus = statusFilter === "all" || v.status === statusFilter;
      const matchType = typeFilter === "all" || v.vehicle_type === typeFilter;
      const matchOwnership = ownershipFilter === "all" || v.ownership === ownershipFilter;
      const matchDoc = docFilter === "all" || v.document_status.status === docFilter;

      return matchQuery && matchStatus && matchType && matchOwnership && matchDoc;
    });
  }, [vehicles, search, statusFilter, typeFilter, ownershipFilter, docFilter]);

  const hasActiveFilters = search || statusFilter !== "all" || typeFilter !== "all" || ownershipFilter !== "all" || docFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setOwnershipFilter("all");
    setDocFilter("all");
  };

  if (hasFeature === false) {
    return <TransportLockedPreview />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Top Navigation & Action Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-bold text-[#5B6478] hover:text-[#141A2E] hover:bg-gray-50 shadow-sm transition-all"
            title="Return to Transport Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#2158E0]" />
            <span>Back to Transport</span>
          </button>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
                School Fleet & Vehicles
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#2158E0] border border-blue-100">
                {totalCount} {totalCount === 1 ? "Vehicle" : "Vehicles"}
              </span>
            </div>
            <p className="text-xs text-[#5B6478] mt-0.5">
              Manage buses, vans, seat capacities, safety compliance, and fitness certificates
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-[#E6EAF3] text-xs font-bold text-[#5B6478] shadow-sm transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#2158E0]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setAddError("");
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* ─── Metric Mini-Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E6EAF3] shadow-sm">
          <p className="text-[11px] font-semibold text-[#5B6478]">Total Fleet Size</p>
          <p className="text-xl font-black text-[#141A2E] mt-0.5">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E6EAF3] shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-700">Active in Service</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E6EAF3] shadow-sm">
          <p className="text-[11px] font-semibold text-amber-700">Under Maintenance</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">{maintenanceCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E6EAF3] shadow-sm">
          <p className="text-[11px] font-semibold text-red-700">Document Alerts</p>
          <p className="text-xl font-black text-red-700 mt-0.5">{docAlertsCount}</p>
        </div>
      </div>

      {/* ─── Search and Filters Bar ─── */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6EAF3] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by registration number, make/model, or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#E6EAF3] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2158E0] bg-gray-50/50 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold bg-white text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold bg-white text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            >
              <option value="all">All Vehicle Types</option>
              <option value="bus">School Bus</option>
              <option value="mini_bus">Mini Bus</option>
              <option value="van">Van</option>
              <option value="auto">Auto / Tempo</option>
              <option value="other">Other</option>
            </select>

            {/* Ownership Filter */}
            <select
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold bg-white text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            >
              <option value="all">All Ownership</option>
              <option value="owned">School Owned</option>
              <option value="contract">Contractual</option>
            </select>

            {/* Document Compliance Filter */}
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E6EAF3] text-xs font-semibold bg-white text-[#141A2E] focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            >
              <option value="all">All Compliance</option>
              <option value="valid">Valid Documents</option>
              <option value="expiring_soon">Expiring Soon (≤30d)</option>
              <option value="expired">Expired Documents</option>
              <option value="missing">Missing Documents</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#5B6478] hover:text-[#141A2E] text-xs font-bold transition-colors"
                title="Reset all filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter Count Summary */}
        <div className="flex items-center justify-between text-[11px] text-[#5B6478] pt-1">
          <span>
            Showing <strong className="text-[#141A2E]">{filtered.length}</strong> of {totalCount} vehicles
          </span>
          {hasActiveFilters && (
            <span className="text-amber-700 font-medium">Filtered view active</span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={loadVehicles} className="underline text-red-900 font-bold">
            Retry
          </button>
        </div>
      )}

      {/* ─── Vehicles Table / Inventory ─── */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-sm overflow-hidden">
        {loading ? (
          /* Table Skeleton Loader */
          <div className="p-6 space-y-4">
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto">
              <Bus className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#141A2E]">
                {hasActiveFilters ? "No vehicles match your search or filter" : "No vehicles registered yet"}
              </h3>
              <p className="text-xs text-[#5B6478] max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Try adjusting your search keywords, status, or document compliance filters."
                  : "Begin setting up your transport system by registering your first school bus, mini bus, or van."}
              </p>
            </div>
            <div>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#141A2E] text-xs font-bold transition-colors"
                >
                  Clear All Filters
                </button>
              ) : (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Vehicle
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Structured Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-[#F8FAFC] text-[#5B6478] font-bold">
                  <th className="py-3.5 px-4">Registration & Fleet ID</th>
                  <th className="py-3.5 px-4">Make, Model & Type</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Assigned Routes</th>
                  <th className="py-3.5 px-4">Compliance Status</th>
                  <th className="py-3.5 px-4">Operational Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3]">
                {filtered.map((v) => {
                  const chip = v.document_status;
                  return (
                    <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* 1. Registration */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs text-[#141A2E] bg-gray-100 px-2 py-0.5 rounded border border-gray-200 tracking-wider">
                            {v.registration_no}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-[#5B6478] pt-1">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                v.ownership === "owned"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-purple-50 text-purple-700"
                              }`}
                            >
                              {v.ownership === "owned" ? "School Owned" : `Vendor: ${v.vendor_name || "Contract"}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Make & Type */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-[#141A2E]">{v.make_model}</span>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#5B6478]">
                            <span className="capitalize">{v.vehicle_type.replace("_", " ")}</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] font-semibold text-gray-500">
                              {v.fuel_type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Capacity */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#141A2E] text-xs">
                          {v.capacity} seats
                        </span>
                      </td>

                      {/* 4. Assigned Routes */}
                      <td className="py-3.5 px-4">
                        {v.assigned_routes.length === 0 ? (
                          <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {v.assigned_routes.map((r) => (
                              <Link
                                key={r.id}
                                to={`/admin/transport/routes?id=${r.id}`}
                                className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2158E0] font-bold text-[11px] hover:bg-blue-100 transition-colors"
                                title={r.name}
                              >
                                {r.code}
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 5. Compliance Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            chip.color === "green"
                              ? "bg-green-100 text-green-800"
                              : chip.color === "red"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {chip.color === "green" ? (
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          ) : chip.color === "red" ? (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {chip.label}
                        </span>
                      </td>

                      {/* 6. Operational Status */}
                      <td className="py-3.5 px-4">
                        <select
                          value={v.status}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              v,
                              e.target.value as "active" | "maintenance" | "retired"
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer border transition-colors ${
                            v.status === "active"
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              : v.status === "maintenance"
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                          }`}
                          title="Click to change status"
                        >
                          <option value="active">Active</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="retired">Retired</option>
                        </select>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenProfile(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#2158E0] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Vehicle Profile, Documents & Safety"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          <button
                            onClick={() => handleDelete(v)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Retire Vehicle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Add Vehicle Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#E6EAF3] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#141A2E]">Register New Fleet Vehicle</h2>
                <p className="text-xs text-[#5B6478]">Add a school bus, van, or contracted transport vehicle</p>
              </div>
              <button
                onClick={handleCloseAddModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Registration Number (Unique) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL 01 AB 1234"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] uppercase font-mono font-bold focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Spaces are automatically stripped</p>
                </div>

                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
                  >
                    <option value="bus">School Bus</option>
                    <option value="mini_bus">Mini Bus</option>
                    <option value="van">Van</option>
                    <option value="auto">Auto / Tempo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Make & Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tata Starbus Ultra 40"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Seating Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={Number.isNaN(capacity) ? "" : capacity ?? ""}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      setCapacity(isNaN(parsed) ? ("" as any) : parsed);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] font-bold focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
                  >
                    <option value="diesel">Diesel</option>
                    <option value="cng">CNG</option>
                    <option value="petrol">Petrol</option>
                    <option value="electric">Electric</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Ownership</label>
                  <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value as VehicleOwnership)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none"
                  >
                    <option value="owned">School Owned</option>
                    <option value="contract">Contractual / Vendor</option>
                  </select>
                </div>
              </div>

              {ownership === "contract" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-purple-50/50 border border-purple-100">
                  <div>
                    <label className="block text-[#5B6478] mb-1 font-semibold">
                      Vendor / Agency Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma Tours & Travels"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#5B6478] mb-1 font-semibold">
                      Vendor Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E6EAF3]">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2158E0] text-white font-bold hover:bg-blue-600 disabled:opacity-50 shadow-sm transition-colors"
                >
                  {isSubmitting ? "Registering..." : "Register Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Vehicle Profile & Documents Modal ─── */}
      {selectedVehicle && (
        <VehicleProfileModal
          schoolId={schoolId!}
          vehicle={selectedVehicle}
          documents={selectedDocs}
          onClose={() => setSelectedVehicle(null)}
          onRefresh={handleRefreshProfile}
        />
      )}
    </div>
  );
}

export default VehiclesPage;
