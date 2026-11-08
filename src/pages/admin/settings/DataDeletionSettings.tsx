/**
 * Security & Data Purge Settings Page
 * Route: /admin/settings/privacy
 * 
 * Provides:
 * 1. Complete User Data Purge & Account Deletion
 * 2. School Tenant Deletion & Decommissioning (Owner Only)
 * 3. School Ownership Transfer
 * 4. Preflight dependency verification and live metrics
 * 5. Multi-factor confirmation modals with password re-auth
 * 6. Machine-readable audit reports and verification
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Lock,
  UserX,
  Building2,
  CheckCircle2,
  FileText,
  RefreshCw,
  Users,
  IndianRupee,
  Bus,
  Layers,
  ChevronRight,
  ExternalLink,
  Download,
  Copy,
  Info,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getAccountDeletionPreflight,
  purgeUserAccount,
  getSchoolDeletionPreflight,
  purgeSchoolData,
  transferSchoolOwnership,
} from "../../../services/deletionService";
import type {
  AccountDeletionPreflight,
  SchoolDeletionPreflight,
  DeletionAuditReport,
} from "../../../types/deletion";

export default function DataDeletionSettings() {
  const navigate = useNavigate();
  const { user, profile, school, signOut } = useAuth();

  // State: Preflight checks
  const [accountPreflight, setAccountPreflight] = useState<AccountDeletionPreflight | null>(null);
  const [schoolPreflight, setSchoolPreflight] = useState<SchoolDeletionPreflight | null>(null);
  const [loadingPreflights, setLoadingPreflights] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State: Account Deletion Modal
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [accountPassword, setAccountPassword] = useState<string>("");
  const [accountConfirmationPhrase, setAccountConfirmationPhrase] = useState<string>("");
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);
  const [accountDeletionError, setAccountDeletionError] = useState<string | null>(null);
  const [accountDeletionSuccess, setAccountDeletionSuccess] = useState<boolean>(false);

  // State: School Deletion Modal
  const [showSchoolModal, setShowSchoolModal] = useState<boolean>(false);
  const [schoolPassword, setSchoolPassword] = useState<string>("");
  const [schoolNameInput, setSchoolNameInput] = useState<string>("");
  const [riskAllData, setRiskAllData] = useState<boolean>(false);
  const [riskFiles, setRiskFiles] = useState<boolean>(false);
  const [riskIrreversible, setRiskIrreversible] = useState<boolean>(false);
  const [isDeletingSchool, setIsDeletingSchool] = useState<boolean>(false);
  const [schoolDeletionError, setSchoolDeletionError] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<DeletionAuditReport | null>(null);

  // State: Transfer Ownership Modal
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [targetEmail, setTargetEmail] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const isSchoolOwner = Boolean(
    school?.id &&
      (school.created_by === user?.id ||
        accountPreflight?.owned_schools?.some((s) => s.id === school.id) ||
        schoolPreflight?.is_owner)
  );

  const loadPreflights = async () => {
    setLoadingPreflights(true);
    setErrorMsg(null);
    try {
      const acc = await getAccountDeletionPreflight();
      setAccountPreflight(acc);

      if (school?.id) {
        const sch = await getSchoolDeletionPreflight(school.id);
        setSchoolPreflight(sch);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load deletion diagnostics.");
    } finally {
      setLoadingPreflights(false);
    }
  };

  useEffect(() => {
    loadPreflights();
  }, [school?.id]);

  // Handle Account Purge
  const handlePurgeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountDeletionError(null);

    if (accountConfirmationPhrase.trim() !== "DELETE MY ACCOUNT") {
      setAccountDeletionError("Please type exactly 'DELETE MY ACCOUNT' to confirm.");
      return;
    }

    if (!accountPassword.trim()) {
      setAccountDeletionError("Password is required to verify identity.");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await purgeUserAccount(accountPassword);
      if (!res.success) {
        setAccountDeletionError(res.message);
        setIsDeletingAccount(false);
        return;
      }

      setAccountDeletionSuccess(true);
      setTimeout(() => {
        signOut();
        navigate("/");
      }, 3500);
    } catch (err: any) {
      setAccountDeletionError(err.message || "Failed to complete account deletion.");
      setIsDeletingAccount(false);
    }
  };

  // Handle School Purge
  const handlePurgeSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolDeletionError(null);

    if (!school?.id) return;

    if (!riskAllData || !riskFiles || !riskIrreversible) {
      setSchoolDeletionError("You must acknowledge and check all risk confirmations.");
      return;
    }

    if (schoolNameInput.trim().toLowerCase() !== school.name.trim().toLowerCase()) {
      setSchoolDeletionError(`School name confirmation does not match "${school.name}".`);
      return;
    }

    if (!schoolPassword.trim()) {
      setSchoolDeletionError("Owner password is required to verify identity.");
      return;
    }

    setIsDeletingSchool(true);
    try {
      const res = await purgeSchoolData(school.id, schoolNameInput, schoolPassword);
      if (!res.success) {
        setSchoolDeletionError(res.message);
        setIsDeletingSchool(false);
        return;
      }

      if (res.audit_report) {
        setAuditReport(res.audit_report);
      }
      setIsDeletingSchool(false);
    } catch (err: any) {
      setSchoolDeletionError(err.message || "Failed to purge school tenant.");
      setIsDeletingSchool(false);
    }
  };

  // Handle Ownership Transfer
  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);

    if (!school?.id) return;
    if (!targetEmail.trim()) {
      setTransferError("Target administrator email is required.");
      return;
    }

    setIsTransferring(true);
    try {
      const res = await transferSchoolOwnership(school.id, targetEmail.trim());
      if (!res.success) {
        setTransferError(res.message);
        setIsTransferring(false);
        return;
      }

      setTransferSuccess(res.message);
      setIsTransferring(false);
      setTimeout(() => {
        setShowTransferModal(false);
        loadPreflights();
      }, 2000);
    } catch (err: any) {
      setTransferError(err.message || "Failed to transfer ownership.");
      setIsTransferring(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Admin
            </Link>
            <span>/</span>
            <Link to="/admin/settings/classes" className="hover:text-blue-600">
              Settings
            </Link>
            <span>/</span>
            <span className="font-medium text-gray-900">Data Deletion & Privacy</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-600" /> Security, Data Purge & Account Deletion
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Execute verified data erasure across the entire MyZkool platform in compliance with Indian DPDPA 2023, IT Act, and multi-tenant security standards.
          </p>
        </div>

        <button
          onClick={loadPreflights}
          disabled={loadingPreflights}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loadingPreflights ? "animate-spin text-blue-600" : ""}`} />
          Recheck Diagnostics
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <Link
          to="/admin/settings/classes"
          className="py-2.5 px-4 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 transition-colors"
        >
          Classes & Section Capacities
        </Link>
        <Link
          to="/admin/settings/classes"
          className="py-2.5 px-4 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 transition-colors"
        >
          Parent Merge Tool
        </Link>
        <div className="py-2.5 px-4 border-b-2 font-medium text-sm border-red-600 text-red-600 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Data Purge & Account Deletion
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Identity & Legal Compliance Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Regulatory Compliance & Data Integrity Framework
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              MyZkool guarantees zero orphaned records and leaves no abandoned personal data. When personal accounts are purged, all exclusively owned records and Storage assets are eradicated. Under <strong>Section 128 of the Indian Companies Act 2013</strong> and <strong>Indian Trust Act</strong>, accounting books and receipts must be retained by active institutions for statutory audit. To protect individual privacy while upholding financial ledger integrity, MyZkool permanently severs and anonymizes actor references (<code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">SET NULL</code>) on retained school records.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-700">
          <div>
            <span className="text-slate-500">Authenticated As: </span>
            <span className="font-semibold text-slate-900">{profile?.full_name || user?.email}</span> ({user?.email})
          </div>
          <div>
            <span className="text-slate-500">Role: </span>
            <span className="font-semibold text-slate-900 capitalize">{profile?.role || "school_admin"}</span>
          </div>
          <div>
            <span className="text-slate-500">Active Tenant: </span>
            <span className="font-semibold text-slate-900">{school?.name || "None"}</span>
          </div>
          <div>
            <span className="text-slate-500">Ownership Status: </span>
            <span className={`font-semibold ${isSchoolOwner ? "text-amber-700" : "text-slate-700"}`}>
              {isSchoolOwner ? "Registered School Owner" : "Staff Administrator"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Distinct Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── WORKFLOW 1: Personal Account Deletion ────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete My Personal Account</h2>
                <p className="text-xs text-gray-500">Permanently erase your identity, drafts, and access credentials</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              When you delete your personal account, your login identity, user profile, notification history, student drafts, and uploaded personal files are permanently deleted.
            </p>

            {/* Preflight Diagnostics Box */}
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2.5">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Account Deletion Readiness</span>
                {accountPreflight?.can_delete ? (
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Action Required
                  </span>
                )}
              </div>

              {accountPreflight?.blocking_reason ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 space-y-2">
                  <p className="font-medium">{accountPreflight.blocking_reason}</p>
                  <p className="text-[11px] text-amber-700">
                    SaaS Multi-tenant Rule: To prevent leaving an active school without an owner, you must either transfer ownership of your registered school(s) or decommission the school first.
                  </p>
                  {accountPreflight.owned_schools && accountPreflight.owned_schools.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-semibold">
                        Owned School: {accountPreflight.owned_schools[0].name}
                      </span>
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="text-xs font-medium text-amber-900 underline hover:text-amber-950"
                      >
                        Transfer Ownership
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-emerald-700 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>No school ownership blockers detected.</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Eligible personal data identified for permanent purge.</span>
                  </div>
                </div>
              )}

              {/* Data Items Breakdown */}
              <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Student draft entries:</span>
                  <span className="font-medium text-gray-700">{accountPreflight?.exclusively_owned_records?.drafts ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Import batch histories:</span>
                  <span className="font-medium text-gray-700">{accountPreflight?.exclusively_owned_records?.import_batches ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Device push tokens:</span>
                  <span className="font-medium text-gray-700">{accountPreflight?.exclusively_owned_records?.device_tokens ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                setAccountDeletionError(null);
                setAccountConfirmationPhrase("");
                setAccountPassword("");
                setShowAccountModal(true);
              }}
              disabled={!accountPreflight?.can_delete}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                accountPreflight?.can_delete
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Delete My Account
            </button>
            {!accountPreflight?.can_delete && (
              <p className="text-[11px] text-gray-500 text-center mt-2">
                Resolve school ownership above to enable account deletion.
              </p>
            )}
          </div>
        </div>

        {/* ─── WORKFLOW 2: School Tenant Decommissioning ────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete School & All School Data</h2>
                <p className="text-xs text-gray-500">Decommission this institution and purge all tenant records</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Permanently purges this school institution, all enrolled students, fee records, invoices, transport routes, custom website pages, and uploaded Storage files.
            </p>

            {/* School Owner Status Check */}
            {!isSchoolOwner ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1.5">
                <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-gray-500" /> School Owner Authorization Required
                </div>
                <p>
                  Only the verified School Owner is authorized to decommission this institution. Your current profile does not have tenant ownership rights.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Tenant Records Breakdown</span>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-800 rounded-full">
                    Tenant: {school?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded border border-gray-200 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Users className="w-3.5 h-3.5 text-blue-600" /> Students:
                    </span>
                    <span className="font-bold text-gray-900">{schoolPreflight?.itemized_summary?.students ?? 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-200 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-600">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" /> Fee Receipts:
                    </span>
                    <span className="font-bold text-gray-900">{schoolPreflight?.itemized_summary?.receipts ?? 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-200 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Bus className="w-3.5 h-3.5 text-amber-600" /> Transport Routes:
                    </span>
                    <span className="font-bold text-gray-900">{schoolPreflight?.itemized_summary?.routes ?? 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-200 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-600">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" /> Storage Files:
                    </span>
                    <span className="font-bold text-gray-900">{schoolPreflight?.itemized_summary?.storage_files ?? 0}</span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500">
                  Subdomain: <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">{school?.subdomain}.myzkool.in</code>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setSchoolDeletionError(null);
                setSchoolPassword("");
                setSchoolNameInput("");
                setRiskAllData(false);
                setRiskFiles(false);
                setRiskIrreversible(false);
                setAuditReport(null);
                setShowSchoolModal(true);
              }}
              disabled={!isSchoolOwner}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                isSchoolOwner
                  ? "bg-slate-900 hover:bg-black text-white shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              }`}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              Decommission & Delete School
            </button>

            {isSchoolOwner && (
              <button
                onClick={() => setShowTransferModal(true)}
                className="w-full py-2 px-3 text-xs font-medium text-gray-600 hover:text-gray-900 text-center"
              >
                Or transfer ownership to another admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: Account Deletion ────────────────────────────────────── */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-red-200">
            <div className="flex items-center gap-3 text-red-600 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Permanently Delete Account</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            {accountDeletionSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-900">Account Successfully Purged</h4>
                <p className="text-xs text-emerald-700">
                  Your personal profile and credentials have been erased. Signing you out...
                </p>
              </div>
            ) : (
              <form onSubmit={handlePurgeAccount} className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                  <p className="font-semibold">Irreversible Personal Data Purge:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>Your login authentication user identity will be permanently deleted.</li>
                    <li>Your administrator profile and personal device tokens will be removed.</li>
                    <li>Any student drafts created by you will be purged.</li>
                    <li>Audit logs and historical fee receipts will have personal actor references anonymized.</li>
                  </ul>
                </div>

                {accountDeletionError && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-xs text-red-800 font-medium">
                    {accountDeletionError}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="account-confirmation-phrase" className="text-xs font-semibold text-gray-700">
                    To confirm, please type <span className="text-red-600 select-all font-mono">DELETE MY ACCOUNT</span>:
                  </label>
                  <input
                    id="account-confirmation-phrase"
                    name="accountConfirmationPhrase"
                    type="text"
                    value={accountConfirmationPhrase}
                    onChange={(e) => setAccountConfirmationPhrase(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="account-password" className="text-xs font-semibold text-gray-700">
                    Confirm your current password:
                  </label>
                  <input
                    id="account-password"
                    name="accountPassword"
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAccountModal(false)}
                    disabled={isDeletingAccount}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingAccount || accountConfirmationPhrase.trim() !== "DELETE MY ACCOUNT" || !accountPassword.trim()}
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {isDeletingAccount ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Purging Account...
                      </>
                    ) : (
                      "Confirm Permanent Deletion"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 2: School Deletion & Audit Report ────────────────────────── */}
      {showSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-red-200 my-8">
            <div className="flex items-center gap-3 text-red-600 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Decommission & Purge School</h3>
                <p className="text-xs text-gray-500">Tenant: {school?.name}</p>
              </div>
            </div>

            {auditReport ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-900">School Tenant Successfully Purged</h4>
                  <p className="text-xs text-emerald-700">
                    All student, staff, fee, transport, and Storage files have been eradicated with zero orphaned records.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Machine-Readable Audit Manifest</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(auditReport, null, 2));
                        alert("Audit Report copied to clipboard!");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
                    >
                      <Copy className="w-3 h-3" /> Copy JSON
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono bg-white p-3 rounded border border-gray-200 max-h-48 overflow-y-auto text-gray-800">
                    {JSON.stringify(auditReport, null, 2)}
                  </pre>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSchoolModal(false);
                      signOut();
                      navigate("/");
                    }}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-lg shadow-sm"
                  >
                    Finish & Return to Home
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePurgeSchool} className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-2">
                  <p className="font-semibold text-red-900">CRITICAL WARNING: Permanent Institution Deletion</p>
                  <p className="text-[11px] leading-relaxed">
                    This action will permanently delete all data belonging to <strong>{school?.name}</strong>. All students ({schoolPreflight?.itemized_summary?.students ?? 0}), fee records ({schoolPreflight?.itemized_summary?.receipts ?? 0}), transport routes ({schoolPreflight?.itemized_summary?.routes ?? 0}), and uploaded files will be destroyed. Other schools on MyZkool are preserved.
                  </p>
                </div>

                {/* 3 Explicit Risk Acknowledgments */}
                <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                  <label htmlFor="purge-risk-all-data" className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      id="purge-risk-all-data"
                      name="riskAllData"
                      type="checkbox"
                      checked={riskAllData}
                      onChange={(e) => setRiskAllData(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span>I understand all student, staff, fee, and academic records will be permanently erased.</span>
                  </label>
                  <label htmlFor="purge-risk-files" className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      id="purge-risk-files"
                      name="riskFiles"
                      type="checkbox"
                      checked={riskFiles}
                      onChange={(e) => setRiskFiles(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span>I confirm all uploaded files, documents, and website assets will be irreversibly purged.</span>
                  </label>
                  <label htmlFor="purge-risk-irreversible" className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      id="purge-risk-irreversible"
                      name="riskIrreversible"
                      type="checkbox"
                      checked={riskIrreversible}
                      onChange={(e) => setRiskIrreversible(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span>I acknowledge this action cannot be undone and no backups can be restored.</span>
                  </label>
                </div>

                {schoolDeletionError && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-xs text-red-800 font-medium">
                    {schoolDeletionError}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="purge-school-name" className="text-xs font-semibold text-gray-700">
                    To confirm, please type the exact school name: <span className="text-red-700 font-bold select-all">"{school?.name}"</span>:
                  </label>
                  <input
                    id="purge-school-name"
                    name="schoolNameConfirmation"
                    type="text"
                    value={schoolNameInput}
                    onChange={(e) => setSchoolNameInput(e.target.value)}
                    placeholder={school?.name || "School name"}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="purge-school-password" className="text-xs font-semibold text-gray-700">
                    Owner Account Password:
                  </label>
                  <input
                    id="purge-school-password"
                    name="ownerAccountPassword"
                    type="password"
                    value={schoolPassword}
                    onChange={(e) => setSchoolPassword(e.target.value)}
                    placeholder="Enter owner password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowSchoolModal(false)}
                    disabled={isDeletingSchool}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isDeletingSchool ||
                      !riskAllData ||
                      !riskFiles ||
                      !riskIrreversible ||
                      schoolNameInput.trim().toLowerCase() !== school?.name?.trim().toLowerCase() ||
                      !schoolPassword.trim()
                    }
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {isDeletingSchool ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Purging School Tenant...
                      </>
                    ) : (
                      "Permanently Purge School"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Transfer Ownership ─────────────────────────────────── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-amber-200">
            <div className="flex items-center gap-3 text-amber-700 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Transfer School Ownership</h3>
                <p className="text-xs text-gray-500">School: {school?.name}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Designate another registered administrator as the primary owner of this institution. Once transferred, your personal account ownership restriction will be lifted.
            </p>

            {transferSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
                {transferSuccess}
              </div>
            )}

            {transferError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransferOwnership} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="transfer-target-email" className="text-xs font-semibold text-gray-700">
                  New Owner's Email Address:
                </label>
                <input
                  id="transfer-target-email"
                  name="targetEmail"
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="admin@school.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  disabled={isTransferring}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring || !targetEmail.trim()}
                  className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {isTransferring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Transferring...
                    </>
                  ) : (
                    "Transfer Ownership"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
