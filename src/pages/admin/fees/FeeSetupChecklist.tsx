import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  IndianRupee,
  Calendar,
  Grid3X3,
  Tag,
  Clock,
  Settings2,
  Zap,
} from "lucide-react";
import { getFeeHeads } from "../../../services/feeSetupService";
import { getFeeTerms } from "../../../services/feeSetupService";
import { useAuth } from "../../../hooks/useAuth";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  required: boolean;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: "heads",
    label: "Fee Heads",
    description: "Define what you charge: tuition, exam fee, transport, and more.",
    href: "/admin/fees/setup/heads",
    icon: IndianRupee,
    required: true,
  },
  {
    id: "terms",
    label: "Fee Terms",
    description: "Monthly, quarterly, half-yearly or custom payment schedule.",
    href: "/admin/fees/setup/terms",
    icon: Calendar,
    required: true,
  },
  {
    id: "structures",
    label: "Class Fee Structures",
    description: "Set the amount per head per term for every class.",
    href: "/admin/fees/setup/structures",
    icon: Grid3X3,
    required: true,
  },
  {
    id: "concessions",
    label: "Concession Rules",
    description: "Sibling, RTE, staff-ward and merit discounts.",
    href: "/admin/fees/setup/concessions",
    icon: Tag,
    required: false,
  },
  {
    id: "late_fees",
    label: "Late Fee Rules",
    description: "Flat, daily, weekly, monthly or percent-once penalties.",
    href: "/admin/fees/setup/late-fees",
    icon: Clock,
    required: false,
  },
  {
    id: "settings",
    label: "Receipt & Settings",
    description: "Prefix, paper size, owner PIN, partial payment options.",
    href: "/admin/fees/setup/settings",
    icon: Settings2,
    required: false,
  },
];

export default function FeeSetupChecklist() {
  const navigate = useNavigate();
  const { school: authSchool, schoolId: authSchoolId, loading: authLoading } = useAuth() as any;
  const [doneMask, setDoneMask] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const activeSchoolId = authSchool?.id || authSchoolId || null;

  useEffect(() => {
    if (authLoading) return;
    if (!activeSchoolId) {
      setLoading(false);
      return;
    }

    async function check() {
      setLoading(true);
      try {
        const mask: Record<string, boolean> = {};
        const { heads } = await getFeeHeads(activeSchoolId!);
        mask["heads"] = (heads || []).length > 0;
        // terms check using dummy year — just flag as done if any terms exist in localStorage
        const allKeys = typeof localStorage !== "undefined"
          ? Object.keys(localStorage).filter(k => k.startsWith(`myzkool_fee_terms_${activeSchoolId}_`))
          : [];
        mask["terms"] = allKeys.some(k => {
          try { return JSON.parse(localStorage.getItem(k) || "[]").length > 0; } catch { return false; }
        });
        mask["structures"] = false;
        mask["concessions"] = false;
        mask["late_fees"] = false;
        mask["settings"] = false;
        setDoneMask(mask);
      } catch (err) {
        console.warn("Checklist load error:", err);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [activeSchoolId, authLoading]);

  const doneCount = Object.values(doneMask).filter(Boolean).length;
  const requiredDone = CHECKLIST.filter(c => c.required).every(c => doneMask[c.id]);
  const progress = Math.round((doneCount / CHECKLIST.length) * 100);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <FeeNavHeader
        title="Fee Setup Hub"
        subtitle="Complete these setup steps once to start generating and collecting fees."
      />


      {/* Progress bar */}
      <div className="mb-6 bg-white border border-[#E6EAF3] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#141A2E]">
            {doneCount} of {CHECKLIST.length} done
          </span>
          <span className="text-xs text-[#5B6478]">{progress}% complete</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-[#2158E0] h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-8">
        {CHECKLIST.map((item) => {
          const done = doneMask[item.id] ?? false;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className="w-full flex items-center gap-4 bg-white border border-[#E6EAF3] rounded-xl p-4 hover:border-[#2158E0]/30 hover:bg-[#F0F5FE]/30 transition-colors text-left group"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-green-50" : "bg-[#F0F5FE]"}`}>
                <Icon className={`w-5 h-5 ${done ? "text-green-600" : "text-[#2158E0]"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#141A2E]">{item.label}</span>
                  {!item.required && (
                    <span className="text-[10px] bg-gray-100 text-[#5B6478] px-2 py-0.5 rounded-full">Optional</span>
                  )}
                </div>
                <p className="text-xs text-[#5B6478] mt-0.5 truncate">{item.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {done
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Circle className="w-5 h-5 text-gray-300" />
                }
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#2158E0] transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Generate dues CTA */}
      {requiredDone && (
        <div className="bg-[#2158E0] rounded-xl p-6 text-white text-center">
          <Zap className="w-8 h-8 mx-auto mb-3 text-yellow-300" />
          <h3 className="text-lg font-bold mb-1">Ready to generate dues!</h3>
          <p className="text-blue-100 text-sm mb-4">
            All required steps are complete. Generate dues for all students now.
          </p>
          <button
            onClick={() => navigate("/admin/fees/dues")}
            className="bg-white text-[#2158E0] font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Generate Dues for All Students
          </button>
        </div>
      )}
    </div>
  );
}

