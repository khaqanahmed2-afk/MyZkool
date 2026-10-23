import React, { useState } from "react";
import {
  X,
  Layers,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";
import { formatPaise } from "../../../lib/amountInWords";
import {
  previewInvoiceGeneration,
  executeInvoiceGeneration,
  InvoiceGenerationPreviewResult,
} from "../../../services/invoiceService";
import type { FeeTerm } from "../../../types/fees";

interface BulkGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  academicYears: any[];
  selectedYearId: string;
  classes: any[];
  terms: FeeTerm[];
  onGenerationComplete: () => void;
}

interface BulkGenerateConfigStepProps {
  genYearId: string;
  setGenYearId: (id: string) => void;
  academicYears: any[];
  genTermId: string;
  setGenTermId: (id: string) => void;
  terms: FeeTerm[];
  genClassId: string;
  setGenClassId: (id: string) => void;
  classes: any[];
  includeTransport: boolean;
  setIncludeTransport: (val: boolean) => void;
  previewLoading: boolean;
  onCancel: () => void;
  onPreview: () => void;
}

function BulkGenerateConfigStep({
  genYearId,
  setGenYearId,
  academicYears,
  genTermId,
  setGenTermId,
  terms,
  genClassId,
  setGenClassId,
  classes,
  includeTransport,
  setIncludeTransport,
  previewLoading,
  onCancel,
  onPreview,
}: BulkGenerateConfigStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="bulk-gen-year-select" className="block text-xs font-semibold text-slate-700 mb-1">
          Academic Year
        </label>
        <select
          id="bulk-gen-year-select"
          value={genYearId}
          onChange={(e) => setGenYearId(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
        >
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name || y.label} {y.is_current ? "(Current)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="bulk-gen-term-select" className="block text-xs font-semibold text-slate-700 mb-1">
          Billing Period / Fee Term <span className="text-red-500">*</span>
        </label>
        <select
          id="bulk-gen-term-select"
          value={genTermId}
          onChange={(e) => setGenTermId(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
        >
          <option value="">Select Fee Period...</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (Due: {t.due_date})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="bulk-gen-class-select" className="block text-xs font-semibold text-slate-700 mb-1">
          Class Scope
        </label>
        <select
          id="bulk-gen-class-select"
          value={genClassId}
          onChange={(e) => setGenClassId(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
        >
          <option value="all">All Classes (Entire School)</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2">
        <label className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={includeTransport}
            onChange={(e) => setIncludeTransport(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
          />
          <div>
            <span className="text-xs font-semibold text-slate-900 block">Include Transport Charges</span>
            <span className="text-[11px] text-slate-500 block">
              Automatically attaches route & stop fees for all students with active bus assignments.
            </span>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onPreview}
          disabled={previewLoading || !genTermId}
          className="flex items-center gap-1.5 px-5 py-2 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
        >
          {previewLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Checking Eligibility...</span>
            </>
          ) : (
            <>
              <span>Preview Generation</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface BulkGeneratePreviewStepProps {
  previewData: InvoiceGenerationPreviewResult;
  executing: boolean;
  onBack: () => void;
  onExecute: () => void;
}

function BulkGeneratePreviewStep({
  previewData,
  executing,
  onBack,
  onExecute,
}: BulkGeneratePreviewStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <span className="text-[11px] text-slate-500 block">Eligible Students</span>
          <span className="text-xl font-bold text-slate-900">{previewData.eligibleStudentsCount}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <span className="text-[11px] text-slate-500 block">Invoices to Create</span>
          <span className="text-xl font-bold text-emerald-700">{previewData.invoicesToCreateCount}</span>
        </div>
      </div>

      {previewData.alreadyGeneratedCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold block">Duplicate Demand Protection</span>
            <span>
              {previewData.alreadyGeneratedCount} students already have dues for this period and will be safely skipped.
            </span>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-600">
          <span>Transport Eligible Students:</span>
          <span className="font-semibold text-slate-900">{previewData.transportEligibleCount} students</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Estimated Total Invoiced Demand:</span>
          <span className="font-bold text-emerald-800 text-sm">{formatPaise(previewData.totalDemandPaise)}</span>
        </div>
      </div>

      {previewData.exceptions.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-3 max-h-32 overflow-y-auto text-xs bg-slate-50">
          <span className="font-semibold text-slate-700 block mb-1">Excluded Records ({previewData.exceptions.length}):</span>
          {previewData.exceptions.map((ex) => (
            <div key={ex.studentId || `${ex.admissionNo}-${ex.reason}`} className="text-slate-500 py-0.5">
              • {ex.studentName} ({ex.admissionNo}): {ex.reason}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={onExecute}
          disabled={executing || previewData.invoicesToCreateCount === 0}
          className="flex items-center gap-1.5 px-5 py-2 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
        >
          {executing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generating Invoices...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Confirm & Generate Invoices</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface BulkGenerateResultStepProps {
  resultData: any;
  onClose: () => void;
}

function BulkGenerateResultStep({ resultData, onClose }: BulkGenerateResultStepProps) {
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900">Batch Invoices Created</h4>
        <p className="text-xs text-slate-500 mt-1">
          Student invoices have been generated and recorded in the database.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-left">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Invoices Generated:</span>
          <span className="font-bold text-emerald-700">{resultData.createdCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Duplicates Skipped Safely:</span>
          <span className="font-semibold text-slate-800">{resultData.skippedCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Transport Dues Attached:</span>
          <span className="font-semibold text-slate-800">{resultData.transportCreatedCount}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2.5 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 cursor-pointer shadow-xs"
      >
        Close & View Invoices
      </button>
    </div>
  );
}

export function BulkGenerateModal({
  isOpen,
  onClose,
  schoolId,
  academicYears,
  selectedYearId,
  classes,
  terms,
  onGenerationComplete,
}: BulkGenerateModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form selections
  const [genYearId, setGenYearId] = useState(selectedYearId || academicYears[0]?.id || "");
  const [genTermId, setGenTermId] = useState(terms[0]?.id || "");
  const [genClassId, setGenClassId] = useState("all");
  const [includeTransport, setIncludeTransport] = useState(true);

  // States
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceGenerationPreviewResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchPreview = async () => {
    if (!genYearId || !genTermId) {
      setErrorMessage("Please select both an Academic Year and a Fee Period.");
      return;
    }

    setPreviewLoading(true);
    setErrorMessage(null);

    const res = await previewInvoiceGeneration(schoolId, genYearId, {
      termId: genTermId,
      classId: genClassId !== "all" ? genClassId : undefined,
      includeTransport,
    });

    setPreviewLoading(false);

    if (res.error || !res.preview) {
      setErrorMessage(res.error || "Failed to generate preview.");
    } else {
      setPreviewData(res.preview);
      setStep(2);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setErrorMessage(null);

    const res = await executeInvoiceGeneration(schoolId, genYearId, {
      termId: genTermId,
      classId: genClassId !== "all" ? genClassId : undefined,
      includeTransport,
    });

    setExecuting(false);

    if (res.error || !res.success) {
      setErrorMessage(res.error || "Invoice generation failed.");
    } else {
      setResultData(res);
      setStep(3);
      onGenerationComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" aria-hidden="true" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bulk Generate Invoices</h3>
              <p className="text-[11px] text-slate-500">
                Generate student fee demands in batch from approved fee structures.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 1 && (
            <BulkGenerateConfigStep
              genYearId={genYearId}
              setGenYearId={setGenYearId}
              academicYears={academicYears}
              genTermId={genTermId}
              setGenTermId={setGenTermId}
              terms={terms}
              genClassId={genClassId}
              setGenClassId={setGenClassId}
              classes={classes}
              includeTransport={includeTransport}
              setIncludeTransport={setIncludeTransport}
              previewLoading={previewLoading}
              onCancel={onClose}
              onPreview={handleFetchPreview}
            />
          )}

          {step === 2 && previewData && (
            <BulkGeneratePreviewStep
              previewData={previewData}
              executing={executing}
              onBack={() => setStep(1)}
              onExecute={handleExecute}
            />
          )}

          {step === 3 && resultData && (
            <BulkGenerateResultStep
              resultData={resultData}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
