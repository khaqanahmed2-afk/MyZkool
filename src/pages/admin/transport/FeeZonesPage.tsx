import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  IndianRupee,
  Save,
} from "lucide-react";
import {
  getTransportSettings,
  saveTransportSettings,
  getFeeZones,
  createFeeZone,
  deleteFeeZone,
} from "../../../services/transportCoreService";
import type {
  TransportSettings,
  TransportFeeZone,
  FeeBasis,
} from "../../../types/transport";
import { useAuth } from "../../../hooks/useAuth";
import { checkSchoolFeature } from "../../../middleware/features";
import { TransportLockedPreview } from "./TransportLockedPreview";

const MONTHS = [
  { num: 4, name: "Apr" },
  { num: 5, name: "May" },
  { num: 6, name: "Jun" },
  { num: 7, name: "Jul" },
  { num: 8, name: "Aug" },
  { num: 9, name: "Sep" },
  { num: 10, name: "Oct" },
  { num: 11, name: "Nov" },
  { num: 12, name: "Dec" },
  { num: 1, name: "Jan" },
  { num: 2, name: "Feb" },
  { num: 3, name: "Mar" },
];

export function FeeZonesPage() {
  const { schoolId } = useAuth();
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<TransportSettings | null>(null);
  const [zones, setZones] = useState<TransportFeeZone[]>([]);
  const [loading, setLoading] = useState(true);

  // New Zone Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [distFrom, setDistFrom] = useState<number | "">("");
  const [distTo, setDistTo] = useState<number | "">("");
  const [feeBothWays, setFeeBothWays] = useState<number>(1200);
  const [feePickupOnly, setFeePickupOnly] = useState<number>(750);
  const [feeDropOnly, setFeeDropOnly] = useState<number>(750);
  const [addError, setAddError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    checkSchoolFeature(schoolId, "transport").then((enabled) => {
      setHasFeature(enabled);
      if (enabled) loadAll();
      else setLoading(false);
    });
  }, [schoolId]);

  async function loadAll() {
    if (!schoolId) return;
    setLoading(true);
    const [sData, zData] = await Promise.all([
      getTransportSettings(schoolId),
      getFeeZones(schoolId),
    ]);
    setSettings(sData);
    setZones(zData);
    setLoading(false);
  }

  async function handleUpdateBasis(basis: FeeBasis) {
    if (!schoolId || !settings) return;
    const updated = await saveTransportSettings(schoolId, { fee_basis: basis });
    setSettings(updated);
  }

  async function handleToggleBillingMonth(monthNum: number) {
    if (!schoolId || !settings) return;
    const current = settings.billing_months || [];
    let next: number[];
    if (current.includes(monthNum)) {
      next = current.filter((m) => m !== monthNum);
    } else {
      next = [...current, monthNum];
    }
    const updated = await saveTransportSettings(schoolId, { billing_months: next });
    setSettings(updated);
  }

  async function handleCreateZone(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setAddError("");
    setIsSubmitting(true);

    const res = await createFeeZone(schoolId, {
      name: zoneName.trim(),
      distance_from_km: distFrom === "" ? null : Number(distFrom),
      distance_to_km: distTo === "" ? null : Number(distTo),
      monthly_fee_paise: Math.round(feeBothWays * 100),
      pickup_only_monthly_paise: Math.round(feePickupOnly * 100),
      drop_only_monthly_paise: Math.round(feeDropOnly * 100),
      is_active: true,
    });

    setIsSubmitting(false);
    if (!res.success) {
      setAddError(res.error || "Failed to create fee zone.");
      return;
    }

    setShowAddModal(false);
    setZoneName("");
    setDistFrom("");
    setDistTo("");
    setFeeBothWays(1200);
    setFeePickupOnly(750);
    setFeeDropOnly(750);
    loadAll();
  }

  async function handleDeleteZone(zoneId: string) {
    if (!schoolId) return;
    if (!confirm("Are you sure you want to delete this fee zone?")) return;
    const res = await deleteFeeZone(schoolId, zoneId);
    if (!res.success) {
      alert(res.error || "Cannot delete fee zone.");
      return;
    }
    loadAll();
  }

  if (hasFeature === false) {
    return <TransportLockedPreview />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">
            Transport Fee Zones & Billing
          </h1>
          <p className="text-xs text-[#5B6478]">
            Configure fee calculation models, monthly rates, and academic billing months
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Fee Zone
        </button>
      </div>

      {/* Fee Calculation Basis Selector */}
      <div className="bg-white p-5 rounded-xl border border-[#E6EAF3] shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider">
          Fee Calculation Basis
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: "zone",
              title: "By Zone (Recommended)",
              desc: "Create geographic zones (e.g. Zone A up to 5 km) with flat rates.",
            },
            {
              id: "stop",
              title: "By Individual Stop",
              desc: "Assign distinct custom monthly fees directly to each bus stop.",
            },
            {
              id: "distance",
              title: "By Distance (KM Range)",
              desc: "Rates calculated automatically from stop distance in kilometers.",
            },
          ].map((b) => {
            const isSelected = settings?.fee_basis === b.id;
            return (
              <div
                key={b.id}
                onClick={() => handleUpdateBasis(b.id as FeeBasis)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#2158E0] bg-blue-50/50 shadow-sm"
                    : "border-[#E6EAF3] hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#141A2E]">{b.title}</span>
                  {isSelected && <CheckCircle className="w-4 h-4 text-[#2158E0]" />}
                </div>
                <p className="text-[11px] text-[#5B6478] mt-1">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Months Selector */}
      <div className="bg-white p-5 rounded-xl border border-[#E6EAF3] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-[#141A2E] uppercase tracking-wider">
              Academic Billing Months
            </h2>
            <p className="text-xs text-[#5B6478]">
              Select the months in which transport fee dues will be generated for student riders:
            </p>
          </div>
          <span className="text-xs font-bold text-[#2158E0] bg-blue-50 px-3 py-1 rounded-full">
            {settings?.billing_months?.length || 0} Months Billed
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 pt-1">
          {MONTHS.map((m) => {
            const isChecked = settings?.billing_months?.includes(m.num);
            return (
              <button
                key={m.num}
                type="button"
                onClick={() => handleToggleBillingMonth(m.num)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors border ${
                  isChecked
                    ? "bg-[#2158E0] text-white border-[#2158E0] shadow-sm"
                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fee Zones Table */}
      <div className="bg-white rounded-xl border border-[#E6EAF3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5B6478]">Loading fee zones...</div>
        ) : zones.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <IndianRupee className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-[#141A2E]">No fee zones defined</p>
            <p className="text-xs text-[#5B6478]">
              Create transport fee zones to bill students by geographic distance or stop.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-[#F8FAFC] text-[#5B6478] font-bold">
                  <th className="py-3 px-4">Zone Name</th>
                  <th className="py-3 px-4">Distance Range</th>
                  <th className="py-3 px-4">Both Ways Rate</th>
                  <th className="py-3 px-4">Pickup Only Rate</th>
                  <th className="py-3 px-4">Drop Only Rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3]">
                {zones.map((z) => (
                  <tr key={z.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#141A2E]">{z.name}</td>
                    <td className="py-3 px-4 text-[#5B6478]">
                      {z.distance_from_km != null && z.distance_to_km != null
                        ? `${z.distance_from_km} km - ${z.distance_to_km} km`
                        : "Flat zone"}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#141A2E]">
                      ₹{(z.monthly_fee_paise / 100).toLocaleString("en-IN")}/mo
                    </td>
                    <td className="py-3 px-4 text-[#5B6478]">
                      ₹{(z.pickup_only_monthly_paise / 100).toLocaleString("en-IN")}/mo
                    </td>
                    <td className="py-3 px-4 text-[#5B6478]">
                      ₹{(z.drop_only_monthly_paise / 100).toLocaleString("en-IN")}/mo
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteZone(z.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Fee Zone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Zone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-[#E6EAF3]">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <h2 className="text-base font-bold text-[#141A2E]">Add Transport Fee Zone</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateZone} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">Zone Name</label>
                <input
                  type="text"
                  placeholder="e.g. Zone A (Up to 5 km)"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">From Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={distFrom}
                    onChange={(e) => setDistFrom(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3]"
                  />
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">To Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="5.0"
                    value={distTo}
                    onChange={(e) => setDistTo(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5B6478] mb-1 font-semibold">
                  Monthly Fee (Both Ways) ₹
                </label>
                <input
                  type="number"
                  min="0"
                  value={feeBothWays}
                  onChange={(e) => setFeeBothWays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Pickup Only ₹</label>
                  <input
                    type="number"
                    min="0"
                    value={feePickupOnly}
                    onChange={(e) => setFeePickupOnly(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5B6478] mb-1 font-semibold">Drop Only ₹</label>
                  <input
                    type="number"
                    min="0"
                    value={feeDropOnly}
                    onChange={(e) => setFeeDropOnly(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3]"
                    required
                  />
                </div>
              </div>

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
                  {isSubmitting ? "Creating..." : "Create Fee Zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default FeeZonesPage;

