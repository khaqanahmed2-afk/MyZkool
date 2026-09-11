import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { MyZkoolLogo } from "../MyZkoolLogo";
import { OnboardingProgress } from "./OnboardingProgress";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, HelpCircle, ShieldCheck } from "lucide-react";

interface OnboardingLayoutProps {
  currentStepNumber: number;
  completedStepNumbers?: number[];
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  currentStepNumber,
  completedStepNumbers = [],
  title,
  subtitle,
  children,
}) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-[#141A2E]">
      {/* Top Navbar */}
      <header className="w-full bg-white border-b border-[#E6EAF3] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            title="MyZkool Home"
          >
            <MyZkoolLogo size={32} showText={true} />
          </Link>

          {/* User Account / Exit */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#141A2E] leading-tight">
                {profile?.full_name || "School Administrator"}
              </span>
              <span className="text-[11px] text-[#5B6478] leading-tight truncate max-w-[180px]">
                {user?.email || ""}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              id="onboarding-signout-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] hover:bg-[#F1F5F9] rounded-lg transition-colors border border-transparent hover:border-[#E2E8F0]"
              title="Save progress and log out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save &amp; Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Onboarding Stepper Header */}
        <div className="mb-6">
          <OnboardingProgress
            currentStepNumber={currentStepNumber}
            completedStepNumbers={completedStepNumbers}
          />
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-sm p-5 sm:p-8">
          <div className="mb-6 border-b border-[#F1F5F9] pb-4">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#141A2E]">
              {title}
            </h1>
            <p className="text-sm text-[#5B6478] mt-1">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </main>

      {/* Footer Support Notice */}
      <footer className="w-full py-4 text-center text-xs text-[#5B6478] border-t border-[#E6EAF3] bg-white">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#5B6478]">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Encrypted School-Level Data Isolation</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[#5B6478]">
              <HelpCircle className="w-3.5 h-3.5" /> Questions?
            </span>
            <a
              href="mailto:support@myzkool.com"
              className="text-[#2158E0] hover:underline font-medium"
            >
              support@myzkool.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
