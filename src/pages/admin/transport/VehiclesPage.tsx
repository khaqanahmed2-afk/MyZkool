import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  getVehicles,
  createVehicle,
  deleteVehicle,
  getVehicleDocuments,
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
  const { schoolId } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [vehicles, setVehicles] = useState<EnrichedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [docFilter, setDocFilter] = useState<string>("all");

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

  useEffect(() => {
    if (!schoolId) return;
    checkSchoolFeature(schoolId, "transport").then((enabled) => {
      setHasFeature(enabled);
      if (enabled) loadVehicles();
      else setLoading(false);
    });
  }, [schoolId]);

  async function loadVehicles() {
    if (!schoolId) return;
    setLoading(true);
    const data = await getVehicles(schoolId);
    setVehicles(data);
    setLoading(false);
  }

  async function handleOpenProfile(v: EnrichedVehicle) {
    if (!schoolId) return;
    const docs = await getVehicleDocuments(schoolId, v.id);
    setSelectedDocs(docs);
    setSelectedVehicle(v);
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
    if (!confirm(`Are you sure you want to retire vehicle ${v.registration_no}?`)) return;
    const res = await deleteVehicle(schoolId, v.id);
    if (!res.success) {
      alert(res.error || "Failed to delete vehicle.");
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
    loadVehicles();
  }

  if (hasFeature === false) {
    return <TransportLockedPreview />;
  }

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    const matchQuery =
      v.registration_no.toLowerCase().includes(q) ||
      v.make_model.toLowerCase().includes(q);

    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchDoc =
      docFilter === "all" || v.document_status.status === docFilter;

    return matchQuery && matchStatus && matchDoc;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
            School Fleet & Vehicles
          </h1>
          <p className="text-xs text-[#5B6478]">
            Manage buses, vans, seat capacities, and compliance documents
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E6EAF3] shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by registration number or make..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E6EAF3] text-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs font-semibold bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs font-semibold bg-white"
          >
            <option value="all">All Document States</option>
            <option value="valid">Valid Documents</option>
            <option value="expiring_soon">Expiring Soon (≤30d)</option>
            <option value="expired">Expired Documents</option>
            <option value="missing">Missing Documents</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl border border-[#E6EAF3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5B6478]">
            Loading fleet inventory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Bus className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-[#141A2E]">No vehicles found</p>
            <p className="text-xs text-[#5B6478]">
              {search ? "No vehicle matches your filter criteria." : "Start by adding your first school bus or van."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-[#F8FAFC] text-[#5B6478] font-bold">
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Make & Type</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Assigned Routes</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3]">
                {filtered.map((v) => {
                  const chip = v.document_status;
                  return (
                    <tr key={v.id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#141A2E] tracking-wide">
                          {v.registration_no}
                        </span>
                        <p className="text-[11px] text-[#5B6478]">
                          {v.ownership === "owned" ? "Owned" : "Contract"}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#141A2E]">{v.make_model}</span>
                        <p className="text-[11px] text-[#5B6478] capitalize">{v.vehicle_type}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#141A2E]">
                        {v.capacity} seats
                      </td>
                      <td className="py-3.5 px-4">
                        {v.assigned_routes.length === 0 ? (
                          <span className="text-[#5B6478] italic">Unassigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {v.assigned_routes.map((r) => (
                              <span
                                key={r.id}
                                className="px-2 py-0.5 rounded bg-blue-50 text-[#2158E0] font-semibold text-[11px]"
                              >
                                {r.code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
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
                            <CheckCircle className="w-3 h-3" />
                          ) : chip.color === "red" ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {chip.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            v.status === "active"
                              ? "bg-green-50 text-green-700"
                              : v.status === "maintenance"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenProfile(v)}
                            className="p-1.5 text-[#2158E0] hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Vehicle Profile & Documents"
                          >
                            <Eye className="w-4 h-4" />
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

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#E6EAF3]">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <h2 className="text-base font-bold text-[#141A2E]">Register New Vehicle</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">
                    Registration No (Unique)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UP 32 AB 1234"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] uppercase font-bold"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Spaces stripped, stored uppercase</p>
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
                  >
                    <option value="bus">School Bus</option>
                    <option value="mini_bus">Mini Bus</option>
                    <option value="van">Van</option>
                    <option value="auto">Auto / Tempo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Make & Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Tata Starbus 40"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Student Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
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
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
                  >
                    <option value="owned">School Owned</option>
                    <option value="contract">Contractual / Vendor</option>
                  </select>
                </div>
              </div>

              {ownership === "contract" && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div>
                    <label className="block text-[#5B6478] mb-1 font-semibold">Vendor Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma Travels"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#5B6478] mb-1 font-semibold">Vendor Phone</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E6EAF3]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2158E0] text-white font-bold hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSubmitting ? "Registering..." : "Register Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Profile & Documents Modal */}
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

