import React, { useState, useEffect, useRef } from "react";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { AdmissionWizardPayload } from "../../../../types/students";
import { getFeeStructures } from "../../../../services/feeSetupService";
import type { FeeStructure } from "../../../../types/fees";

interface Step8Props {
  schoolId?: string;
  academicYearId?: string;
  fee?: AdmissionWizardPayload["step8_fee"];
  isRte?: boolean;
  className?: string;
  onChange: (fields: Partial<NonNullable<AdmissionWizardPayload["step8_fee"]>>) => void;
  onFeeStructuresLoaded?: (structures: FeeStructure[]) => void;
}

export const StudentWizardStep8Fee: React.FC<Step8Props> = ({
  schoolId,
  academicYearId,
  fee = { fee_structure_id: "", discount_concession: "none" },
  isRte,
  className,
  onChange,
  onFeeStructuresLoaded,
}) => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(false);

  const feeStructureIdRef = useRef(fee.fee_structure_id);
  const onChangeRef = useRef(onChange);
  const onLoadedRef = useRef(onFeeStructuresLoaded);

  useEffect(() => {
    feeStructureIdRef.current = fee.fee_structure_id;
    onChangeRef.current = onChange;
    onLoadedRef.current = onFeeStructuresLoaded;
  });

  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    setLoading(true);
    getFeeStructures(schoolId, academicYearId || undefined)
      .then((res) => {
        if (mounted) {
          const list = res.structures || [];
          setStructures(list);
          if (onLoadedRef.current) {
            onLoadedRef.current(list);
          }
          if (list.length > 0 && !feeStructureIdRef.current) {
            onChangeRef.current({ fee_structure_id: list[0].id });
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to load fee structures:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [schoolId, academicYearId]);

  const selectedStructure = structures.find((s) => s.id === fee.fee_structure_id) || structures[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 8: Fee Structure Assignment</h2>
        <p className="text-sm text-slate-500 mt-1">
          Assign annual fee structure and applicable concessions for {className ? `Class ${className}` : "the student"}.
        </p>
      </div>

      {isRte && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">RTE 12(1)(c) Quota Student:</span> Mandatory tuition fees are 100% waived under the Right to Education Act. Annual tuition dues will be zeroed out in the student fee ledger automatically upon admission.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate-500 font-medium">
            Loading fee structures...
          </div>
        ) : structures.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No fee structures configured yet</p>
              <p className="mt-0.5 text-slate-700">
                No active fee structures found for this academic year. You can{" "}
                <Link
                  to="/admin/fees/structures"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-semibold"
                >
                  configure fee structures in Fee Setup
                </Link>{" "}
                or assign fees later from the Student Profile / Fee Collection page.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fee-structure-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Fee Structure Plan
                </label>
                <select
                  id="fee-structure-select"
                  value={fee.fee_structure_id || structures[0]?.id || ""}
                  onChange={(e) => onChange({ fee_structure_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {selectedStructure && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Selected: <strong className="text-slate-800">{selectedStructure.name}</strong>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="fee-concession-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Discount / Concession Category
                </label>
                <select
                  id="fee-concession-select"
                  value={fee.discount_concession || "none"}
                  onChange={(e) => onChange({ discount_concession: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                >
                  <option value="none">No concession (Standard 100% tuition)</option>
                  <option value="sibling_10">Sibling Concession (10% on Tuition)</option>
                  <option value="staff_25">Staff Child Concession (25% on Tuition)</option>
                  <option value="merit_scholarship">Merit Scholarship</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Concessions will be applied automatically when term invoices are generated.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
