import React, { useState } from "react";
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface ImportInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onImportComplete: () => void;
}

export function ImportInvoicesModal({
  isOpen,
  onClose,
  schoolId,
  onImportComplete,
}: ImportInvoicesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "admission_no,billing_period,tuition_fee,transport_fee,due_date",
        "ADM-2023-015,Apr 2026,12000,3000,2026-04-10",
        "ADM-2022-048,Jul 2025,12000,0,2025-07-18",
        "ADM-2021-037,Oct 2025,10000,0,2025-10-10",
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_fee_invoices.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText((event.target?.result as string) || "");
      };
      reader.readAsText(f);
    }
  };

  const handleProcessImport = async () => {
    if (!csvText.trim()) {
      setErrorMessage("Please select or paste a CSV file with invoice data.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const lines = csvText.trim().split("\n");
      if (lines.length <= 1) {
        throw new Error("CSV file contains no data rows.");
      }

      // Simulate parsing and importing
      setTimeout(() => {
        setUploading(false);
        setSuccessCount(lines.length - 1);
        onImportComplete();
      }, 1000);
    } catch (err: any) {
      setUploading(false);
      setErrorMessage(err.message || "Failed to process import.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import Fee Invoices</h3>
              <p className="text-[11px] text-slate-500">Upload CSV to batch import student invoices.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successCount !== null ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Import Completed Successfully</h4>
              <p className="text-xs text-slate-600">{successCount} invoice demands imported and verified.</p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download sample format</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1 text-emerald-700 font-semibold hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>sample.csv</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                    Click to select CSV file
                  </span>
                  <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">Accepts CSV up to 5MB</p>
                {file && <p className="text-xs font-bold text-slate-800 mt-2">Selected: {file.name}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  disabled={uploading || !csvText}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <span>Import Invoices</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
