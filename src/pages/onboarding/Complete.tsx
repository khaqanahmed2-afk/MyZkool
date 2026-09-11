import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import {
  getSchoolForCurrentUser,
  completeOnboarding,
} from "../../services/schoolService";
import { getCurrentAcademicYear } from "../../services/academicService";
import { getClassesWithSections } from "../../services/classSectionService";
import { getSubjects } from "../../services/subjectService";
import { getSchoolSubscription } from "../../services/subscriptionService";
import {
  getSchoolWebsite,
  formatSchoolWebsiteUrl,
  formatParentPortalUrl,
} from "../../services/websiteService";
import { getStaff } from "../../services/staffService";
import type { School } from "../../types/school";
import type { AcademicYear } from "../../types/academic";
import type { SchoolClass } from "../../types/curriculum";
import type { Subject } from "../../types/curriculum";
import type { SchoolSubscription } from "../../types/subscription";
import type { SchoolWebsite } from "../../types/website";
import type { StaffMember } from "../../types/staff";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  School as SchoolIcon,
  Calendar,
  BookOpen,
  CreditCard,
  Globe,
  Users,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";

export default function Complete() {
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Core Data State
  const [school, setSchool] = useState<School | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSummaryData() {
      if (!user) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // 1. Fetch School
        const { school: currentSchool, error: schoolErr } =
          await getSchoolForCurrentUser(user.id);

        if (!isMounted) return;

        if (schoolErr || !currentSchool) {
          setErrorMessage(
            "School profile not found. Please complete Step 1: School Profile first."
          );
          setIsLoading(false);
          return;
        }

        setSchool(currentSchool);

        // 2. Fetch Academic Year
        const { academicYear: currentYear } = await getCurrentAcademicYear(
          currentSchool.id
        );
        if (isMounted && currentYear) {
          setAcademicYear(currentYear);

          // 3. Fetch Classes & Subjects with year
          const { classes: classList } = await getClassesWithSections(
            currentSchool.id,
            currentYear.id
          );
          if (isMounted && classList) setClasses(classList);

          const { subjects: subjectList } = await getSubjects(
            currentSchool.id,
            currentYear.id
          );
          if (isMounted && subjectList) setSubjects(subjectList);
        }

        // 4. Fetch Subscription
        const { subscription: currentSub } = await getSchoolSubscription(
          currentSchool.id
        );
        if (isMounted && currentSub) setSubscription(currentSub);

        // 5. Fetch Website
        const { website: currentWeb } = await getSchoolWebsite(
          currentSchool.id
        );
        if (isMounted && currentWeb) setWebsite(currentWeb);

        // 6. Fetch Staff
        const { staff: staffList } = await getStaff(currentSchool.id);
        if (isMounted && staffList) setStaff(staffList);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load onboarding summary.";
        setErrorMessage(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSummaryData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleLaunchDashboard = async () => {
    if (!school || !user) return;
    setIsLaunching(true);
    setErrorMessage(null);

    try {
      const res = await completeOnboarding({
        schoolId: school.id,
        userId: user.id,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to complete onboarding.");
        setIsLaunching(false);
        return;
      }

      await refreshSession();
      navigate("/admin");
    } catch {
      setErrorMessage("Failed to launch admin dashboard. Please try again.");
      setIsLaunching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#2158E0] mb-3" />
        <p className="text-xs text-[#5B6478] font-medium">
          Compiling your school workspace summary...
        </p>
      </div>
    );
  }

  if (!school) {
    return (
      <OnboardingLayout
        currentStepNumber={8}
        completedStepNumbers={[1, 2, 3, 4, 5, 6, 7]}
        title="Your School Is Ready"
        subtitle="Onboarding Summary"
      >
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#141A2E] mb-1">
            Setup Incomplete
          </h2>
          <p className="text-xs text-[#5B6478] mb-5">
            {errorMessage || "School record not found. Please restart onboarding."}
          </p>
          <Link
            to="/onboarding/school"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors"
          >
            <span>Go to Step 1</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  const websiteUrl = formatSchoolWebsiteUrl(school.subdomain);
  const portalUrl = formatParentPortalUrl(school.subdomain);
  const totalSections = classes.reduce(
    (acc, curr) => acc + (curr.sections?.length || 0),
    0
  );
  const teacherCount = staff.filter((s) => s.role === "teacher" && s.status !== "archived").length;
  const accountantCount = staff.filter((s) => s.role === "accountant" && s.status !== "archived").length;

  return (
    <OnboardingLayout
      currentStepNumber={8}
      completedStepNumbers={[1, 2, 3, 4, 5, 6, 7]}
      title="Your School Is Ready"
      subtitle="Congratulations! Your school workspace, academic structure, website, and staff directory are successfully configured."
    >
      <div className="space-y-8">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              <p className="font-semibold">Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Celebration Header Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#2158E0] text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold font-heading">
                    {school.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Ready for Launch
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Your tenant-isolated database, academic year, curriculum, public website, and administrative controls are fully operational.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="launch-admin-btn-top"
              onClick={handleLaunchDashboard}
              disabled={isLaunching}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-all shrink-0 cursor-pointer shadow-md disabled:opacity-60"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Workspace...</span>
                </>
              ) : (
                <>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Launch Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 8 Verified Milestones Checklist */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6478] mb-3">
            Onboarding Milestones Completed
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { title: "1. School Profile", desc: school.subdomain + ".myzkool.com" },
              {
                title: "2. Academic Year",
                desc: academicYear
                  ? `${academicYear.start_year} – ${academicYear.end_year}`
                  : "Configured",
              },
              {
                title: "3. Classes & Sections",
                desc: `${classes.length} Classes · ${totalSections} Sections`,
              },
              {
                title: "4. Subjects Library",
                desc: `${subjects.length} Subjects Defined`,
              },
              {
                title: "5. Subscription",
                desc: subscription?.plan?.name || "14-Day Free Trial",
              },
              {
                title: "6. School Website",
                desc: website?.published ? "Published" : "Draft Prepared",
              },
              {
                title: "7. Staff Directory",
                desc: `${staff.length} Staff Enrolled`,
              },
              {
                title: "8. Admin Workspace",
                desc: "100% Ready",
              },
            ].map((milestone, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white border border-[#E6EAF3] flex items-start gap-2.5 shadow-xs"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#141A2E] leading-tight truncate">
                    {milestone.title}
                  </h4>
                  <p className="text-[11px] text-[#5B6478] truncate mt-0.5">
                    {milestone.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Configuration Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: School Profile & Identity */}
          <div className="p-5 rounded-2xl bg-white border border-[#E6EAF3] shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
                <SchoolIcon className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#141A2E]">
                School Profile &amp; Location
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#5B6478] block text-[11px]">Institution Name</span>
                <strong className="text-[#141A2E] font-semibold block truncate">
                  {school.name}
                </strong>
              </div>
              <div>
                <span className="text-[#5B6478] block text-[11px]">Affiliation Board</span>
                <strong className="text-[#141A2E] font-semibold block truncate">
                  {school.affiliation_board || "Standard Board"}
                </strong>
              </div>
              <div>
                <span className="text-[#5B6478] block text-[11px]">Official Email</span>
                <strong className="text-[#141A2E] font-semibold block truncate">
                  {school.official_email}
                </strong>
              </div>
              <div>
                <span className="text-[#5B6478] block text-[11px]">Contact Phone</span>
                <strong className="text-[#141A2E] font-semibold block truncate">
                  {school.contact_phone || "—"}
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-[#5B6478] block text-[11px]">Campus Address</span>
                <p className="text-[#141A2E] text-[11px] truncate">
                  {school.address ? `${school.address}, ${school.city}, ${school.state}` : "Configured"}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Academic & Curriculum */}
          <div className="p-5 rounded-2xl bg-white border border-[#E6EAF3] shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#141A2E]">
                Academic Year &amp; Curriculum
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#5B6478] block text-[11px]">Active Academic Year</span>
                <strong className="text-[#141A2E] font-semibold block">
                  {academicYear ? `${academicYear.start_year} – ${academicYear.end_year}` : "2026 – 2027"}
                </strong>
              </div>
              <div>
                <span className="text-[#5B6478] block text-[11px]">Classes &amp; Grades</span>
                <strong className="text-[#141A2E] font-semibold block">
                  {classes.length} Classes
                </strong>
              </div>
              <div>
                <span className="text-[#5B6478] block text-[11px]">Total Sections</span>
                <strong className="text-[#141A2E] font-semibold block">
                  {totalSections} Sections
                </strong>
              </div>
              <div className="col-span-3 pt-1 border-t border-[#F1F5F9]">
                <span className="text-[#5B6478] block text-[11px]">Curriculum Library</span>
                <p className="text-[#141A2E] text-xs font-medium mt-0.5">
                  {subjects.length} Core &amp; Elective Subjects assigned across grade levels.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Public Website & Parent Portal */}
          <div className="p-5 rounded-2xl bg-white border border-[#E6EAF3] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#141A2E]">
                  Public Website &amp; Portal
                </h3>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  website?.published
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {website?.published ? "Published" : "Draft Mode"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[#5B6478] block text-[11px] mb-1">
                  Public Website Address
                </span>
                <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-lg font-mono text-xs">
                  <span className="truncate flex-1 text-[#141A2E] font-medium">
                    {websiteUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(websiteUrl, "website")}
                    className="text-[#2158E0] hover:text-[#1a4ec4] flex items-center gap-1 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedUrl === "website" ? (
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#5B6478] hover:text-[#141A2E]"
                    title="Visit site"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div>
                <span className="text-[#5B6478] block text-[11px] mb-1">
                  Separate Parent Portal URL
                </span>
                <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-lg font-mono text-xs">
                  <span className="truncate flex-1 text-[#141A2E] font-medium">
                    {portalUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(portalUrl, "portal")}
                    className="text-[#2158E0] hover:text-[#1a4ec4] flex items-center gap-1 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedUrl === "portal" ? (
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Plan, Subscription & Staff */}
          <div className="p-5 rounded-2xl bg-white border border-[#E6EAF3] shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#141A2E]">
                Subscription Plan &amp; Staff
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#5B6478] block text-[11px]">Selected Plan</span>
                <strong className="text-[#141A2E] font-semibold block truncate">
                  {subscription?.plan?.name || "Professional"}
                </strong>
              </div>
              <div>
                <span className="text-[#5B6478] block text-[11px]">Trial Status</span>
                <span className="text-emerald-700 font-semibold block text-xs">
                  14-Day Free Trial Active
                </span>
              </div>
              <div>
                <span className="text-[#5B6478] block text-[11px]">Billing Cycle</span>
                <span className="text-[#141A2E] font-medium capitalize block">
                  {subscription?.billing_cycle || "Monthly"}
                </span>
              </div>
              <div>
                <span className="text-[#5B6478] block text-[11px]">Staff Roster</span>
                <span className="text-[#141A2E] font-semibold block">
                  {staff.length} Members ({teacherCount} T / {accountantCount} A)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Multi-Tenant Isolation Callout */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E6EAF3] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-[#5B6478]">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Strict multi-tenant isolation enforced via PostgreSQL Row-Level Security (RLS)</span>
          </div>
          <span className="font-mono text-[11px] text-[#475569] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
            school_id: {school.id.slice(0, 8)}...
          </span>
        </div>

        {/* Final Completion Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E6EAF3]">
          <Link
            to="/onboarding/staff"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] px-4 py-2.5 rounded-full hover:bg-[#F1F5F9] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous: Staff Setup</span>
          </Link>

          <button
            type="button"
            id="launch-admin-btn"
            onClick={handleLaunchDashboard}
            disabled={isLaunching}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full text-xs font-bold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            {isLaunching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Launching Admin Workspace...</span>
              </>
            ) : (
              <>
                <LayoutDashboard className="w-4 h-4" />
                <span>Complete Onboarding &amp; Launch Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
