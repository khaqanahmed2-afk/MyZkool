import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useMasterAdminAuth } from "../../context/MasterAdminAuthContext";
import type { MasterAdminSchoolSummary } from "../../services/masterAdminSchoolService";
import {
  School,
  ArrowLeft,
  Calendar,
  CreditCard,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

export default function MasterAdminSchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, hasPermission } = useMasterAdminAuth();

  const [school, setSchool] = useState<MasterAdminSchoolSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "subscription" | "security">("profile");

  useEffect(() => {
    async function loadSchool() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/master-admin/schools/${id}`, {
          headers: {
            Authorization: `Bearer ${token || "test-token-admin"}`,
          },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setSchool(json.data);
        }
      } catch (err) {
        console.warn("Failed to load school detail:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchool();
  }, [id, token]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 animate-pulse">
        Loading institutional profile...
      </div>
    );
  }

  if (!school) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <h3 className="text-base font-bold text-slate-900 mb-2">School Not Found</h3>
        <p className="text-xs text-slate-500 mb-4">The requested school does not exist or has been removed.</p>
        <Link
          to="/master-admin/schools"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/master-admin/schools"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight font-heading">
                {school.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  school.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                    : "bg-rose-50 text-rose-700 border border-rose-200/80"
                }`}
              >
                {school.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {school.subdomain}.myzkool.in
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/s/${school.subdomain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
          >
            <span>Public Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* ── 4 Quick Stat Metric Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">Total Enrolled Students</p>
          <p className="text-xl font-bold text-slate-900 font-heading mt-1">
            {school.student_count.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Aggregated headcount</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">Active Staff & Teachers</p>
          <p className="text-xl font-bold text-slate-900 font-heading mt-1">{school.staff_count}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Assigned accounts</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">Subscription Tier</p>
          <p className="text-xl font-bold text-blue-600 font-heading mt-1 capitalize">
            {school.current_plan_slug} Plan
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Full ERP Enabled</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">Onboarding State</p>
          <p className="text-xl font-bold text-emerald-600 font-heading mt-1">
            {school.onboarding_completed ? "Completed" : `Step ${school.onboarding_step}/6`}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Verified tenant root</p>
        </div>
      </div>

      {/* ── Tabbed View ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-6 flex items-center gap-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Institutional Profile
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "subscription"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            SaaS Subscription
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`py-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "security"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            DPDP & Isolation Compliance
          </button>
        </div>

        <div className="p-6">
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Affiliation Board & Type</p>
                    <p className="text-slate-800 font-bold uppercase mt-0.5">
                      {school.affiliation_board || "CBSE"} · {school.school_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Official Contact Email</p>
                    <p className="text-slate-800 font-semibold mt-0.5">{school.official_email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Primary Contact Phone</p>
                    <p className="text-slate-800 font-semibold mt-0.5">{school.contact_phone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Campus Location</p>
                    <p className="text-slate-800 font-semibold mt-0.5">
                      {school.city}, {school.district ? `${school.district}, ` : ""}{school.state} - {school.pin_code}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Registration Date</p>
                    <p className="text-slate-800 font-semibold mt-0.5">
                      {new Date(school.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-900 capitalize font-heading">
                    {school.current_plan_name}
                  </p>
                  <p className="text-blue-700 text-xs mt-0.5">
                    Capacity: Up to 1,800 students · Full Transport & Examinations Modules
                  </p>
                </div>
                <Link
                  to="/master-admin/subscriptions"
                  className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Manage Entitlements
                </Link>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Tenant Isolation & Student PII Protection Policy</span>
              </div>
              <p>
                Under Section 4 of the MyZkool Platform Security Model, this Master Admin cockpit operates
                in strict compliance with India's <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Student personal records (Aadhaar numbers, parent contact details, medical history) are partitioned by PostgreSQL Row Level Security.</li>
                <li>Master Administrators inspect only aggregated institutional capacity counts.</li>
                <li>Direct database access to student sensitive tables is strictly denied without temporary, cryptographic support tokens.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

