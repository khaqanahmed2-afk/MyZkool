/**
 * Student TC Register Page (Spec A4.7)
 * Route: /admin/students/tc
 * 
 * Lists all issued Transfer Certificates, supports search and filters,
 * allows issuing duplicate copies with original TC number, and prints letterheads.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Search,
  Printer,
  Copy,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  RotateCw,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getTransferCertificates,
  issueDuplicateTransferCertificate,
} from "../../../services/studentOperationsService";
import { StudentTransferCertificate } from "../../../types/students";

export default function StudentTCRegister() {
  const { user, profile } = useAuth();
  const [schoolId, setSchoolId] = useState<string>("");
  const [tcs, setTcs] = useState<StudentTransferCertificate[]>([]);
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Duplicate Issue Dialog
  const [duplicateTargetTc, setDuplicateTargetTc] = useState<StudentTransferCertificate | null>(null);
  const [duplicateReason, setDuplicateReason] = useState<string>("");
  const [isIssuingDuplicate, setIsIssuingDuplicate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const sId = (profile as any)?.school_id || "school-1";
        setSchoolId(sId);
        await loadTCs(sId);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load TC Register");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const loadTCs = async (sId: string) => {
    const list = await getTransferCertificates(sId);
    setTcs(list);
  };

  const handleIssueDuplicate = async () => {
    if (!duplicateTargetTc || !duplicateReason.trim()) return;
    setIsIssuingDuplicate(true);
    setErrorMsg(null);
    try {
      const dup = await issueDuplicateTransferCertificate(
        schoolId,
        duplicateTargetTc.id,
        user?.id || "admin",
        duplicateReason
      );
      setSuccessMsg(`Duplicate copy of TC ${dup.tc_no} successfully generated.`);
      setDuplicateTargetTc(null);
      setDuplicateReason("");
      await loadTCs(schoolId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to issue duplicate TC");
    } finally {
      setIsIssuingDuplicate(false);
    }
  };

  const filteredTCs = tcs.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.tc_no.toLowerCase().includes(q) ||
      t.reason.toLowerCase().includes(q) ||
      (t.remarks && t.remarks.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/students" className="hover:text-blue-600 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Students
            </Link>
            <span>/</span>
            <span className="font-medium text-gray-900">TC Register</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Certificate Register</h1>
          <p className="text-sm text-gray-600">
            Audit-backed register of all issued and duplicate Transfer Certificates.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by TC number, reason, remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm border-gray-300 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Showing {filteredTCs.length} Transfer Certificates
        </div>
      </div>

      {/* TC Register Table */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">TC Number</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Issue Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Reason for Leaving</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Dues Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status & Copy</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTCs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No Transfer Certificates found in register.
                </td>
              </tr>
            ) : (
              filteredTCs.map((tc) => (
                <tr key={tc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-gray-900">{tc.tc_no}</span>
                    {tc.qr_verification_code && (
                      <span className="block text-[10px] text-gray-400 font-mono truncate max-w-xs">
                        {tc.qr_verification_code}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tc.issued_on}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{tc.reason}</td>
                  <td className="px-4 py-3">
                    {tc.dues_cleared ? (
                      <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded">
                        Cleared
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                        Owner Override
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold capitalize ${
                          tc.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {tc.status}
                      </span>
                      {tc.is_duplicate_copy && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold uppercase">
                          Duplicate
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDuplicateTargetTc(tc)}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                    >
                      <Copy className="w-3.5 h-3.5" /> Issue Duplicate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Issue Duplicate Modal Dialog */}
      {duplicateTargetTc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">
              Issue Duplicate Copy of TC {duplicateTargetTc.tc_no}
            </h3>
            <p className="text-sm text-gray-600">
              Under Spec A4.7, duplicate copies are clearly stamped "Duplicate Copy" and retain the original TC sequence number.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Duplicate Issuance (Required)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Original copy lost during transit, requested by parent..."
                value={duplicateReason}
                onChange={(e) => setDuplicateReason(e.target.value)}
                className="w-full border-gray-300 rounded-lg text-sm p-2 border"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDuplicateTargetTc(null)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueDuplicate}
                disabled={isIssuingDuplicate || !duplicateReason.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isIssuingDuplicate ? "Issuing..." : "Issue Duplicate Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

