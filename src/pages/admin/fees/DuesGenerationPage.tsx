import React, { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw, Plus, CheckCircle2, XCircle } from "lucide-react";
import {
  previewDuesGeneration, generateDues, getStudentDues, addManualDue,
} from "../../../services/feeDuesService";
import { getFeeHeads } from "../../../services/feeSetupService";
import type {
  DuesGenerationPreview, DuesGenerationResult, DuesGenerationException,
  ManualDueInput, FeeHead,
} from "../../../types/fees";
import { useAuth } from "../../../hooks/useAuth";

export default function DuesGenerationPage() {
  const { school, profile } = useAuth() as any;
  const [yearId, setYearId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DuesGenerationPreview | null>(null);
  const [result, setResult] = useState<DuesGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [manualDrawer, setManualDrawer] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualForm, setManualForm] = useState<ManualDueInput>({
    fee_head_id: "", gross_paise: 0, due_date: new Date().toISOString().split("T")[0],
  });
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);

  const load = useCallback(async () => {
    if (!school?.id) return;
    const years = typeof localStorage !== "undefined"
      ? JSON.parse(localStorage.getItem(`myzkool_academic_years_${school.id}`) || "[]") : [];
    const currentYear = years.find((y: any) => y.is_current);
    if (!currentYear) return;
    setYearId(currentYear.id);

    const { heads } = await getFeeHeads(school.id);
    setFeeHeads(heads.filter(h => !h.is_system));
    setManualForm(f => ({ ...f, fee_head_id: heads[0]?.id ?? "" }));
  }, [school?.id]);

  useEffect(() => { load(); }, [load]);

  async function loadPreview() {
    if (!school?.id || !yearId) return;
    setLoading(true);
    setError(null);
    const { preview: p, error: e } = await previewDuesGeneration(school.id, yearId);
    if (e) setError(e); else setPreview(p);
    setLoading(false);
  }

  async function handleGenerate() {
    if (!school?.id || !yearId) return;
    setGenerating(true);
    setError(null);
    const { result: r, error: e } = await generateDues(school.id, yearId, undefined, profile?.id);
    if (e) setError(e); else setResult(r);
    setGenerating(false);
    setPreview(null);
  }

  async function handleAddManualDue() {
    if (!school?.id || !yearId || !manualStudentId || !manualForm.fee_head_id) {
      setManualError("Student ID and fee head are required."); return;
    }
    setManualSaving(true);
    const { error: e } = await addManualDue(school.id, manualStudentId, yearId, manualForm, profile?.id);
    if (e) { setManualError(e); } else {
      setManualDrawer(false);
      setManualStudentId("");
      setManualError(null);
    }
    setManualSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#141A2E]">Generate & Assign Dues</h1>
          <p className="text-[#5B6478] text-sm mt-0.5">Bulk generate dues from fee structures or add individual charges.</p>
        </div>
        <button onClick={() => setManualDrawer(true)}
          className="flex items-center gap-2 text-sm px-4 py-2 border border-[#E6EAF3] bg-white rounded-lg text-[#5B6478] hover:bg-gray-50">
          <Plus className="w-4 h-4" /> Manual Due
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

      {/* Generation result */}
      {result && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Dues Generated Successfully</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm mb-3">
            <div><p className="text-2xl font-bold text-green-700">{result.created_count}</p><p className="text-green-600 text-xs">Due lines created</p></div>
            <div><p className="text-2xl font-bold text-amber-600">{result.skipped_count}</p><p className="text-amber-600 text-xs">Lines skipped (already exist)</p></div>
            <div><p className="text-2xl font-bold text-red-500">{result.exceptions.length}</p><p className="text-red-500 text-xs">Exceptions</p></div>
          </div>
          {result.exceptions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-red-700 mb-2">Exceptions</h4>
              <div className="space-y-1">
                {result.exceptions.map(ex => (
                  <div key={ex.student_id} className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded px-3 py-2">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{ex.admission_no}</span> {ex.student_name} — {ex.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview panel */}
      <div className="bg-white border border-[#E6EAF3] rounded-xl p-6">
        <h2 className="text-base font-semibold text-[#141A2E] mb-4">Bulk Dues Generation</h2>

        {!preview ? (
          <div className="text-center py-8">
            <p className="text-[#5B6478] text-sm mb-4">
              Preview the due lines that will be created before committing. Generation is idempotent — running it twice is safe.
            </p>
            <button onClick={loadPreview} disabled={loading || !yearId}
              className="flex items-center gap-2 mx-auto text-sm px-6 py-2.5 border border-[#2158E0] text-[#2158E0] rounded-lg hover:bg-[#F0F5FE] disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Preview Dues Generation
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#F0F5FE] rounded-xl p-4">
                <p className="text-sm text-[#5B6478] mb-1">Students to generate for</p>
                <p className="text-2xl font-bold text-[#2158E0]">{preview.student_count}</p>
              </div>
              <div className="bg-[#F0F5FE] rounded-xl p-4">
                <p className="text-sm text-[#5B6478] mb-1">Due lines to create</p>
                <p className="text-2xl font-bold text-[#2158E0]">{preview.due_line_count}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-sm text-amber-700 mb-1">Already generated (will skip)</p>
                <p className="text-2xl font-bold text-amber-600">{preview.already_generated_count}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-[#5B6478] mb-1">Total demand</p>
                <p className="text-2xl font-bold text-[#141A2E]">
                  ₹{(preview.total_demand_paise / 100).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            {preview.exceptions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[#5B6478] mb-2">Students with no structure (will be skipped)</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {preview.exceptions.map(ex => (
                    <div key={ex.student_id} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">{ex.admission_no}</span> {ex.student_name} — {ex.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setPreview(null)} className="flex-1 px-4 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478]">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || preview.student_count === 0}
                className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate {preview.student_count} Student{preview.student_count !== 1 ? "s'" : "'s"} Dues
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual due drawer */}
      {manualDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setManualDrawer(false)} />
          <div className="w-96 bg-white h-full shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-[#E6EAF3]">
              <h2 className="text-base font-bold text-[#141A2E]">Add Manual Due</h2>
              <p className="text-xs text-[#5B6478] mt-0.5">One-off charge: fine, damage, event fee, etc.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {manualError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{manualError}</div>}
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Student ID *</label>
                <input className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={manualStudentId} onChange={e => setManualStudentId(e.target.value)} placeholder="Student UUID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Fee Head *</label>
                <select className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={manualForm.fee_head_id} onChange={e => setManualForm(f => ({ ...f, fee_head_id: e.target.value }))}>
                  {feeHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Amount (₹) *</label>
                <input type="number" min={0} className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={manualForm.gross_paise / 100 || ""}
                  onChange={e => setManualForm(f => ({ ...f, gross_paise: (parseFloat(e.target.value) || 0) * 100 }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Due Date *</label>
                <input type="date" className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={manualForm.due_date} onChange={e => setManualForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141A2E] mb-1">Description</label>
                <input className="w-full border border-[#E6EAF3] rounded-lg px-3 py-2 text-sm focus:border-[#2158E0] outline-none"
                  value={manualForm.description ?? ""} onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Library fine" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E6EAF3] flex gap-3">
              <button onClick={() => setManualDrawer(false)} className="flex-1 px-4 py-2 border border-[#E6EAF3] rounded-lg text-sm text-[#5B6478]">Cancel</button>
              <button onClick={handleAddManualDue} disabled={manualSaving}
                className="flex-1 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                {manualSaving && <Loader2 className="w-4 h-4 animate-spin" />} Add Due
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

