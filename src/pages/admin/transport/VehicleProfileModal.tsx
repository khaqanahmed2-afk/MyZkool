import React, { useState } from "react";
import {
  X,
  Shield,
  FileText,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";
import type {
  EnrichedVehicle,
  VehicleDocument,
  VehicleDocType,
  VehicleSafetyItems,
} from "../../../types/transport";
import {
  updateVehicle,
  addVehicleDocument,
  deleteVehicleDocument,
} from "../../../services/transportCoreService";

interface VehicleProfileModalProps {
  schoolId: string;
  vehicle: EnrichedVehicle;
  documents: VehicleDocument[];
  onClose: () => void;
  onRefresh: () => void;
}

const MANDATORY_DOCS: { type: VehicleDocType; label: string }[] = [
  { type: "rc", label: "Registration Certificate (RC)" },
  { type: "insurance", label: "Insurance Policy" },
  { type: "fitness", label: "Fitness Certificate" },
  { type: "puc", label: "Pollution Under Control (PUC)" },
  { type: "road_tax", label: "Road Tax Receipt" },
  { type: "permit", label: "School Bus Permit" },
  { type: "speed_governor", label: "Speed Governor Certificate" },
];

export function VehicleProfileModal({
  schoolId,
  vehicle,
  documents,
  onClose,
  onRefresh,
}: VehicleProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "safety">("overview");
  const [safetyItems, setSafetyItems] = useState<VehicleSafetyItems>(vehicle.safety_items || {
    first_aid: false,
    fire_extinguisher: false,
    speed_governor: false,
    cctv: false,
    gps: false,
    attendant_seat: false,
  });
  const [isSavingSafety, setIsSavingSafety] = useState(false);

  // New document form state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docType, setDocType] = useState<VehicleDocType>("insurance");
  const [docNumber, setDocNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [docError, setDocError] = useState("");
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  async function handleToggleSafety(key: keyof VehicleSafetyItems) {
    const updated = { ...safetyItems, [key]: !safetyItems[key] };
    setSafetyItems(updated);
    setIsSavingSafety(true);
    await updateVehicle(schoolId, vehicle.id, { safety_items: updated });
    setIsSavingSafety(false);
    onRefresh();
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docNumber.trim() || !expiresOn) {
      setDocError("Document number and expiry date are required.");
      return;
    }
    setDocError("");
    setIsSavingDoc(true);

    const res = await addVehicleDocument(schoolId, {
      vehicle_id: vehicle.id,
      doc_type: docType,
      doc_number: docNumber.trim(),
      issued_on: issuedOn || null,
      expires_on: expiresOn,
      is_mandatory: true,
    });

    setIsSavingDoc(false);
    if (!res.success) {
      setDocError(res.error || "Failed to add document.");
      return;
    }

    setShowAddDoc(false);
    setDocNumber("");
    setIssuedOn("");
    setExpiresOn("");
    onRefresh();
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Remove this document record?")) return;
    await deleteVehicleDocument(schoolId, docId);
    onRefresh();
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#E6EAF3]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E6EAF3] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#141A2E]">
                {vehicle.registration_no}
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  vehicle.status === "active"
                    ? "bg-green-100 text-green-700"
                    : vehicle.status === "maintenance"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {vehicle.status}
              </span>
            </div>
            <p className="text-xs text-[#5B6478] mt-0.5">
              {vehicle.make_model} • {vehicle.capacity} Student Seats • {vehicle.ownership === "owned" ? "School Owned" : "Contractual"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#5B6478] hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E6EAF3] px-6 gap-6 bg-white text-sm">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 font-semibold border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-[#2158E0] text-[#2158E0]"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Overview & Routes
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`py-3 font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "documents"
                ? "border-[#2158E0] text-[#2158E0]"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Compliance Documents
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 font-bold">
              {documents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("safety")}
            className={`py-3 font-semibold border-b-2 transition-colors ${
              activeTab === "safety"
                ? "border-[#2158E0] text-[#2158E0]"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Safety Checklist
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-[#E6EAF3]">
                  <p className="text-xs text-[#5B6478]">Seating Capacity</p>
                  <p className="text-lg font-bold text-[#141A2E] mt-1">
                    {vehicle.capacity} seats
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-[#E6EAF3]">
                  <p className="text-xs text-[#5B6478]">Fuel Type</p>
                  <p className="text-lg font-bold text-[#141A2E] mt-1 capitalize">
                    {vehicle.fuel_type || "Diesel"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-[#E6EAF3]">
                  <p className="text-xs text-[#5B6478]">Manufacture Year</p>
                  <p className="text-lg font-bold text-[#141A2E] mt-1">
                    {vehicle.manufacture_year || "N/A"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-[#E6EAF3]">
                  <p className="text-xs text-[#5B6478]">GPS Device ID</p>
                  <p className="text-lg font-bold text-[#141A2E] mt-1 truncate">
                    {vehicle.gps_device_id || "Not installed"}
                  </p>
                </div>
              </div>

              {vehicle.ownership === "contract" && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                  <p className="text-xs font-bold text-blue-900">Contractor / Vendor Details</p>
                  <p className="text-sm text-blue-800">
                    Vendor: <span className="font-semibold">{vehicle.vendor_name || "N/A"}</span> • Phone: <span className="font-semibold">{vehicle.vendor_phone || "N/A"}</span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#141A2E]">Assigned Routes</h3>
                {vehicle.assigned_routes.length === 0 ? (
                  <p className="text-xs text-[#5B6478] italic">
                    No active routes currently assigned to this vehicle.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vehicle.assigned_routes.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-lg border border-[#E6EAF3] bg-white flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#141A2E]">{r.name}</p>
                          <p className="text-xs text-[#5B6478]">Code: {r.code}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-[#2158E0] font-semibold">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#141A2E]">
                    Vehicle Compliance Documents
                  </h3>
                  <p className="text-xs text-[#5B6478]">
                    Mandatory fitness, insurance, and RTO permits with expiry tracking
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDoc(!showAddDoc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2158E0] hover:bg-blue-600 text-white text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Document
                </button>
              </div>

              {showAddDoc && (
                <form
                  onSubmit={handleAddDocument}
                  className="p-4 rounded-xl bg-gray-50 border border-blue-200 space-y-4"
                >
                  <div className="font-bold text-xs text-[#141A2E]">Add Document Record</div>
                  {docError && (
                    <div className="p-2 rounded bg-red-50 text-red-700 text-xs font-semibold">
                      {docError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[#5B6478] mb-1 font-semibold">Document Type</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as VehicleDocType)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
                      >
                        {MANDATORY_DOCS.map((md) => (
                          <option key={md.type} value={md.type}>
                            {md.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#5B6478] mb-1 font-semibold">Document Number</label>
                      <input
                        type="text"
                        placeholder="e.g. POL-98765432"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[#5B6478] mb-1 font-semibold">Expiry Date (Required)</label>
                      <input
                        type="date"
                        value={expiresOn}
                        onChange={(e) => setExpiresOn(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] bg-white font-medium"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddDoc(false)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingDoc}
                      className="px-4 py-1.5 rounded-lg bg-[#2158E0] text-white text-xs font-bold hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isSavingDoc ? "Saving..." : "Save Document"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {documents.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-[#E6EAF3] text-xs text-[#5B6478]">
                    No compliance documents recorded for this vehicle yet.
                  </div>
                ) : (
                  documents.map((d) => {
                    const diffMs = new Date(d.expires_on).getTime() - new Date(todayStr).getTime();
                    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    const isExpired = daysRemaining <= 0;
                    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;

                    return (
                      <div
                        key={d.id}
                        className="p-4 rounded-xl border border-[#E6EAF3] bg-white flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#141A2E] uppercase">
                              {d.doc_type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-[#5B6478]">#{d.doc_number}</span>
                            {isExpired ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                                Expired ({Math.abs(daysRemaining)}d ago)
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                                Expiring in {daysRemaining} days
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                                Valid ({daysRemaining}d left)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5B6478]">
                            Expires on: <span className="font-semibold text-[#141A2E]">{d.expires_on}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteDoc(d.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#141A2E]">
                  Safety Equipment Checklist
                </h3>
                <p className="text-xs text-[#5B6478]">
                  State RTO standards require school buses to be equipped with safety gear. Record items verified in this vehicle:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { key: "first_aid", label: "First Aid Medical Box" },
                  { key: "fire_extinguisher", label: "Fire Extinguisher (Inspected)" },
                  { key: "speed_governor", label: "Speed Governor (40-50 km/h calibrated)" },
                  { key: "cctv", label: "CCTV Surveillance Cameras" },
                  { key: "gps", label: "GPS Tracking Hardware" },
                  { key: "attendant_seat", label: "Designated Attendant Seat" },
                ].map((item) => {
                  const isChecked = !!safetyItems[item.key as keyof VehicleSafetyItems];
                  return (
                    <label
                      key={item.key}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? "border-blue-300 bg-blue-50/50"
                          : "border-[#E6EAF3] bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#141A2E]">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSafety(item.key as keyof VehicleSafetyItems)}
                        className="w-4 h-4 rounded text-[#2158E0] focus:ring-[#2158E0]"
                      />
                    </label>
                  );
                })}
              </div>

              {isSavingSafety && (
                <p className="text-xs text-blue-600 font-semibold italic">Saving changes...</p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E6EAF3] bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-xs font-bold text-[#141A2E] hover:bg-gray-100 transition-colors shadow-sm"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
