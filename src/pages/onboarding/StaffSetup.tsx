import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  archiveStaff,
  saveStaffSetupProgress,
  generateEmployeeCode,
  isValidEmail,
} from "../../services/staffService";
import type { School } from "../../types/school";
import {
  type StaffMember,
  type StaffRole,
  type StaffInput,
  STAFF_ROLE_DEFINITIONS,
} from "../../types/staff";
import {
  Users,
  GraduationCap,
  Calculator,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Info,
  X,
  Check,
} from "lucide-react";

export default function StaffSetup() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Core Data State
  const [school, setSchool] = useState<School | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const [role, setRole] = useState<StaffRole>("teacher");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [designation, setDesignation] = useState<string>("");
  const [employeeCode, setEmployeeCode] = useState<string>("");
  const [joiningDate, setJoiningDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Load School & Staff on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
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

        // Fetch staff list for this school
        const { staff, error: staffErr } = await getStaff(currentSchool.id);
        if (!isMounted) return;

        if (staffErr) {
          setErrorMessage(staffErr);
        } else {
          setStaffList(staff);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setErrorMessage(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Reset Form
  const resetForm = () => {
    setEditingStaffId(null);
    setRole("teacher");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setEmployeeCode("");
    setJoiningDate(new Date().toISOString().split("T")[0]);
    setFormError(null);
    setIsFormOpen(false);
  };

  // Open Add Form with pre-populated code
  const handleOpenAddForm = () => {
    resetForm();
    const nextCode = generateEmployeeCode("teacher", staffList.length);
    setEmployeeCode(nextCode);
    setDesignation(STAFF_ROLE_DEFINITIONS.teacher.commonDesignations[0]);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEditForm = (member: StaffMember) => {
    setEditingStaffId(member.id);
    setRole(member.role);
    setFirstName(member.first_name);
    setLastName(member.last_name || "");
    setEmail(member.email || "");
    setPhone(member.phone || "");
    setDesignation(member.designation || "");
    setEmployeeCode(member.employee_code || "");
    setJoiningDate(
      member.joining_date || new Date().toISOString().split("T")[0]
    );
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle role switch in form
  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    if (!editingStaffId) {
      setEmployeeCode(generateEmployeeCode(newRole, staffList.length));
      setDesignation(STAFF_ROLE_DEFINITIONS[newRole].commonDesignations[0]);
    }
  };

  // Quick Seed Sample Staff
  const handleQuickSeed = async () => {
    if (!school) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const samples: StaffInput[] = [
      {
        first_name: "Anita",
        last_name: "Sharma",
        role: "teacher",
        designation: "Mathematics Teacher",
        employee_code: generateEmployeeCode("teacher", staffList.length),
        email: `anita.${school.subdomain}@myzkool.edu`,
        phone: "+91 98765 43210",
        joining_date: new Date().toISOString().split("T")[0],
        status: "active",
      },
      {
        first_name: "Rajesh",
        last_name: "Verma",
        role: "teacher",
        designation: "Science Teacher",
        employee_code: generateEmployeeCode("teacher", staffList.length + 1),
        email: `rajesh.${school.subdomain}@myzkool.edu`,
        phone: "+91 98765 43211",
        joining_date: new Date().toISOString().split("T")[0],
        status: "active",
      },
      {
        first_name: "Vikram",
        last_name: "Singhania",
        role: "accountant",
        designation: "Head Accountant",
        employee_code: generateEmployeeCode("accountant", staffList.length + 2),
        email: `accounts.${school.subdomain}@myzkool.edu`,
        phone: "+91 98765 43212",
        joining_date: new Date().toISOString().split("T")[0],
        status: "active",
      },
    ];

    try {
      const addedMembers: StaffMember[] = [];
      for (const sample of samples) {
        const res = await createStaff({
          schoolId: school.id,
          input: sample,
          userRole: profile?.role || "school_admin",
        });
        if (res.success && res.staffMember) {
          addedMembers.push(res.staffMember);
        }
      }

      setStaffList((prev) => [...prev, ...addedMembers]);
      setSuccessBanner("Added 3 initial faculty members to your staff directory.");
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch {
      setErrorMessage("Failed to add sample staff members.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form Submit: Create or Update
  const handleSaveStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    setFormError(null);

    if (!firstName.trim()) {
      setFormError("First name is required.");
      return;
    }

    if (email.trim() && !isValidEmail(email.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingStaffId) {
        // Update existing
        const res = await updateStaff({
          schoolId: school.id,
          staffId: editingStaffId,
          input: {
            first_name: firstName.trim(),
            last_name: lastName.trim() || undefined,
            role,
            designation: designation.trim() || undefined,
            employee_code: employeeCode.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            joining_date: joiningDate || undefined,
          },
          userRole: profile?.role || "school_admin",
        });

        if (!res.success || !res.staffMember) {
          setFormError(res.error || "Failed to update staff member.");
          setIsSubmitting(false);
          return;
        }

        setStaffList((prev) =>
          prev.map((s) => (s.id === editingStaffId ? res.staffMember! : s))
        );
        setSuccessBanner(`Updated staff details for ${res.staffMember.first_name}.`);
      } else {
        // Create new
        const res = await createStaff({
          schoolId: school.id,
          input: {
            first_name: firstName.trim(),
            last_name: lastName.trim() || undefined,
            role,
            designation: designation.trim() || undefined,
            employee_code: employeeCode.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            joining_date: joiningDate || undefined,
            status: "active",
          },
          userRole: profile?.role || "school_admin",
        });

        if (!res.success || !res.staffMember) {
          setFormError(res.error || "Failed to add staff member.");
          setIsSubmitting(false);
          return;
        }

        setStaffList((prev) => [...prev, res.staffMember!]);
        setSuccessBanner(`Added ${res.staffMember.first_name} to staff directory.`);
      }

      resetForm();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Archive Staff
  const handleDeleteStaff = async (staffId: string, name: string) => {
    if (!school) return;
    if (!window.confirm(`Are you sure you want to remove ${name} from staff?`)) {
      return;
    }

    try {
      const res = await deleteStaff({
        schoolId: school.id,
        staffId,
        userRole: profile?.role || "school_admin",
      });

      if (res.success) {
        setStaffList((prev) => prev.filter((s) => s.id !== staffId));
        setSuccessBanner(`Removed ${name} from staff directory.`);
        setTimeout(() => setSuccessBanner(null), 3000);
      } else {
        setErrorMessage(res.error || "Failed to remove staff member.");
      }
    } catch {
      setErrorMessage("Failed to remove staff member.");
    }
  };

  // Advance to Step 8 (Complete)
  const handleContinue = async () => {
    if (!school || !user) return;
    setIsAdvancing(true);
    setErrorMessage(null);

    try {
      const res = await saveStaffSetupProgress({
        schoolId: school.id,
        userId: user.id,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to advance onboarding progress.");
        setIsAdvancing(false);
        return;
      }

      await refreshSession();
      navigate("/onboarding/complete");
    } catch {
      setErrorMessage("Failed to save progress. Please try again.");
      setIsAdvancing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#2158E0] mb-3" />
        <p className="text-xs text-[#5B6478] font-medium">
          Loading staff directory setup...
        </p>
      </div>
    );
  }

  // Prerequisite check failure
  if (!school) {
    return (
      <OnboardingLayout
        currentStepNumber={7}
        completedStepNumbers={[1, 2, 3, 4, 5, 6]}
        title="Set Up Your Staff"
        subtitle="Initialize your school's faculty and administrative directory."
      >
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#141A2E] mb-1">
            School Profile Incomplete
          </h2>
          <p className="text-xs text-[#5B6478] mb-5">
            {errorMessage || "Please complete Step 1: School Profile before setting up staff."}
          </p>
          <Link
            to="/onboarding/school"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors"
          >
            <span>Go to School Profile</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  const teacherCount = staffList.filter((s) => s.role === "teacher" && s.status !== "archived").length;
  const accountantCount = staffList.filter((s) => s.role === "accountant" && s.status !== "archived").length;

  return (
    <OnboardingLayout
      currentStepNumber={7}
      completedStepNumbers={[1, 2, 3, 4, 5, 6]}
      title="Set Up Your Staff"
      subtitle="Initialize your school's faculty and administrative directory. Add key staff now or complete full roster management in the admin dashboard."
    >
      <div className="space-y-6">
        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              <p className="font-semibold">Unable to proceed</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Global Success Banner */}
        {successBanner && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800">
              <p className="font-semibold">{successBanner}</p>
            </div>
          </div>
        )}

        {/* Helpful Info Card: Onboarding Friendly Notice */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#2158E0] shrink-0 mt-0.5" />
          <div className="text-xs text-[#141A2E] leading-relaxed">
            <p className="font-semibold text-[#2158E0]">
              Staff Setup is flexible during onboarding
            </p>
            <p className="text-[#5B6478] mt-0.5">
              You can add your founding teachers and finance team now, or proceed to completion and manage your complete faculty directory with bulk invitations in the Admin Dashboard anytime.
            </p>
          </div>
        </div>

        {/* Staff Metrics & Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#E6EAF3]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2158E0] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#141A2E] block">
                  {staffList.length} Total Staff Configured
                </span>
                <span className="text-[11px] text-[#5B6478]">
                  {teacherCount} Teachers · {accountantCount} Accountants
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {staffList.length === 0 && (
              <button
                type="button"
                id="quick-seed-staff-btn"
                onClick={handleQuickSeed}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#2158E0] bg-white border border-[#E6EAF3] hover:bg-blue-50/50 hover:border-blue-200 transition-colors cursor-pointer"
                title="Add 2 Teachers and 1 Accountant automatically"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2158E0]" />
                <span>Add Sample Faculty</span>
              </button>
            )}

            {!isFormOpen && (
              <button
                type="button"
                id="open-add-staff-btn"
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors cursor-pointer ml-auto sm:ml-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Staff Add / Edit Modal Form */}
        {isFormOpen && (
          <div className="p-5 rounded-2xl bg-white border-2 border-[#2158E0]/30 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#2158E0] flex items-center justify-center">
                  {role === "accountant" ? (
                    <Calculator className="w-4 h-4" />
                  ) : (
                    <GraduationCap className="w-4 h-4" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#141A2E]">
                  {editingStaffId ? "Edit Staff Member" : "Add New Staff Member"}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#141A2E] hover:bg-[#F1F5F9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaffMember} className="space-y-4">
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                  Staff Role <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("teacher")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      role === "teacher"
                        ? "border-[#2158E0] bg-blue-50/40 ring-2 ring-[#2158E0]/15"
                        : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        role === "teacher"
                          ? "bg-[#2158E0] text-white"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#141A2E]">
                        Teacher / Faculty
                      </div>
                      <div className="text-[11px] text-[#5B6478] mt-0.5">
                        Class instruction &amp; grading
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange("accountant")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      role === "accountant"
                        ? "border-[#2158E0] bg-blue-50/40 ring-2 ring-[#2158E0]/15"
                        : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        role === "accountant"
                          ? "bg-[#2158E0] text-white"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#141A2E]">
                        Accountant / Finance
                      </div>
                      <div className="text-[11px] text-[#5B6478] mt-0.5">
                        Fee billing &amp; vouchers
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="staff-first-name"
                    className="block text-xs font-semibold text-[#141A2E] mb-1"
                  >
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="staff-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label
                    htmlFor="staff-last-name"
                    className="block text-xs font-semibold text-[#141A2E] mb-1"
                  >
                    Last Name
                  </label>
                  <input
                    id="staff-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Designation & Common Suggestions */}
              <div>
                <label
                  htmlFor="staff-designation"
                  className="block text-xs font-semibold text-[#141A2E] mb-1"
                >
                  Designation / Title
                </label>
                <input
                  id="staff-designation"
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder={
                    role === "teacher"
                      ? "e.g. Mathematics Teacher"
                      : "e.g. Head Accountant"
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                />
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] text-[#5B6478]">Suggestions:</span>
                  {STAFF_ROLE_DEFINITIONS[role].commonDesignations
                    .slice(0, 4)
                    .map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setDesignation(sug)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                </div>
              </div>

              {/* Employee Code & Joining Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="staff-employee-code"
                      className="block text-xs font-semibold text-[#141A2E]"
                    >
                      Employee Code
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEmployeeCode(
                          generateEmployeeCode(role, staffList.length)
                        )
                      }
                      className="text-[10px] text-[#2158E0] hover:underline"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    id="staff-employee-code"
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="e.g. TCH-001"
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs font-mono text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label
                    htmlFor="staff-joining-date"
                    className="block text-xs font-semibold text-[#141A2E] mb-1"
                  >
                    Joining Date
                  </label>
                  <input
                    id="staff-joining-date"
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs text-[#141A2E] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="staff-email"
                    className="block text-xs font-semibold text-[#141A2E] mb-1"
                  >
                    Official Email
                  </label>
                  <input
                    id="staff-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`e.g. faculty@${school.subdomain}.edu`}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label
                    htmlFor="staff-phone"
                    className="block text-xs font-semibold text-[#141A2E] mb-1"
                  >
                    Contact Phone
                  </label>
                  <input
                    id="staff-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg border border-[#E6EAF3] text-xs text-[#141A2E] placeholder-[#94A3B8] focus:border-[#2158E0] focus:ring-2 focus:ring-[#2158E0]/15 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-medium text-[#5B6478] hover:text-[#141A2E] rounded-lg hover:bg-[#F1F5F9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-staff-member-btn"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] rounded-lg transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingStaffId ? "Save Changes" : "Add to Roster"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff Roster List */}
        {staffList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC]">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#141A2E] mb-1">
              No Staff Members Added Yet
            </h3>
            <p className="text-xs text-[#5B6478] max-w-md mx-auto mb-4">
              Add your principal teachers and accounting staff now, or click Continue to complete onboarding and manage your staff later.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Staff Member</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {staffList.map((member) => {
                const isTeacher = member.role === "teacher";
                return (
                  <div
                    key={member.id}
                    id={`staff-card-${member.id}`}
                    className="p-4 rounded-xl bg-white border border-[#E6EAF3] hover:border-[#CBD5E1] transition-all flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isTeacher
                              ? "bg-blue-50 text-[#2158E0]"
                              : "bg-emerald-50 text-[#10B981]"
                          }`}
                        >
                          {isTeacher ? (
                            <GraduationCap className="w-5 h-5" />
                          ) : (
                            <Calculator className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-[#141A2E]">
                              {member.first_name} {member.last_name || ""}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isTeacher
                                  ? "bg-blue-50 text-[#2158E0] border border-blue-200"
                                  : "bg-emerald-50 text-[#10B981] border border-emerald-200"
                              }`}
                            >
                              {isTeacher ? "Teacher" : "Accountant"}
                            </span>
                            {member.employee_code && (
                              <span className="font-mono text-[10px] bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#475569]">
                                {member.employee_code}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#5B6478] mt-0.5">
                            {member.designation || (isTeacher ? "Teacher" : "Accountant")}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(member)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#2158E0] hover:bg-blue-50 transition-colors"
                          title="Edit staff details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteStaff(
                              member.id,
                              `${member.first_name} ${member.last_name || ""}`
                            )
                          }
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove staff member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Details Footer */}
                    <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#5B6478] flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {member.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#94A3B8]" />
                            <span className="truncate max-w-[150px]">{member.email}</span>
                          </span>
                        )}
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#94A3B8]" />
                            <span>{member.phone}</span>
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#E6EAF3]">
          <Link
            to="/onboarding/website"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] px-4 py-2.5 rounded-full hover:bg-[#F1F5F9] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous: Website Setup</span>
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {staffList.length === 0 ? (
              <button
                type="button"
                id="skip-staff-btn"
                onClick={handleContinue}
                disabled={isAdvancing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isAdvancing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Skip &amp; Complete Onboarding</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                id="continue-to-complete-btn"
                onClick={handleContinue}
                disabled={isAdvancing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
              >
                {isAdvancing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Progress...</span>
                  </>
                ) : (
                  <>
                    <span>Save &amp; Complete Onboarding</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
