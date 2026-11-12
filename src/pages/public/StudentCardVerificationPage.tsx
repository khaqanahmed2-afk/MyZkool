import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Calendar,
  User,
  GraduationCap,
  Hash,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { verifyStudentCardToken, CardVerificationPublicResult } from "../../services/idCardService";

export default function StudentCardVerificationPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CardVerificationPublicResult | null>(null);

  useEffect(() => {
    let isCurrent = true;
    async function runVerification() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await verifyStudentCardToken(token);
        if (isCurrent) {
          setData(res);
        }
      } catch (err: any) {
        if (isCurrent) {
          setData({ is_valid: false, error: err.message || "Failed to verify identity card." });
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }
    runVerification();
    return () => {
      isCurrent = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans">
      {/* Top Branding Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2 mb-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#2158E0] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            Z
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900">
            My<span className="text-[#2158E0]">Zkool</span>
          </span>
        </Link>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Verified Identity Portal
        </span>
      </header>

      {/* Main Verification Card */}
      <main className="max-w-md w-full mx-auto">
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Verifying Student Identity...</h2>
            <p className="text-xs text-slate-500">
              Querying cryptographically signed institution records...
            </p>
          </div>
        ) : !data || (!data.is_valid && data.card_status !== "revoked" && data.card_status !== "inactive") ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Invalid Verification Code</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {data?.error || "This QR code or token is not associated with an authentic student identity record."}
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Return to MyZkool
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Status Header Banner */}
            {data.card_status === "revoked" ? (
              <div className="bg-rose-600 text-white p-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wider uppercase mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> CARD REVOKED
                </div>
                <p className="text-xs text-rose-100 font-medium">
                  {data.revocation_reason || "This ID card was revoked and is no longer valid."}
                </p>
              </div>
            ) : data.card_status === "inactive" ? (
              <div className="bg-amber-500 text-white p-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wider uppercase mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> TEMPORARILY INACTIVE
                </div>
                <p className="text-xs text-amber-100 font-medium">
                  This card has been placed on hold by the school administration.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wider uppercase mb-0.5">
                  <CheckCircle className="w-3.5 h-3.5" /> OFFICIALLY VERIFIED
                </div>
                <p className="text-[11px] text-emerald-100 font-medium">
                  Authentic Student Identity Record
                </p>
              </div>
            )}

            {/* School Profile Bar */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
              {data.school_logo_url ? (
                <img
                  src={data.school_logo_url}
                  alt={data.school_name}
                  className="w-11 h-11 rounded-xl object-contain bg-white p-1 border border-slate-200 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                  {data.school_name}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {data.school_city ? `${data.school_city}, ${data.school_state}` : "Registered Institution"}
                </p>
              </div>
            </div>

            {/* Student Details Section */}
            <div className="p-6 space-y-5">
              {/* Photo & Name */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-24 rounded-2xl border-2 border-slate-200 bg-slate-50 overflow-hidden shadow-sm flex items-center justify-center shrink-0">
                  {data.photo_url ? (
                    <img
                      src={data.photo_url}
                      alt={data.student_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                    {data.student_name}
                  </h1>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Class {data.class_name} {data.section_name ? `(${data.section_name})` : ""}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Adm No: <strong className="text-slate-800">{data.admission_no}</strong>
                  </p>
                </div>
              </div>

              {/* Safe Public Information Specs Grid */}
              <div className="grid grid-cols-2 gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Roll Number
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {data.roll_no || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Institutional Status
                  </span>
                  <span className="font-bold text-emerald-700">Enrolled & Active</span>
                </div>

                {data.issued_at && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Card Issued On
                    </span>
                    <span className="font-medium text-slate-700">
                      {new Date(data.issued_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Session Period
                  </span>
                  <span className="font-medium text-slate-700">2026-2027</span>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold block mb-0.5 flex items-center gap-1 text-blue-700">
                  <ShieldCheck className="w-3.5 h-3.5" /> Privacy & Verification Guarantee
                </span>
                This portal verifies student authenticity for identity verification, library, and
                transport check-in. In accordance with student privacy protection standards, private
                contact numbers and residential addresses are not publicly disclosed.
              </div>
            </div>

            {/* Card Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
              <span>Token: </span>
              <span className="font-mono text-slate-600">{token}</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center text-xs text-slate-400 py-4">
        © {new Date().getFullYear()} MyZkool Platform. Protected multi-tenant student verification.
      </footer>
    </div>
  );
}
