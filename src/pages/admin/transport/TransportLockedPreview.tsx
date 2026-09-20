import React from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Lock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  MessageSquare,
  MapPin,
  CheckCircle,
  FileText,
} from "lucide-react";

export function TransportLockedPreview() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Upgrade Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#141A2E] via-[#1E293B] to-[#0F172A] text-white p-8 md:p-10 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            Pro Plan Feature
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Smart School Bus & Transport Management
          </h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            Ensure student transit safety with live route planning, driver app access, automated WhatsApp stop alerts, vehicle compliance tracking, and bus fee billing.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/onboarding/subscription"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all"
            >
              Upgrade to Pro Plan
              <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="text-xs text-gray-400">
              Only ₹1,799/month for up to 1,800 students
            </span>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <Bus className="absolute right-8 top-1/2 -translate-y-1/2 w-64 h-64 text-white/5 pointer-events-none hidden lg:block" />
      </div>

      {/* Feature Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#E6EAF3] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#141A2E]">
            Interactive Route & Stop Builder
          </h3>
          <p className="text-xs text-[#5B6478] leading-relaxed">
            Visual stop timeline with drag-and-drop sequencing, automated time helper, capacity meters, and OpenStreetMap pin dropping.
          </p>
          <ul className="space-y-1.5 pt-2 text-xs text-[#141A2E]">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Continuous sequence validation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Overcapacity warnings
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Printable driver route sheets
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E6EAF3] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#141A2E]">
            Driver & Attendant Web App
          </h3>
          <p className="text-xs text-[#5B6478] leading-relaxed">
            Passwordless WhatsApp invite with instant OTP login. Drivers can manage boarding, mark absentees, and perform bus-empty checks.
          </p>
          <ul className="space-y-1.5 pt-2 text-xs text-[#141A2E]">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              1-Tap student boarding roll
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Offline sync capability
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Safety checklists
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E6EAF3] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#141A2E]">
            Fleet Compliance & Expiry Alerts
          </h3>
          <p className="text-xs text-[#5B6478] leading-relaxed">
            Daily automated scans for RC, insurance, fitness, PUC, road tax, permits, and driver licenses with proactive 30-day alerts.
          </p>
          <ul className="space-y-1.5 pt-2 text-xs text-[#141A2E]">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Document expiry chips
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Daily 08:00 AM notifications
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Automatic route schedule checks
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E6EAF3] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#141A2E]">
            Flexible Transport Fee Zones
          </h3>
          <p className="text-xs text-[#5B6478] leading-relaxed">
            Bill transport fees by zone, by stop, or by distance (km). Connect directly into the MyZkool Fee collection and ledger system.
          </p>
          <ul className="space-y-1.5 pt-2 text-xs text-[#141A2E]">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Both ways, pickup only & drop only
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Configurable billing months
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Automated fee generation
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E6EAF3] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#141A2E]">
            WhatsApp Parent Notifications
          </h3>
          <p className="text-xs text-[#5B6478] leading-relaxed">
            Send automated approaching notices when the bus is 800m away, boarding confirmations, and delay broadcast alerts.
          </p>
          <ul className="space-y-1.5 pt-2 text-xs text-[#141A2E]">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Zero parent app installation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              Authorized guardian verification
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              High delivery reliability
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl p-6 border border-blue-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#141A2E]">
              Ready to modernize school transport?
            </h3>
            <p className="text-xs text-[#5B6478] leading-relaxed">
              Upgrading to Pro unlocks Transport along with Examinations, Timetable, and Priority WhatsApp Support.
            </p>
          </div>
          <Link
            to="/onboarding/subscription"
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-[#2158E0] hover:bg-blue-600 text-white font-bold text-xs text-center transition-colors shadow-sm"
          >
            Upgrade School Plan Now
          </Link>
        </div>
      </div>
    </div>
  );
}
export default TransportLockedPreview;
