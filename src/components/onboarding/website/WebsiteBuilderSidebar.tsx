import React from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Circle,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  CreditCard,
  Globe,
  Rocket,
  Palette,
  LayoutTemplate,
  Phone,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

export type WebsiteBuilderTab =
  | "identity"
  | "theme"
  | "hero_principal"
  | "facilities_gallery"
  | "sections"
  | "contact";

interface WebsiteBuilderSidebarProps {
  currentTab: WebsiteBuilderTab;
  onTabChange: (tab: WebsiteBuilderTab) => void;
  isDraftSaved: boolean;
  isSavingDraft: boolean;
  onSaveDraft: () => void;
  schoolSubdomain?: string;
}

const ONBOARDING_STEPS_CONFIG = [
  { step: 1, title: "School Profile", route: "/onboarding/school", icon: Building2 },
  { step: 2, title: "Academic Year", route: "/onboarding/academics", icon: Calendar },
  { step: 3, title: "Classes & Sections", route: "/onboarding/classes", icon: Layers },
  { step: 4, title: "Plan & Billing", route: "/onboarding/subscription", icon: CreditCard },
  { step: 5, title: "School Website", route: "/onboarding/website", icon: Globe },
  { step: 6, title: "Launch School", route: "/onboarding/complete", icon: Rocket },
];

const BUILDER_TABS = [
  { id: "identity" as WebsiteBuilderTab, title: "1. Identity & Name", icon: Globe },
  { id: "theme" as WebsiteBuilderTab, title: "2. Color Theme", icon: Palette },
  { id: "hero_principal" as WebsiteBuilderTab, title: "3. Hero & Leadership", icon: LayoutTemplate },
  { id: "facilities_gallery" as WebsiteBuilderTab, title: "4. Campus & Gallery", icon: ImageIcon },
  { id: "sections" as WebsiteBuilderTab, title: "5. Section Toggles", icon: Layers },
  { id: "contact" as WebsiteBuilderTab, title: "6. Contact & Social", icon: Phone },
];

export const WebsiteBuilderSidebar: React.FC<WebsiteBuilderSidebarProps> = ({
  currentTab,
  onTabChange,
  isDraftSaved,
  isSavingDraft,
  onSaveDraft,
  schoolSubdomain,
}) => {
  // Steps 1 to 4 are completed; Step 5 is current active (4/6 = 67% or current in progress)
  const completedStepsCount = 4;
  const totalSteps = 6;
  const progressPercent = Math.round((completedStepsCount / totalSteps) * 100);

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-5">
      {/* Onboarding Progress Card */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2158E0]" />
            <span className="text-xs font-bold text-[#141A2E]">Setup Progress</span>
          </div>
          <span className="text-xs font-semibold text-[#2158E0] bg-blue-50 px-2 py-0.5 rounded-full">
            {progressPercent}%
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-[#2158E0] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step list */}
        <div className="space-y-1">
          {ONBOARDING_STEPS_CONFIG.map((item) => {
            const isCompleted = item.step < 5;
            const isCurrent = item.step === 5;
            const isPending = item.step > 5;
            const Icon = item.icon;

            return (
              <div key={item.step}>
                {isCompleted ? (
                  <Link
                    to={item.route}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#141A2E] hover:bg-slate-50 transition-colors group"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span className="truncate group-hover:text-[#2158E0]">{item.title}</span>
                  </Link>
                ) : isCurrent ? (
                  <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#2158E0] bg-blue-50/70 border border-[#2158E0]/20">
                    <span className="w-4 h-4 rounded-full bg-[#2158E0] text-white flex items-center justify-center shrink-0 text-[10px]">
                      5
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] opacity-75">
                    <span className="w-4 h-4 rounded-full border border-[#CBD5E1] text-[#94A3B8] flex items-center justify-center shrink-0 text-[10px]">
                      6
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Website Builder Section Navigator */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Builder Sections
          </span>
          <span className="text-[11px] font-medium text-[#5B6478]">Step 5 of 6</span>
        </div>

        <nav className="space-y-1" aria-label="Website Builder Navigation">
          {BUILDER_TABS.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-[#2158E0] text-white shadow-xs"
                    : "text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-[#94A3B8]"}`} />
                <span className="truncate">{tab.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Draft save bar */}
        <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-[11px]">
              {isDraftSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[#10B981] font-medium">Draft saved</span>
                </>
              ) : (
                <>
                  <Circle className="w-2.5 h-2.5 fill-amber-500 text-amber-500 animate-pulse" />
                  <span className="text-amber-700 font-medium">Unsaved edits</span>
                </>
              )}
            </div>
            {schoolSubdomain && (
              <span className="text-[10px] font-mono text-[#94A3B8]">
                {schoolSubdomain}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSavingDraft}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#141A2E] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSavingDraft ? (
              <>
                <div className="w-3 h-3 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin" />
                <span>Saving draft...</span>
              </>
            ) : (
              <span>Save draft</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
