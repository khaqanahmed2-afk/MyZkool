import React from "react";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { AdmissionWizardPayload } from "../../../../types/students";

interface Step8Props {
  fee?: AdmissionWizardPayload["step8_fee"];
  isRte?: boolean;
  className?: string;
  onChange: (fields: Partial<NonNullable<AdmissionWizardPayload["step8_fee"]>>) => void;
}

export const StudentWizardStep8Fee: React.FC<Step8Props> = ({
  fee = { fee_structure_id: "standard-2026", discount_concession: "none" },
  isRte,
  className,
  onChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 8: Fee Structure Assignment</h2>
        <p className="text-sm text-slate-500 mt-1">
          Assign annual fee structure and applicable concessions for {className ? `Class ${className}` : "the student"}.
        </p>
      </div>

      {isRte && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">RTE Quota Student:</span> Tuition fees are waived under Section 12(1)(c) of the Right to Education Act. Annual tuition dues will be zeroed out in the fee ledger automatically.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Structure Plan</label>
            <select
              value={fee.fee_structure_id || "standard-2026"}
              onChange={(e) => onChange({ fee_structure_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            >
              <option value="standard-2026">Standard 2026-27 (₹38,400 / year)</option>
              <option value="installment-quarterly">Quarterly Plan (₹9,600 x 4)</option>
              <option value="installment-monthly">Monthly Plan (₹3,200 x 12)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Discount / Concession</label>
            <select
              value={fee.discount_concession || "none"}
              onChange={(e) => onChange({ discount_concession: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            >
              <option value="none">No concession</option>
              <option value="sibling_10">Sibling Concession (10% on Tuition)</option>
              <option value="staff_25">Staff Child Concession (25%)</option>
              <option value="merit_scholarship">Merit Scholarship</option>
            </select>
          </div>
        </div>

        {/* Breakdown Estimate Table */}
        <div className="pt-3 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-800 mb-2">Estimated Fee Installments:</h4>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Installment</th>
                  <th className="px-3 py-2 text-left">Due Date</th>
                  <th className="px-3 py-2 text-right">Tuition</th>
                  <th className="px-3 py-2 text-right">Total Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="px-3 py-2 text-slate-800 font-sans">Q1 (Admission & Term 1)</td>
                  <td className="px-3 py-2 text-slate-600">On Admission</td>
                  <td className="px-3 py-2 text-right">{isRte ? "₹0" : "₹9,600"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{isRte ? "₹0" : "₹9,600"}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-slate-800 font-sans">Q2 (Term 2)</td>
                  <td className="px-3 py-2 text-slate-600">10 Jul 2026</td>
                  <td className="px-3 py-2 text-right">{isRte ? "₹0" : "₹9,600"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{isRte ? "₹0" : "₹9,600"}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-slate-800 font-sans">Q3 (Term 3)</td>
                  <td className="px-3 py-2 text-slate-600">10 Oct 2026</td>
                  <td className="px-3 py-2 text-right">{isRte ? "₹0" : "₹9,600"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{isRte ? "₹0" : "₹9,600"}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-slate-800 font-sans">Q4 (Term 4)</td>
                  <td className="px-3 py-2 text-slate-600">10 Jan 2027</td>
                  <td className="px-3 py-2 text-right">{isRte ? "₹0" : "₹9,600"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{isRte ? "₹0" : "₹9,600"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
