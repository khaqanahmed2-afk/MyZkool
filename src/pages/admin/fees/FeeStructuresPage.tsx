import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Loader2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Users,
  Copy,
  Edit2,
  Archive,
  Check,
  Search,
  Trash2,
  ArrowRight,
  ArrowLeft,
  X,
  MoreVertical,
  Truck,
  Monitor,
  GraduationCap,
  ClipboardList,
  GripVertical,
  Info,
  RotateCcw,
  AlertTriangle,
  Clock,
  Sparkles,
  DollarSign,
  Eye,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Send,
} from "lucide-react";
import {
  getFeeStructures,
  getFeeHeads,
  saveCompleteFeeStructure,
  saveDraftFeeStructure,
  duplicateFeeStructure,
  activateStructure,
  deactivateFeeStructure,
  archiveFeeStructure,
  supersedeFeeStructure,
  checkStructureOverlaps,
  getStructureConfigItems,
  deleteFeeStructure,
  createFeeHead,
  ensureSystemHeads,
  getStructureStudentCounts,
  previewStructureAssignment,
  bulkAssignStructure,
  type StructureAssignmentPreviewResult,
  type BulkAssignResult,
} from "../../../services/feeSetupService";
import { getCurrentAcademicYear, getAcademicYearsForSchool } from "../../../services/academicService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { listStudents } from "../../../services/studentService";
import { listAssignments } from "../../../services/transportAssignmentService";
import { getRoutes } from "../../../services/transportCoreService";
import {
  calculateFeeStructureFinancials,
  calculateAnnualMultiplier,
  generateInstallmentSchedule,
  calculateMidYearAdmissionFee,
  calculateConcessionImpact,
  type ComponentCalculationInput,
  type StudentTransportInfo,
  type GeneratedInstallment,
  type FeeStructureCalculationResult,
  type MidYearProrationResult,
} from "../../../services/feeCalculationService";
import type {
  FeeStructure,
  FeeHead,
  StructureStatus,
  StructureTargetType,
  FeeHeadFrequency,
  FeeCycleFrequency,
  FeeStructureConfigItem,
} from "../../../types/fees";
import type { AcademicYear } from "../../../types/academic";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";
import { useAuth } from "../../../hooks/useAuth";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface DisplayFeeStructure extends FeeStructure {
  classNameDisplay: string;
  sectionDisplay?: string;
  annualFeeTotalRupees: number;
  installmentsDisplay: string;
  studentCount: number;
  transportCount: number;
  studentIds?: string[];
}

interface FeeHeadRow {
  id: string; // Real fee_head_id UUID
  name: string;
  category: "Academic" | "Transport" | "Amenities" | "Administrative" | "Optional";
  frequency: FeeHeadFrequency;
  amountRupees: number | "auto";
  applicableTo: "All Students" | "New Admissions Only" | "Only transport users";
  iconType: "tuition" | "computer" | "annual" | "exam" | "transport" | "other";
  isSystemManaged?: boolean;
}

export default function FeeStructuresPage() {
  const { school: authSchool, schoolId: authSchoolId } = useAuth();
  const activeSchoolId = authSchool?.id || authSchoolId || "";

  // Core Data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const yearIdRef = useRef<string>("");
  const [academicYearWarning, setAcademicYearWarning] = useState<string | null>(null);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [structures, setStructures] = useState<DisplayFeeStructure[]>([]);
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const routesRef = useRef<any[]>([]);

  // Hub UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | StructureStatus>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<"class" | "name" | "amount" | "installments" | "students" | "status">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Assignment & Billing Drawer/Modal state
  const [assignModalStructure, setAssignModalStructure] = useState<DisplayFeeStructure | null>(null);
  const [assignModalPreview, setAssignModalPreview] = useState<StructureAssignmentPreviewResult | null>(null);
  const [loadingAssignPreview, setLoadingAssignPreview] = useState(false);
  const [executingBulkAssign, setExecutingBulkAssign] = useState(false);
  const [assignGenerateDues, setAssignGenerateDues] = useState(true);
  const [assignStudentSearch, setAssignStudentSearch] = useState("");
  const [assignSuccessSummary, setAssignSuccessSummary] = useState<BulkAssignResult | null>(null);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);

  // Step 1: Basic Information
  const [step1Name, setStep1Name] = useState("");
  const step1NameManuallyEditedRef = useRef(false);
  const [step1YearId, setStep1YearId] = useState("");
  const [step1ClassId, setStep1ClassId] = useState("");
  const [step1SectionId, setStep1SectionId] = useState(""); // "" = All Sections
  const [step1EffectiveFrom, setStep1EffectiveFrom] = useState("");
  const [step1EffectiveTo, setStep1EffectiveTo] = useState("");
  const [step1Description, setStep1Description] = useState("");

  // Step 2: Fee Components
  const [feeComponents, setFeeComponents] = useState<FeeHeadRow[]>([]);

  // Step 3: Billing Cycle & Rules
  const [billingCycle, setBillingCycle] = useState<FeeCycleFrequency>("monthly");
  const [enableLateFee, setEnableLateFee] = useState(true);
  const [lateFeeType, setLateFeeType] = useState<"fixed" | "daily" | "percent">("fixed");
  const [lateFeeAmount, setLateFeeAmount] = useState(100);
  const [gracePeriodDays, setGracePeriodDays] = useState(5);

  // Step 4: Preview & Student details
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewCalculation, setPreviewCalculation] = useState<FeeStructureCalculationResult | null>(null);
  const previewStudentsRef = useRef<StudentTransportInfo[]>([]);

  // Step 4 Simulator state (Mid-Year Proration & Concession Impact)
  const [simAdmissionOption, setSimAdmissionOption] = useState<"full" | "term2" | "term3" | "term4">("full");
  const [simConcessionOption, setSimConcessionOption] = useState<"none" | "sibling_25" | "rte_100" | "staff_50">("none");

  // Detail Modal state for inspecting any saved structure
  const [detailModalStructure, setDetailModalStructure] = useState<DisplayFeeStructure | null>(null);
  const [detailModalCalculation, setDetailModalCalculation] = useState<FeeStructureCalculationResult | null>(null);
  const [loadingDetailModal, setLoadingDetailModal] = useState(false);
  const [detailModalTab, setDetailModalTab] = useState<"components" | "installments" | "students" | "simulator">("components");
  const [detailSimDate, setDetailSimDate] = useState("2026-10-01");
  const [detailSimConcessionType, setDetailSimConcessionType] = useState<"percentage" | "flat" | "full_waiver">("percentage");
  const [detailSimConcessionValue, setDetailSimConcessionValue] = useState<number>(25);

  // Modals & sub-dialogs
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [selectedExistingHeadId, setSelectedExistingHeadId] = useState<string>("");
  const [newHeadName, setNewHeadName] = useState("");
  const [newHeadCategory, setNewHeadCategory] = useState<"Academic" | "Amenities" | "Administrative" | "Optional">("Academic");
  const [newHeadFrequency, setNewHeadFrequency] = useState<FeeHeadFrequency>("monthly");
  const [newHeadAmount, setNewHeadAmount] = useState<number>(500);

  const [viewStudentsModalStructure, setViewStudentsModalStructure] = useState<{
    structureName: string;
    className: string;
    sectionName: string;
    students: StudentTransportInfo[];
  } | null>(null);

  const [savingStructure, setSavingStructure] = useState(false);

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // ─── Initial Load: Real Academic Year & Database-backed Data ───────────────────

  const loadInitialData = useCallback(async () => {
    if (!activeSchoolId) return;
    setLoading(true);
    setError(null);
    setAcademicYearWarning(null);

    try {
      // 1. Ensure system heads (Transport Fee, etc.) are present
      await ensureSystemHeads(activeSchoolId);

      // 2. Fetch School's configured Academic Years
      const { academicYears: allAYs } = await getAcademicYearsForSchool(activeSchoolId);
      const { academicYear: currentAY } = await getCurrentAcademicYear(activeSchoolId);

      setAcademicYears(allAYs || []);

      const activeAY = currentAY || (allAYs && allAYs.length > 0 ? allAYs[0] : null);
      if (!activeAY) {
        setAcademicYearWarning(
          "No academic year has been configured for this school. Please configure an academic year in Academic Calendar settings to ensure valid fee structures and billing dates."
        );
      } else {
        setSelectedYear(activeAY);
        yearIdRef.current = activeAY.id;
        setAcademicYearFilter(activeAY.id);
      }

      const effectiveYearId = activeAY?.id || "";

      // 3. Load Real Classes & Sections
      const { classes: loadedClasses } = await getClassesWithSections(activeSchoolId, effectiveYearId);
      setClasses(loadedClasses || []);

      // 4. Load Real Fee Heads
      const { heads: loadedHeads } = await getFeeHeads(activeSchoolId, false);
      setHeads(loadedHeads || []);

      // 5. Load Routes for transport info
      try {
        const loadedRoutes = await getRoutes(activeSchoolId);
        routesRef.current = loadedRoutes || [];
      } catch (e) {
        console.warn("Routes load note:", e);
      }

      // 6. Load Fee Structures for this School and Academic Year
      const { structures: rawStructures } = await getFeeStructures(
        activeSchoolId,
        effectiveYearId || undefined
      );

      // Enrich structures with real class name, section, enrolled student count, and transport count
      const enrichedStructures: DisplayFeeStructure[] = await Promise.all(
        (rawStructures || []).map(async (item) => {
          // Resolve class name
          const matchedClass = (loadedClasses || []).find(
            (c) => c.id === item.class_id || item.class_ids?.includes(c.id)
          );
          const isAllClasses = item.target_type === "all_classes" && !item.class_id && (!item.class_ids || item.class_ids.length === 0);
          const classNameDisplay = matchedClass
            ? matchedClass.name
            : isAllClasses
            ? "All Classes"
            : item.name.split(" ")[0] || "Class";

          // Resolve section display
          let sectionDisplay = "All Sections";
          if (item.section_ids && item.section_ids.length > 0 && matchedClass?.sections) {
            const matchedSecs = matchedClass.sections.filter((s) => item.section_ids?.includes(s.id));
            if (matchedSecs.length > 0) {
              sectionDisplay = matchedSecs.map((s) => s.name).join(", ");
            }
          }

          // Fetch exact enrolled students and transport riders from database
          const { enrolledCount, transportCount, studentIds } = await getStructureStudentCounts(
            activeSchoolId,
            item.academic_year_id || effectiveYearId,
            item
          );

          // Calculate accurate annualized academic fee total from saved config items
          let annualTotal = 0;
          try {
            const { items: configItems } = await getStructureConfigItems(activeSchoolId, item.id);
            for (const ci of configItems) {
              const base = ci.base_amount_rupees || 0;
              const mult = calculateAnnualMultiplier(ci.frequency);
              annualTotal += base * mult;
            }
          } catch {
            annualTotal = 0;
          }

          const frequencyLabel =
            (item.metadata as any)?.billingCycle === "quarterly"
              ? "4 Quarterly"
              : (item.metadata as any)?.billingCycle === "half_yearly"
              ? "2 Half-Yearly"
              : (item.metadata as any)?.billingCycle === "annual"
              ? "1 Annual"
              : "12 Monthly";

          return {
            ...item,
            classNameDisplay,
            sectionDisplay,
            annualFeeTotalRupees: annualTotal,
            installmentsDisplay: frequencyLabel,
            studentCount: enrolledCount,
            transportCount,
            studentIds,
          };
        })
      );

      setStructures(enrichedStructures);
    } catch (err: any) {
      console.error("loadInitialData error:", err);
      setError(err.message || "Failed to load fee structures.");
      setStructures([]);
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ─── Filter & Search Logic ──────────────────────────────────────────────────

  const availableSectionsForFilter = useMemo(() => {
    if (classFilter === "all") {
      const allSecs: SchoolSection[] = [];
      const seen = new Set<string>();
      classes.forEach((c) => {
        (c.sections || []).forEach((s) => {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            allSecs.push(s);
          }
        });
      });
      return allSecs;
    }
    const matched = classes.find((c) => c.id === classFilter);
    return matched?.sections || [];
  }, [classes, classFilter]);

  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.classNameDisplay.toLowerCase().includes(q) ||
        (s.sectionDisplay && s.sectionDisplay.toLowerCase().includes(q));

      // Academic Year Filter
      const matchYear =
        academicYearFilter === "all" || s.academic_year_id === academicYearFilter;

      // Status Filter
      const matchStatus = statusFilter === "all" || s.status === statusFilter;

      // Class Filter
      const matchClass =
        classFilter === "all" ||
        s.class_id === classFilter ||
        (s.class_ids && s.class_ids.includes(classFilter)) ||
        s.classNameDisplay.toLowerCase() === classFilter.toLowerCase();

      // Section Filter
      const matchSection =
        sectionFilter === "all" ||
        (s.section_ids && s.section_ids.includes(sectionFilter)) ||
        (s.sectionDisplay && s.sectionDisplay.toLowerCase().includes(sectionFilter.toLowerCase()));

      return matchSearch && matchYear && matchStatus && matchClass && matchSection;
    });
  }, [structures, searchQuery, academicYearFilter, statusFilter, classFilter, sectionFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, academicYearFilter, statusFilter, classFilter, sectionFilter]);

  // Sorting
  const sortedStructures = useMemo(() => {
    return [...filteredStructures].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "class":
          comparison = a.classNameDisplay.localeCompare(b.classNameDisplay);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "amount":
          comparison = a.annualFeeTotalRupees - b.annualFeeTotalRupees;
          break;
        case "installments":
          comparison = a.installmentsDisplay.localeCompare(b.installmentsDisplay);
          break;
        case "students":
          comparison = a.studentCount - b.studentCount;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredStructures, sortField, sortDirection]);

  function handleSort(field: "class" | "name" | "amount" | "installments" | "students" | "status") {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  // Pagination
  const totalPages = Math.ceil(sortedStructures.length / pageSize) || 1;
  const paginatedStructures = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStructures.slice(start, start + pageSize);
  }, [sortedStructures, currentPage, pageSize]);

  // Summary counts scoped to filtered academic year & active school records
  const yearFilteredStructures = useMemo(() => {
    if (academicYearFilter === "all") return structures;
    return structures.filter((s) => s.academic_year_id === academicYearFilter);
  }, [structures, academicYearFilter]);

  const activeCount = useMemo(() => yearFilteredStructures.filter((s) => s.status === "active").length, [yearFilteredStructures]);
  const draftCount = useMemo(() => yearFilteredStructures.filter((s) => s.status === "draft").length, [yearFilteredStructures]);
  const supersededCount = useMemo(() => yearFilteredStructures.filter((s) => s.status === "superseded").length, [yearFilteredStructures]);
  const archivedCount = useMemo(() => yearFilteredStructures.filter((s) => s.status === "archived").length, [yearFilteredStructures]);
  const classesCoveredCount = useMemo(() => {
    const classSet = new Set(
      yearFilteredStructures
        .filter((s) => s.status === "active" && s.classNameDisplay !== "All Classes")
        .map((s) => s.classNameDisplay)
    );
    return classSet.size;
  }, [yearFilteredStructures]);

  // ─── Selection Handlers ─────────────────────────────────────────────────────

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedIds(filteredStructures.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // ─── Wizard Open & Step Navigation ──────────────────────────────────────────

  function handleOpenCreateWizard() {
    setEditingStructureId(null);
    step1NameManuallyEditedRef.current = false;

    // Default to current academic year
    const targetYear = selectedYear || (academicYears.length > 0 ? academicYears[0] : null);
    const targetYearId = targetYear?.id || yearIdRef.current || "";
    setStep1YearId(targetYearId);

    // Default dates from academic year
    const fromDate = targetYear?.start_date || (targetYear ? `${targetYear.start_year}-04-01` : "");
    const toDate = targetYear?.end_date || (targetYear ? `${targetYear.end_year}-03-31` : "");
    setStep1EffectiveFrom(fromDate);
    setStep1EffectiveTo(toDate);

    // Default to first class if available
    const firstClass = classes.length > 0 ? classes[0] : null;
    const firstClassId = firstClass ? firstClass.id : "";
    setStep1ClassId(firstClassId);
    setStep1SectionId(""); // All Sections
    setStep1Description("");

    // Suggested name
    if (firstClass && targetYear) {
      setStep1Name(`${firstClass.name} Fee ${targetYear.label || `${targetYear.start_year}-${targetYear.end_year}`}`);
    } else {
      setStep1Name("");
    }

    setBillingCycle("monthly");
    setEnableLateFee(true);
    setLateFeeType("fixed");
    setLateFeeAmount(100);
    setGracePeriodDays(5);

    // Build initial fee components from real fee heads
    const initialComponents: FeeHeadRow[] = [];
    const tuitionHead = heads.find((h) => h.code === "tuition_fee" || /tuition/i.test(h.name));
    if (tuitionHead) {
      initialComponents.push({
        id: tuitionHead.id,
        name: tuitionHead.name,
        category: "Academic",
        frequency: "monthly",
        amountRupees: 1500,
        applicableTo: "All Students",
        iconType: "tuition",
      });
    }

    const examHead = heads.find((h) => h.code === "exam_fee" || /exam/i.test(h.name));
    if (examHead) {
      initialComponents.push({
        id: examHead.id,
        name: examHead.name,
        category: "Academic",
        frequency: "half_yearly",
        amountRupees: 500,
        applicableTo: "All Students",
        iconType: "exam",
      });
    }

    const annualHead = heads.find((h) => h.code === "annual_fee" || /annual/i.test(h.name));
    if (annualHead) {
      initialComponents.push({
        id: annualHead.id,
        name: annualHead.name,
        category: "Academic",
        frequency: "yearly",
        amountRupees: 2000,
        applicableTo: "All Students",
        iconType: "annual",
      });
    }

    // Always include system-managed Transport Fee component
    const transportHead = heads.find((h) => h.code === "transport_fee" || /transport/i.test(h.name));
    initialComponents.push({
      id: transportHead ? transportHead.id : "system-transport-fee",
      name: "Transport Fee",
      category: "Transport",
      frequency: "monthly",
      amountRupees: "auto",
      applicableTo: "Only transport users",
      iconType: "transport",
      isSystemManaged: true,
    });

    setFeeComponents(initialComponents);
    setWizardStep(1);
    setIsWizardOpen(true);
  }

  async function handleOpenEditWizard(structure: DisplayFeeStructure) {
    setEditingStructureId(structure.id);
    setStep1Name(structure.name);
    step1NameManuallyEditedRef.current = true;
    setStep1YearId(structure.academic_year_id);

    const targetYear = academicYears.find((y) => y.id === structure.academic_year_id) || selectedYear;
    setStep1EffectiveFrom(targetYear?.start_date || (targetYear ? `${targetYear.start_year}-04-01` : ""));
    setStep1EffectiveTo(targetYear?.end_date || (targetYear ? `${targetYear.end_year}-03-31` : ""));

    const cid = structure.class_id || (structure.class_ids && structure.class_ids[0]) || "";
    setStep1ClassId(cid);

    const sid = structure.section_ids && structure.section_ids.length === 1 ? structure.section_ids[0] : "";
    setStep1SectionId(sid);
    setStep1Description(structure.description || "");

    const cycle = (structure.metadata as any)?.billingCycle || "monthly";
    setBillingCycle(cycle);

    // Load actual persisted components for this structure
    try {
      const { items: configItems } = await getStructureConfigItems(activeSchoolId, structure.id);
      if (configItems && configItems.length > 0) {
        const loadedRows: FeeHeadRow[] = configItems.map((ci) => {
          const matchedHead = heads.find((h) => h.id === ci.fee_head_id);
          const isTransport = matchedHead?.code === "transport_fee" || /transport/i.test(matchedHead?.name || "");
          const name = matchedHead ? matchedHead.name : "Fee Component";

          let iconType: FeeHeadRow["iconType"] = "other";
          if (/tuition/i.test(name)) iconType = "tuition";
          else if (/computer/i.test(name)) iconType = "computer";
          else if (/annual/i.test(name)) iconType = "annual";
          else if (/exam/i.test(name)) iconType = "exam";
          else if (isTransport) iconType = "transport";

          return {
            id: ci.fee_head_id,
            name,
            category: isTransport ? "Transport" : "Academic",
            frequency: ci.frequency,
            amountRupees: isTransport ? "auto" : ci.base_amount_rupees,
            applicableTo: isTransport ? "Only transport users" : "All Students",
            iconType,
            isSystemManaged: isTransport,
          };
        });

        // Ensure Transport Fee is present
        if (!loadedRows.some((r) => r.isSystemManaged || /transport/i.test(r.name))) {
          const transportHead = heads.find((h) => h.code === "transport_fee" || /transport/i.test(h.name));
          loadedRows.push({
            id: transportHead ? transportHead.id : "system-transport-fee",
            name: "Transport Fee",
            category: "Transport",
            frequency: "monthly",
            amountRupees: "auto",
            applicableTo: "Only transport users",
            iconType: "transport",
            isSystemManaged: true,
          });
        }

        setFeeComponents(loadedRows);
      }
    } catch (e) {
      console.warn("Could not load structure items for edit:", e);
    }

    setWizardStep(1);
    setIsWizardOpen(true);
  }

  // Handle Class Change in Wizard Step 1
  function handleClassChange(newClassId: string) {
    setStep1ClassId(newClassId);
    setStep1SectionId(""); // Reset to All Sections

    // Auto-suggest structure name only when creating a new structure and user has not typed a custom name
    if (!editingStructureId && !step1NameManuallyEditedRef.current) {
      const cls = classes.find((c) => c.id === newClassId);
      const ay = academicYears.find((y) => y.id === step1YearId) || selectedYear;
      if (cls && ay) {
        setStep1Name(`${cls.name} Fee ${ay.label || `${ay.start_year}-${ay.end_year}`}`);
      }
    }
  }

  // Handle Academic Year Change in Wizard Step 1
  function handleYearChange(newYearId: string) {
    setStep1YearId(newYearId);
    const ay = academicYears.find((y) => y.id === newYearId);
    if (ay) {
      setStep1EffectiveFrom(ay.start_date || `${ay.start_year}-04-01`);
      setStep1EffectiveTo(ay.end_date || `${ay.end_year}-03-31`);
      if (!editingStructureId && !step1NameManuallyEditedRef.current && step1ClassId) {
        const cls = classes.find((c) => c.id === step1ClassId);
        if (cls) {
          setStep1Name(`${cls.name} Fee ${ay.label || `${ay.start_year}-${ay.end_year}`}`);
        }
      }
    }
  }

  // Next step navigation with validation
  async function handleNextStep() {
    if (wizardStep === 1) {
      if (!step1Name.trim()) {
        alert("Please enter a valid structure name.");
        return;
      }
      if (!step1ClassId) {
        alert("Please select an applicable class.");
        return;
      }
      if (!step1EffectiveFrom || !step1EffectiveTo) {
        alert("Please enter both Effective From and Effective To dates.");
        return;
      }
      if (new Date(step1EffectiveFrom) > new Date(step1EffectiveTo)) {
        alert("Effective From date cannot be after Effective To date.");
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      const validComponents = feeComponents.filter((c) => !c.isSystemManaged && typeof c.amountRupees === "number" && c.amountRupees > 0);
      if (validComponents.length === 0) {
        alert("Please configure at least one fee component with a valid amount.");
        return;
      }
      setWizardStep(3);
    } else if (wizardStep === 3) {
      // Transition to Step 4: Load real students and calculate live preview
      setLoadingPreview(true);
      setWizardStep(4);
      try {
        await loadStep4ReviewData();
      } finally {
        setLoadingPreview(false);
      }
    }
  }

  function handlePrevStep() {
    if (wizardStep > 1) {
      setWizardStep((prev) => (prev - 1) as any);
    }
  }

  // ─── Step 4 Live Data & Transport Calculation ────────────────────────────────

  async function loadStep4ReviewData() {
    const ay = academicYears.find((y) => y.id === step1YearId) || selectedYear;
    if (!ay) return;

    // 1. Fetch real students for the selected class and optional section
    let loadedStudents: any[] = [];
    if (isSupabaseConfigured && step1ClassId) {
      try {
        let q = supabase
          .from("student_enrollments")
          .select(`
            student_id,
            class_id,
            section_id,
            student:students!student_enrollments_student_id_fkey (
              id, first_name, last_name, admission_no, status
            )
          `)
          .eq("school_id", activeSchoolId)
          .eq("class_id", step1ClassId)
          .eq("status", "active");

        if (step1YearId) {
          q = q.eq("academic_year_id", step1YearId);
        }

        if (step1SectionId) {
          q = q.eq("section_id", step1SectionId);
        }

        const { data: enrData } = await q;
        if (enrData && enrData.length > 0) {
          const seen = new Set<string>();
          loadedStudents = [];
          for (const e of enrData) {
            const studentObj: any = Array.isArray(e.student) ? e.student[0] : e.student;
            const sid = studentObj?.id || e.student_id;
            if (sid && !seen.has(sid)) {
              seen.add(sid);
              loadedStudents.push({
                id: sid,
                first_name: studentObj?.first_name || "Student",
                last_name: studentObj?.last_name || "",
                admission_no: studentObj?.admission_no || "-",
                class_id: e.class_id,
                section_id: e.section_id,
              });
            }
          }
        }
      } catch (e) {
        console.warn("Direct student enrollment query note in wizard:", e);
      }
    }

    if (loadedStudents.length === 0) {
      const { response: stuRes } = await listStudents(activeSchoolId, {
        class_id: step1ClassId || undefined,
        section_id: step1SectionId || undefined,
        status: "enrolled",
        limit: 200,
      });
      loadedStudents = stuRes?.data || [];
    }

    // 2. Fetch real active transport assignments for this school & academic year
    let assignments: any[] = [];
    try {
      const { items } = await listAssignments(activeSchoolId);
      assignments = (items || []).filter(
        (a) => a.status === "active" && (!a.academic_year_id || a.academic_year_id === step1YearId)
      );
    } catch (e) {
      console.warn("Transport assignments fetch note:", e);
    }

    // 3. Map students with transport details
    const mappedStudentTransport: StudentTransportInfo[] = loadedStudents.map((st) => {
      const assignment = assignments.find((a) => a.student_id === st.id);
      const has_transport = !!assignment && assignment.status === "active";
      const monthly_fee_paise = has_transport ? Number(assignment.monthly_fee_paise || 0) : 0;

      // Find route name if available
      const matchedRoute = routesRef.current.find((r) => r.id === assignment?.route_id);

      return {
        student_id: st.id,
        first_name: st.first_name,
        last_name: st.last_name,
        admission_no: st.admission_no || "-",
        class_id: st.class_id,
        section_id: st.section_id,
        has_transport,
        assignment_id: assignment?.id || null,
        route_id: assignment?.route_id || null,
        route_name: matchedRoute?.name || assignment?.route_id ? `Route ${assignment.route_id.slice(0, 4)}` : undefined,
        stop_id: assignment?.pickup_stop_id || assignment?.drop_stop_id || null,
        stop_name: undefined,
        monthly_fee_paise,
        status: assignment?.status || "inactive",
      };
    });

    previewStudentsRef.current = mappedStudentTransport;

    // 4. Run centralized calculation engine
    const compInputs: ComponentCalculationInput[] = feeComponents.map((c) => ({
      fee_head_id: c.id,
      name: c.name,
      frequency: c.frequency,
      amount_rupees: typeof c.amountRupees === "number" ? c.amountRupees : 0,
      is_mandatory: true,
      is_system_managed: c.isSystemManaged,
      applicable_to: c.applicableTo,
    }));

    const result = calculateFeeStructureFinancials({
      academicYear: ay,
      billingCycle,
      components: compInputs,
      students: mappedStudentTransport,
    });

    setPreviewCalculation(result);
  }

  // ─── Fee Head Component Management (Step 2) ──────────────────────────────────

  function handleRemoveComponent(compId: string) {
    setFeeComponents((prev) => prev.filter((c) => c.id !== compId || c.isSystemManaged));
  }

  function handleUpdateComponentAmount(compId: string, newAmt: number) {
    setFeeComponents((prev) =>
      prev.map((c) => {
        if (c.id === compId && c.amountRupees !== "auto") {
          return { ...c, amountRupees: Math.max(0, newAmt) };
        }
        return c;
      })
    );
  }

  function handleUpdateComponentFrequency(compId: string, newFreq: FeeHeadFrequency) {
    setFeeComponents((prev) =>
      prev.map((c) => {
        if (c.id === compId && !c.isSystemManaged) {
          return { ...c, frequency: newFreq };
        }
        return c;
      })
    );
  }

  // Add existing or newly created fee head to the structure
  async function handleAddFeeHead() {
    if (selectedExistingHeadId) {
      const existingHead = heads.find((h) => h.id === selectedExistingHeadId);
      if (existingHead) {
        if (feeComponents.some((c) => c.id === existingHead.id)) {
          alert("This fee head is already added to the structure.");
          return;
        }

        const newComp: FeeHeadRow = {
          id: existingHead.id,
          name: existingHead.name,
          category: "Academic",
          frequency: newHeadFrequency,
          amountRupees: newHeadAmount,
          applicableTo: "All Students",
          iconType: /tuition/i.test(existingHead.name) ? "tuition" : /exam/i.test(existingHead.name) ? "exam" : /computer/i.test(existingHead.name) ? "computer" : "other",
        };

        // Insert right before transport fee
        setFeeComponents((prev) => {
          const transportIdx = prev.findIndex((c) => c.isSystemManaged);
          if (transportIdx >= 0) {
            const copy = [...prev];
            copy.splice(transportIdx, 0, newComp);
            return copy;
          }
          return [...prev, newComp];
        });

        setIsAddHeadModalOpen(false);
        setSelectedExistingHeadId("");
        setNewHeadName("");
        return;
      }
    }

    if (!newHeadName.trim()) {
      alert("Please enter a name for the new fee head.");
      return;
    }

    try {
      // Create and persist real fee head in the database
      const codeSlug = newHeadName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
      const { head: createdHead, error: headErr } = await createFeeHead(activeSchoolId, {
        name: newHeadName.trim(),
        code: `${codeSlug}_${Date.now().toString().slice(-4)}`,
        kind: newHeadFrequency === "one_time" ? "one_time" : "recurring",
        is_refundable: false,
        rte_waivable: false,
      });

      if (headErr || !createdHead) {
        alert(headErr || "Failed to create fee head");
        return;
      }

      setHeads((prev) => [...prev, createdHead]);

      const newComp: FeeHeadRow = {
        id: createdHead.id,
        name: createdHead.name,
        category: newHeadCategory,
        frequency: newHeadFrequency,
        amountRupees: newHeadAmount,
        applicableTo: "All Students",
        iconType: "other",
      };

      setFeeComponents((prev) => {
        const transportIdx = prev.findIndex((c) => c.isSystemManaged);
        if (transportIdx >= 0) {
          const copy = [...prev];
          copy.splice(transportIdx, 0, newComp);
          return copy;
        }
        return [...prev, newComp];
      });

      setIsAddHeadModalOpen(false);
      setNewHeadName("");
      setSelectedExistingHeadId("");
    } catch (e: any) {
      alert(`Error creating fee head: ${e.message}`);
    }
  }

  // ─── Step 4: Save Structure (Draft vs Publish) ───────────────────────────────

  async function handleSaveStructure(asActive: boolean) {
    setSavingStructure(true);
    setError(null);
    try {
      if (!step1Name.trim()) {
        alert("Please enter a valid structure name.");
        setSavingStructure(false);
        return;
      }
      if (!step1ClassId) {
        alert("Please select an applicable class.");
        setSavingStructure(false);
        return;
      }

      const targetType: StructureTargetType = step1SectionId ? "specific_sections" : "specific_classes";
      const sectionIds = step1SectionId ? [step1SectionId] : [];

      // If publishing, check overlaps for conflicts
      if (asActive) {
        const { hasConflict, conflicts } = await checkStructureOverlaps(
          activeSchoolId,
          step1YearId,
          targetType,
          step1SectionId ? [step1SectionId] : [step1ClassId],
          editingStructureId || undefined
        );

        if (hasConflict && conflicts.length > 0) {
          const conflictNames = conflicts.map((c) => c.structureName).join(", ");
          if (!confirm(`Warning: An active fee structure already exists for this scope (${conflictNames}). Publishing will activate this structure and supersede the previous one. Proceed?`)) {
            setSavingStructure(false);
            return;
          }
        }
      }

      const itemsToSave: FeeStructureConfigItem[] = feeComponents
        .filter((c) => !c.isSystemManaged && typeof c.amountRupees === "number" && c.amountRupees > 0)
        .map((c) => ({
          fee_head_id: c.id,
          frequency: c.frequency,
          base_amount_rupees: c.amountRupees as number,
          is_mandatory: true,
          proration_rule: "full",
          start_date: step1EffectiveFrom,
          end_date: step1EffectiveTo,
          term_amounts: {},
        }));

      const savePayload = {
        id: editingStructureId || undefined,
        name: step1Name.trim(),
        academic_year_id: step1YearId,
        status: asActive ? ("active" as const) : ("draft" as const),
        target_type: targetType,
        class_id: step1ClassId,
        class_ids: [step1ClassId],
        section_ids: sectionIds,
        description: step1Description,
        items: itemsToSave,
        metadata: {
          billingCycle,
          enableLateFee,
          lateFeeType,
          lateFeeAmount,
          gracePeriodDays,
        },
      };

      const { structure: savedStruct, error: saveErr } = asActive
        ? await saveCompleteFeeStructure(activeSchoolId, savePayload)
        : await saveDraftFeeStructure(activeSchoolId, savePayload);

      if (saveErr || !savedStruct) {
        throw new Error(saveErr || "Failed to save fee structure");
      }

      setIsWizardOpen(false);
      await loadInitialData();

      if (asActive) {
        setSuccessBanner(`Fee structure "${step1Name.trim()}" published successfully.`);
        // Offer immediate assignment preview
        const enriched = structures.find((s) => s.id === savedStruct.id) || {
          ...savedStruct,
          classNameDisplay: classes.find((c) => c.id === step1ClassId)?.name || "Class",
          sectionDisplay: step1SectionId ? "Section" : "All Sections",
          annualFeeTotalRupees: previewCalculation?.class_base_annual_fee_rupees || 0,
          installmentsDisplay: billingCycle,
          studentCount: previewCalculation?.total_enrolled_students_count || 0,
          transportCount: previewCalculation?.transport_riders_count || 0,
        };
        handleOpenAssignModal(enriched as DisplayFeeStructure);
      } else {
        setSuccessBanner(`Fee structure "${step1Name.trim()}" saved as draft. No student dues generated.`);
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingStructure(false);
    }
  }

  // ─── Student Assignment & Billing Workflow ────────────────────────────────────

  async function handleOpenAssignModal(structure: DisplayFeeStructure) {
    setAssignModalStructure(structure);
    setLoadingAssignPreview(true);
    setAssignSuccessSummary(null);
    setAssignStudentSearch("");
    try {
      const res = await previewStructureAssignment(activeSchoolId, structure.id);
      setAssignModalPreview(res);
    } catch (err: any) {
      alert(`Could not preview assignment: ${err.message}`);
    } finally {
      setLoadingAssignPreview(false);
    }
  }

  async function handleExecuteBulkAssign() {
    if (!assignModalStructure) return;
    setExecutingBulkAssign(true);
    try {
      const res = await bulkAssignStructure(
        activeSchoolId,
        assignModalStructure.id,
        assignGenerateDues,
        authSchool?.id
      );
      if (!res.success) {
        throw new Error(res.error || "Failed to assign structure");
      }
      setAssignSuccessSummary(res);
      setSuccessBanner(
        `Assignment completed: ${res.assigned_count} student(s) assigned, ${res.created_dues_count} installment dues generated (${res.already_assigned_count || 0} already assigned).`
      );
      await loadInitialData();
    } catch (err: any) {
      alert(`Bulk assignment error: ${err.message}`);
    } finally {
      setExecutingBulkAssign(false);
    }
  }

  // ─── Row Level Actions ───────────────────────────────────────────────────────

  async function handleDuplicate(structure: DisplayFeeStructure) {
    try {
      const { structure: cloned, error: dupErr } = await duplicateFeeStructure(
        activeSchoolId,
        structure.id,
        `${structure.name} (Copy)`
      );
      if (dupErr) throw new Error(dupErr);
      setSuccessBanner(`Fee structure duplicated as "${cloned?.name}".`);
      await loadInitialData();
    } catch (err: any) {
      alert(`Duplicate failed: ${err.message}`);
    }
  }

  async function handleArchive(structure: DisplayFeeStructure) {
    if (confirm(`Archive fee structure "${structure.name}"? Active dues and historic invoices will remain safely intact.`)) {
      try {
        const { error: archErr } = await archiveFeeStructure(activeSchoolId, structure.id);
        if (archErr) throw new Error(archErr);
        setSuccessBanner(`Structure "${structure.name}" archived.`);
        await loadInitialData();
      } catch (err: any) {
        alert(`Archive failed: ${err.message}`);
      }
    }
  }

  async function handleToggleStatus(structure: DisplayFeeStructure) {
    try {
      if (structure.status === "active") {
        await deactivateFeeStructure(activeSchoolId, structure.id);
        setSuccessBanner(`Structure "${structure.name}" marked as draft.`);
      } else {
        await activateStructure(activeSchoolId, structure.id);
        setSuccessBanner(`Structure "${structure.name}" activated and assigned to eligible students.`);
      }
      await loadInitialData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  }

  async function handleDelete(structureId: string, structureName: string) {
    if (!confirm(`Delete fee structure "${structureName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteError(null);
    try {
      const res = await deleteFeeStructure(activeSchoolId, structureId);
      if (!res.success) {
        setDeleteError(res.error || "Cannot delete structure.");
        return;
      }

      setSuccessBanner(`Fee structure "${structureName}" deleted.`);
      setSelectedIds((prev) => prev.filter((id) => id !== structureId));
      await loadInitialData();
    } catch (err: any) {
      setDeleteError(err.message || "Deletion failed.");
    }
  }

  // View students enrolled in a structure's class
  async function handleOpenStudentsModal(structure: DisplayFeeStructure) {
    try {
      const targetClassId = structure.class_id || (structure.class_ids && structure.class_ids[0]);
      let loadedStudents: any[] = [];

      if (isSupabaseConfigured && targetClassId) {
        try {
          let q = supabase
            .from("student_enrollments")
            .select(`
              student_id,
              class_id,
              section_id,
              student:students!student_enrollments_student_id_fkey (
                id, first_name, last_name, admission_no, status
              )
            `)
            .eq("school_id", activeSchoolId)
            .eq("class_id", targetClassId)
            .eq("status", "active");

          if (structure.section_ids && structure.section_ids.length > 0) {
            q = q.in("section_id", structure.section_ids);
          }

          const { data: enrData } = await q;
          if (enrData && enrData.length > 0) {
            loadedStudents = enrData.map((e: any) => ({
              id: e.student?.id || e.student_id,
              first_name: e.student?.first_name || "Student",
              last_name: e.student?.last_name || "",
              admission_no: e.student?.admission_no || "-",
              class_id: e.class_id,
              section_id: e.section_id,
            }));
          }
        } catch (e) {
          console.warn("Direct student enrollment query note:", e);
        }
      }

      if (loadedStudents.length === 0) {
        const { response: stuRes } = await listStudents(activeSchoolId, {
          class_id: targetClassId || undefined,
          section_id: structure.section_ids && structure.section_ids.length === 1 ? structure.section_ids[0] : undefined,
          status: "enrolled",
          limit: 200,
        });
        loadedStudents = stuRes?.data || [];
      }

      const { items } = await listAssignments(activeSchoolId);
      const activeAssignments = (items || []).filter((a) => a.status === "active");

      const mappedStudents: StudentTransportInfo[] = loadedStudents.map((st) => {
        const assignment = activeAssignments.find((a) => a.student_id === st.id);
        const has_transport = !!assignment;
        const monthly_fee_paise = has_transport ? Number(assignment.monthly_fee_paise || 0) : 0;
        const matchedRoute = routesRef.current.find((r) => r.id === assignment?.route_id);

        return {
          student_id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          admission_no: st.admission_no || "-",
          class_id: st.class_id,
          section_id: st.section_id,
          has_transport,
          route_name: matchedRoute?.name || (assignment?.route_id ? `Route ${assignment.route_id.slice(0, 4)}` : undefined),
          monthly_fee_paise,
          status: assignment?.status || "inactive",
        };
      });

      setViewStudentsModalStructure({
        structureName: structure.name,
        className: structure.classNameDisplay,
        sectionName: structure.sectionDisplay || "All Sections",
        students: mappedStudents,
      });
    } catch (err: any) {
      alert(`Could not load enrolled students: ${err.message}`);
    }
  }

  // Open rich structure detail modal with live financial calculations, components & installment breakdown
  async function handleOpenDetailModal(structure: DisplayFeeStructure) {
    setDetailModalStructure(structure);
    setLoadingDetailModal(true);
    setDetailModalTab("components");
    try {
      const ay = academicYears.find((y) => y.id === structure.academic_year_id) || selectedYear;
      if (!ay) return;

      const { items: configItems } = await getStructureConfigItems(activeSchoolId, structure.id);

      const targetClassId = structure.class_id || (structure.class_ids && structure.class_ids[0]);
      let loadedStudents: any[] = [];

      if (isSupabaseConfigured && targetClassId) {
        try {
          let q = supabase
            .from("student_enrollments")
            .select(`
              student_id,
              class_id,
              section_id,
              student:students!student_enrollments_student_id_fkey (
                id, first_name, last_name, admission_no, status
              )
            `)
            .eq("school_id", activeSchoolId)
            .eq("class_id", targetClassId)
            .eq("academic_year_id", structure.academic_year_id || ay.id)
            .eq("status", "active");

          if (structure.section_ids && structure.section_ids.length > 0) {
            q = q.in("section_id", structure.section_ids);
          }

          const { data: enrData } = await q;
          if (enrData && enrData.length > 0) {
            const seen = new Set<string>();
            loadedStudents = [];
            for (const e of enrData) {
              const studentObj: any = Array.isArray(e.student) ? e.student[0] : e.student;
              const sid = studentObj?.id || e.student_id;
              if (sid && !seen.has(sid)) {
                seen.add(sid);
                loadedStudents.push({
                  id: sid,
                  first_name: studentObj?.first_name || "Student",
                  last_name: studentObj?.last_name || "",
                  admission_no: studentObj?.admission_no || "-",
                  class_id: e.class_id,
                  section_id: e.section_id,
                });
              }
            }
          }
        } catch (e) {
          console.warn("Detail modal student query note:", e);
        }
      }

      if (loadedStudents.length === 0) {
        const { response: stuRes } = await listStudents(activeSchoolId, {
          class_id: targetClassId || undefined,
          section_id: structure.section_ids && structure.section_ids.length === 1 ? structure.section_ids[0] : undefined,
          status: "enrolled",
          limit: 200,
        });
        loadedStudents = stuRes?.data || [];
      }

      let assignments: any[] = [];
      try {
        const { items } = await listAssignments(activeSchoolId);
        assignments = (items || []).filter(
          (a) => a.status === "active" && (!a.academic_year_id || a.academic_year_id === (structure.academic_year_id || ay.id))
        );
      } catch (e) {
        console.warn("Transport assignments load note:", e);
      }

      const mappedStudents: StudentTransportInfo[] = loadedStudents.map((st) => {
        const assignment = assignments.find((a) => a.student_id === st.id);
        const has_transport = !!assignment && assignment.status === "active";
        const monthly_fee_paise = has_transport ? Number(assignment.monthly_fee_paise || 0) : 0;
        const matchedRoute = routesRef.current.find((r) => r.id === assignment?.route_id);

        return {
          student_id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          admission_no: st.admission_no || "-",
          class_id: st.class_id,
          section_id: st.section_id,
          has_transport,
          assignment_id: assignment?.id || null,
          route_id: assignment?.route_id || null,
          route_name: matchedRoute?.name || (assignment?.route_id ? `Route ${assignment.route_id.slice(0, 4)}` : undefined),
          monthly_fee_paise,
          status: assignment?.status || "inactive",
        };
      });

      const compInputs: ComponentCalculationInput[] = (configItems || []).map((ci) => {
        const matchedHead = heads.find((h) => h.id === ci.fee_head_id);
        return {
          fee_head_id: ci.fee_head_id,
          name: matchedHead ? matchedHead.name : "Fee Component",
          frequency: ci.frequency,
          amount_rupees: ci.base_amount_rupees || 0,
          is_mandatory: ci.is_mandatory ?? true,
        };
      });

      const cycle = (structure.metadata as any)?.billingCycle || "quarterly";
      const calcResult = calculateFeeStructureFinancials({
        academicYear: ay,
        billingCycle: cycle,
        components: compInputs,
        students: mappedStudents,
      });

      setDetailModalCalculation(calcResult);
    } catch (err: any) {
      alert(`Could not load structure details: ${err.message}`);
    } finally {
      setLoadingDetailModal(false);
    }
  }

  // ─── Format Currency Helper ──────────────────────────────────────────────────

  function fmtRupees(amt: number): string {
    return "₹" + amt.toLocaleString("en-IN");
  }

  // ─── Icon Selector Helper ────────────────────────────────────────────────────

  function renderFeeHeadIcon(iconType: string) {
    switch (iconType) {
      case "tuition":
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
        );
      case "computer":
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4" />
          </div>
        );
      case "annual":
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case "exam":
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4" />
          </div>
        );
      case "transport":
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        );
    }
  }

  // Selected class in wizard for Section filtering
  const wizardSelectedClass = useMemo(() => {
    return classes.find((c) => c.id === step1ClassId) || null;
  }, [classes, step1ClassId]);

  // Selected academic year in wizard
  const wizardActiveYear = useMemo(() => {
    return (
      academicYears.find((y) => y.id === step1YearId) ||
      selectedYear ||
      (academicYears.length > 0 ? academicYears[0] : null)
    );
  }, [academicYears, step1YearId, selectedYear]);

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* ─── 1. Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141A2E] tracking-tight">Fee Structures</h1>
          <p className="text-xs md:text-sm text-[#5B6478] mt-0.5">
            Manage class-wise fees, installments, transport charges, and billing rules.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenCreateWizard}
            disabled={academicYears.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2158E0] hover:bg-[#1b48b8] disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Structure</span>
          </button>
        </div>
      </div>

      {/* Academic Year Warning Banner */}
      {academicYearWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold">Academic Year Required: </span>
            <span>{academicYearWarning}</span>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button aria-label="Close" onClick={() => setSuccessBanner(null)} className="p-1 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete / Operation Error Banner */}
      {deleteError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{deleteError}</span>
          </div>
          <button aria-label="Close" onClick={() => setDeleteError(null)} className="p-1 hover:text-red-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── 2. Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Active Structures */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs flex items-center gap-3.5 hover:border-gray-300 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#141A2E] leading-none">{activeCount}</div>
            <div className="text-xs font-bold text-[#141A2E] mt-1.5">Active</div>
            <div className="text-[11px] text-[#5B6478] mt-0.5 truncate">
              {selectedYear ? `${selectedYear.label || `${selectedYear.start_year}–${selectedYear.end_year}`}` : "Active"}
            </div>
          </div>
        </div>

        {/* Card 2: Draft Structures */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs flex items-center gap-3.5 hover:border-gray-300 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#2158E0] border border-blue-100/60 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#141A2E] leading-none">{draftCount}</div>
            <div className="text-xs font-bold text-[#141A2E] mt-1.5">Draft</div>
            <div className="text-[11px] text-[#5B6478] mt-0.5 truncate">Unpublished</div>
          </div>
        </div>

        {/* Card 3: Superseded Structures */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs flex items-center gap-3.5 hover:border-gray-300 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100/60 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#141A2E] leading-none">{supersededCount}</div>
            <div className="text-xs font-bold text-[#141A2E] mt-1.5">Superseded</div>
            <div className="text-[11px] text-[#5B6478] mt-0.5 truncate">Prior revisions</div>
          </div>
        </div>

        {/* Card 4: Archived Structures */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs flex items-center gap-3.5 hover:border-gray-300 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/60 flex items-center justify-center shrink-0">
            <Archive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#141A2E] leading-none">{archivedCount}</div>
            <div className="text-xs font-bold text-[#141A2E] mt-1.5">Archived</div>
            <div className="text-[11px] text-[#5B6478] mt-0.5 truncate">Inactive audit safe</div>
          </div>
        </div>

        {/* Card 5: Covered Classes */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs flex items-center gap-3.5 hover:border-gray-300 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-[#141A2E] leading-none">{classesCoveredCount}</div>
            <div className="text-xs font-bold text-[#141A2E] mt-1.5">Classes Covered</div>
            <div className="text-[11px] text-[#5B6478] mt-0.5 truncate">of {classes.length} registered</div>
          </div>
        </div>
      </div>

      {/* ─── 3. Filters Bar ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input aria-label="Search fee structures"
            type="text"
            placeholder="Search by class, structure name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Academic Year Filter */}
          <div className="flex flex-col">
            <span className="text-[9px] font-semibold text-[#8A94A6] uppercase tracking-wider pl-1">
              Academic Year
            </span>
            <div className="relative">
              <select aria-label="Select academic year"
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
                className="appearance-none bg-white border border-[#E6EAF3] rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-[#141A2E] outline-none cursor-pointer hover:border-gray-300"
              >
                <option value="all">All Years</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.label || `${ay.start_year} – ${ay.end_year}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col">
            <span className="text-[9px] font-semibold text-[#8A94A6] uppercase tracking-wider pl-1">
              Status
            </span>
            <div className="relative">
              <select aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none bg-white border border-[#E6EAF3] rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-[#141A2E] outline-none cursor-pointer hover:border-gray-300"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="superseded">Superseded</option>
                <option value="archived">Archived</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Class Filter */}
          <div className="flex flex-col">
            <span className="text-[9px] font-semibold text-[#8A94A6] uppercase tracking-wider pl-1">
              Class
            </span>
            <div className="relative">
              <select aria-label="Filter by class"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter("all");
                }}
                className="appearance-none bg-white border border-[#E6EAF3] rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-[#141A2E] outline-none cursor-pointer hover:border-gray-300"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Section Filter */}
          <div className="flex flex-col">
            <span className="text-[9px] font-semibold text-[#8A94A6] uppercase tracking-wider pl-1">
              Section
            </span>
            <div className="relative">
              <select aria-label="Filter by section"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="appearance-none bg-white border border-[#E6EAF3] rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-[#141A2E] outline-none cursor-pointer hover:border-gray-300"
              >
                <option value="all">All Sections</option>
                {availableSectionsForFilter.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex flex-col justify-end pt-3">
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setClassFilter("all");
                setSectionFilter("all");
                if (selectedYear) setAcademicYearFilter(selectedYear.id);
              }}
              className="px-3 py-1.5 border border-[#E6EAF3] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#5B6478] transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4. Fee Structures Table ─────────────────────────────────────────── */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6EAF3] bg-[#F8FAFC] text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10">
                  <input aria-label="Select all"
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredStructures.length > 0 &&
                      selectedIds.length === filteredStructures.length
                    }
                    className="rounded border-[#E6EAF3] text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort("class")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Class / Section</span>
                    {sortField === "class" ? (
                      sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#2158E0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2158E0]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Structure Name</span>
                    {sortField === "name" ? (
                      sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#2158E0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2158E0]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Base Annual Fee</span>
                    {sortField === "amount" ? (
                      sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#2158E0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2158E0]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("installments")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Installments</span>
                    {sortField === "installments" ? (
                      sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#2158E0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2158E0]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("students")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Students & Transport</span>
                    {sortField === "students" ? (
                      sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#2158E0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2158E0]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3.5 px-4 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {sortField === "status" ? (
                      sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#2158E0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2158E0]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EAF3] text-xs font-medium text-[#141A2E]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#5B6478]">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#2158E0]" />
                      <span>Loading fee structures...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedStructures.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto">
                        <Layers className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-[#141A2E]">No fee structures found</p>
                      <p className="text-xs text-[#5B6478]">
                        Create a fee structure to configure class-wise fees and student transport rules.
                      </p>
                      <button
                        onClick={handleOpenCreateWizard}
                        disabled={academicYears.length === 0}
                        className="px-4 py-2 bg-[#2158E0] hover:bg-[#1b48b8] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        Create Structure
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStructures.map((structure) => {
                  const isSelected = selectedIdSet.has(structure.id);
                  return (
                    <tr
                      key={structure.id}
                      onClick={() => handleOpenDetailModal(structure)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenDetailModal(structure);
                        }
                      }}
                      className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer group ${
                        isSelected ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <input aria-label="Select item"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(structure.id)}
                          className="rounded border-[#E6EAF3] text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                        />
                      </td>

                      {/* Class / Section */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
                          {structure.classNameDisplay}
                        </div>
                        <div className="text-[11px] text-[#5B6478]">
                          {structure.sectionDisplay || "All Sections"}
                        </div>
                      </td>

                      {/* Structure Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#141A2E] flex items-center gap-2">
                          <span>{structure.name}</span>
                          {structure.version && structure.version > 1 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              v{structure.version}
                            </span>
                          ) : null}
                        </div>
                        {structure.description && (
                          <div className="text-[11px] text-[#5B6478] truncate max-w-xs">
                            {structure.description}
                          </div>
                        )}
                      </td>

                      {/* Annual Fee (Total) */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#141A2E]">
                        {fmtRupees(structure.annualFeeTotalRupees)}
                      </td>

                      {/* Installments */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#5B6478]">
                        {structure.installmentsDisplay}
                      </td>

                      {/* Students & Transport */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleOpenStudentsModal(structure)}
                            className="text-left text-[#141A2E] hover:text-[#2158E0] hover:underline cursor-pointer font-semibold text-xs flex items-center gap-1.5"
                          >
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            <span>{structure.studentCount} Students</span>
                          </button>
                          <div className="text-[11px] text-[#5B6478] flex items-center gap-1">
                            <Truck className="w-3 h-3 text-amber-600" />
                            <span>{structure.transportCount} Transport Users</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {structure.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : structure.status === "draft" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Draft
                          </span>
                        ) : structure.status === "superseded" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Superseded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right relative" onClick={(e) => e.stopPropagation()}>
                        <button aria-label="Actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === structure.id ? null : structure.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Popover Menu */}
                        {activeMenuId === structure.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-4 mt-1 w-52 bg-white border border-[#E6EAF3] rounded-xl shadow-lg py-1 z-30 text-left text-xs font-medium text-[#141A2E] animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenAssignModal(structure);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-emerald-50/70 flex items-center gap-2 cursor-pointer font-semibold text-emerald-700"
                            >
                              <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Assign & Generate Dues</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenDetailModal(structure);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50/60 flex items-center gap-2 cursor-pointer font-semibold text-[#2158E0]"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#2158E0]" />
                              <span>View Calculation</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenEditWizard(structure);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit Structure</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleDuplicate(structure);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                              <span>Duplicate</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleOpenStudentsModal(structure);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View Students</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleToggleStatus(structure);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                {structure.status === "active" ? "Mark as Draft" : "Mark as Active"}
                              </span>
                            </button>
                            {structure.status !== "archived" && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleArchive(structure);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-amber-700 cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>Archive</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleDelete(structure.id, structure.name);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer border-t border-gray-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E6EAF3] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5B6478]">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-[#141A2E]">
              {sortedStructures.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>
            <span>to</span>
            <span className="font-bold text-[#141A2E]">
              {Math.min(currentPage * pageSize, sortedStructures.length)}
            </span>
            <span>of</span>
            <span className="font-bold text-[#141A2E]">{sortedStructures.length}</span>
            <span>structures</span>

            <span className="mx-2 text-gray-300">|</span>
            <span>Page size:</span>
            <select
              aria-label="Items per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-[#E6EAF3] rounded-lg px-2 py-1 bg-white text-xs text-[#141A2E] outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 border border-[#E6EAF3] rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-[#141A2E]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 border border-[#E6EAF3] rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 5. WIZARD RIGHT-SIDE SLIDE-OVER DRAWER ───────────────────────────── */}
      {isWizardOpen && (
        <>
          {/* Backdrop */}
          <div aria-hidden="true"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setIsWizardOpen(false)}
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl lg:max-w-4xl bg-white shadow-2xl z-50 flex flex-col border-l border-[#E6EAF3] animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#E6EAF3] flex items-center justify-between shrink-0 bg-white">
              <h2 className="text-base font-bold text-[#141A2E]">
                {editingStructureId ? "Edit Fee Structure" : "Create Fee Structure"}
              </h2>
              <button aria-label="Close"
                onClick={() => setIsWizardOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="px-6 py-4 border-b border-[#E6EAF3] bg-white shrink-0">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                {[
                  { num: 1, label: "Basic Information" },
                  { num: 2, label: "Fee Components" },
                  { num: 3, label: "Installments & Rules" },
                  { num: 4, label: "Review & Publish" },
                ].map((s, idx) => {
                  const isActive = wizardStep === s.num;
                  const isDone = wizardStep > s.num;

                  return (
                    <React.Fragment key={s.num}>
                      <button
                        onClick={() => {
                          if (wizardStep > s.num) setWizardStep(s.num as any);
                        }}
                        className={`flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none ${
                          !isDone && !isActive ? "cursor-default" : ""
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            isActive
                              ? "bg-[#2158E0] text-white shadow-sm ring-4 ring-blue-100"
                              : isDone
                              ? "bg-[#2158E0] text-white"
                              : "border border-gray-300 text-gray-400 bg-white"
                          }`}
                        >
                          {s.num}
                        </div>
                        <span
                          className={`text-xs font-semibold whitespace-nowrap transition-colors ${
                            isActive
                              ? "text-[#2158E0]"
                              : isDone
                              ? "text-[#141A2E]"
                              : "text-gray-400"
                          }`}
                        >
                          {s.label}
                        </span>
                      </button>

                      {idx < 3 && (
                        <div
                          className={`flex-1 h-0.5 mx-3 transition-colors ${
                            wizardStep > idx + 1 ? "bg-[#2158E0]" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Drawer Body (Step-Wise Content) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {/* ──────────────── STEP 1: Basic Information ──────────────── */}
              {wizardStep === 1 && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-base font-bold text-[#141A2E]">Basic Information</h3>
                    <p className="text-xs text-[#5B6478] mt-0.5">
                      Set the details and target scope for this fee structure.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Structure Name & Academic Year */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="feestructurespage-structure-name" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                          Structure Name <span className="text-red-500">*</span>
                        </label>
                        <input id="feestructurespage-structure-name"
                          type="text"
                          value={step1Name}
                          onChange={(e) => {
                            setStep1Name(e.target.value);
                            step1NameManuallyEditedRef.current = true;
                          }}
                          placeholder="e.g. Class 6 Academic Fee 2025–26"
                          className="w-full px-3.5 py-2.5 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="feestructurespage-academic-year" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                          Academic Year <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select id="feestructurespage-academic-year" aria-label="Academic Year"
                            value={step1YearId}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="w-full appearance-none px-3.5 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:border-[#2158E0] outline-none cursor-pointer"
                          >
                            {academicYears.map((ay) => (
                              <option key={ay.id} value={ay.id}>
                                {ay.label || `${ay.start_year} – ${ay.end_year}`}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Class & Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="feestructurespage-class" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                          Class <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select id="feestructurespage-class" aria-label="Class"
                            value={step1ClassId}
                            onChange={(e) => handleClassChange(e.target.value)}
                            className="w-full appearance-none px-3.5 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:border-[#2158E0] outline-none cursor-pointer"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="feestructurespage-section-scope" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                          Section Scope
                        </label>
                        <div className="relative">
                          <select id="feestructurespage-section-scope" aria-label="Section Scope"
                            value={step1SectionId}
                            onChange={(e) => setStep1SectionId(e.target.value)}
                            className="w-full appearance-none px-3.5 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:border-[#2158E0] outline-none cursor-pointer"
                          >
                            <option value="">All Sections</option>
                            {wizardSelectedClass?.sections?.map((sec: SchoolSection) => (
                              <option key={sec.id} value={sec.id}>
                                Section {sec.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Effective Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="feestructurespage-effective-from" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                          Effective From <span className="text-red-500">*</span>
                        </label>
                        <input id="feestructurespage-effective-from" aria-label="Effective From"
                          type="date"
                          value={step1EffectiveFrom}
                          onChange={(e) => setStep1EffectiveFrom(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:border-[#2158E0] outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="feestructurespage-effective-to" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                          Effective To <span className="text-red-500">*</span>
                        </label>
                        <input id="feestructurespage-effective-to" aria-label="Effective To"
                          type="date"
                          value={step1EffectiveTo}
                          onChange={(e) => setStep1EffectiveTo(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:border-[#2158E0] outline-none"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="feestructurespage-description-optional" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                        Description (Optional)
                      </label>
                      <textarea id="feestructurespage-description-optional"
                        rows={3}
                        value={step1Description}
                        onChange={(e) => setStep1Description(e.target.value)}
                        placeholder="Add notes or curriculum details for this structure..."
                        className="w-full px-3.5 py-2.5 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:border-[#2158E0] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────────── STEP 2: Fee Components ──────────────── */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#141A2E]">Fee Components</h3>
                      <p className="text-xs text-[#5B6478] mt-0.5">
                        Configure the heads and amounts for this class.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedExistingHeadId("");
                        setNewHeadName("");
                        setIsAddHeadModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#2158E0] hover:bg-[#1b48b8] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Fee Head</span>
                    </button>
                  </div>

                  {/* Components Table */}
                  <div className="border border-[#E6EAF3] rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                          <th className="py-3 px-3 w-8"></th>
                          <th className="py-3 px-4">Fee Head</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Frequency</th>
                          <th className="py-3 px-4">Amount (₹)</th>
                          <th className="py-3 px-4">Applicability</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6EAF3] text-xs font-medium text-[#141A2E]">
                        {feeComponents.map((comp) => (
                          <tr key={comp.id} className="hover:bg-[#F8FAFC]/50">
                            <td className="py-3 px-3 text-gray-300">
                              <GripVertical className="w-4 h-4" />
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                {renderFeeHeadIcon(comp.iconType)}
                                <span className="font-semibold text-[#141A2E]">{comp.name}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-[#5B6478]">
                              {comp.category}
                            </td>

                            <td className="py-3 px-4">
                              {comp.isSystemManaged ? (
                                <span className="capitalize text-[#141A2E]">Monthly</span>
                              ) : (
                                <select aria-label="Select option"
                                  value={comp.frequency}
                                  onChange={(e) =>
                                    handleUpdateComponentFrequency(comp.id, e.target.value as any)
                                  }
                                  className="border border-[#E6EAF3] rounded-lg px-2 py-1 text-xs text-[#141A2E] capitalize outline-none cursor-pointer"
                                >
                                  <option value="monthly">Monthly</option>
                                  <option value="quarterly">Quarterly</option>
                                  <option value="half_yearly">Half-Yearly</option>
                                  <option value="yearly">Yearly</option>
                                  <option value="one_time">One-Time</option>
                                </select>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {comp.amountRupees === "auto" ? (
                                <span className="font-bold text-[#2158E0] bg-blue-50 px-2 py-0.5 rounded-md">
                                  Auto (Per Stop)
                                </span>
                              ) : (
                                <input aria-label="Input value"
                                  type="number"
                                  min={0}
                                  value={comp.amountRupees}
                                  onChange={(e) =>
                                    handleUpdateComponentAmount(
                                      comp.id,
                                      Number.isFinite(e.currentTarget.valueAsNumber)
                                        ? e.currentTarget.valueAsNumber
                                        : 0
                                    )
                                  }
                                  className="w-24 px-2.5 py-1 border border-[#E6EAF3] rounded-lg text-xs font-bold text-[#141A2E] focus:border-[#2158E0] outline-none"
                                />
                              )}
                            </td>

                            <td className="py-3 px-4 text-[#5B6478]">
                              <div className="flex items-center gap-1">
                                <span>{comp.applicableTo}</span>
                                {comp.isSystemManaged && (
                                  <Info className="w-3.5 h-3.5 text-blue-500" title="Only students with valid transport assignment are charged" />
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              {comp.isSystemManaged ? (
                                <span className="text-[11px] text-[#8A94A6] italic">System</span>
                              ) : (
                                <button
                                  onClick={() => handleRemoveComponent(comp.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                  title="Remove component"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Transport Banner */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#141A2E]">Transport Fee (Student-Specific)</span>
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                          Calculated Per Assigned Rider
                        </span>
                      </div>
                      <p className="text-xs text-[#5B6478] leading-relaxed">
                        Transport fees are applied <strong>only</strong> to students who have an active transport assignment.
                        Each rider is charged their stop-specific monthly pricing. Students not enrolled in transport will receive zero transport charges.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────────── STEP 3: Installments & Billing Rules ──── */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-[#141A2E]">
                      Installments & Billing Rules
                    </h3>
                    <p className="text-xs text-[#5B6478] mt-0.5">
                      Installment dates derived from configured academic year:{" "}
                      <strong>
                        {wizardActiveYear?.label || `${wizardActiveYear?.start_year}–${wizardActiveYear?.end_year}`}
                      </strong>
                    </p>
                  </div>

                  {/* Billing Cycle Selector */}
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-[#141A2E]">
                      Billing Cycle
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {(["monthly", "quarterly", "half_yearly", "annual"] as const).map((cycle) => {
                        const isSelected = billingCycle === cycle;
                        const labels: Record<string, string> = {
                          monthly: "Monthly (12 Installments)",
                          quarterly: "Quarterly (4 Terms)",
                          half_yearly: "Half-Yearly (2 Terms)",
                          annual: "Annual (1 Session)",
                        };

                        return (
                          <button
                            key={cycle}
                            type="button"
                            onClick={() => setBillingCycle(cycle)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#2158E0] text-white shadow-xs"
                                : "bg-white border border-[#E6EAF3] text-[#5B6478] hover:border-gray-300"
                            }`}
                          >
                            {labels[cycle]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Derived Installment Schedule Table */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                      <div>
                        <span className="block text-xs font-semibold text-[#141A2E]">
                          Installment Schedule Preview
                        </span>
                        <p className="text-[11px] text-[#5B6478]">
                          {billingCycle === "quarterly" && "4 quarterly installments covering all academic and term fee heads."}
                          {billingCycle === "monthly" && "12 monthly installments with recurring tuition and term additions."}
                          {billingCycle === "half_yearly" && "2 half-yearly terms covering session curriculum and exam fees."}
                          {billingCycle === "annual" && "Single comprehensive annual installment for the full session."}
                        </p>
                      </div>
                      {wizardActiveYear && (
                        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-xs font-bold text-[#2158E0]">
                          <span>Total Scheduled:</span>
                          <span>
                            {fmtRupees(
                              generateInstallmentSchedule(
                                wizardActiveYear,
                                billingCycle,
                                feeComponents.map((c) => ({
                                  fee_head_id: c.id,
                                  name: c.name,
                                  frequency: c.frequency,
                                  amount_rupees: typeof c.amountRupees === "number" ? c.amountRupees : 0,
                                  is_mandatory: true,
                                  is_system_managed: c.isSystemManaged,
                                }))
                              ).reduce((acc, curr) => acc + curr.base_amount_rupees, 0)
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border border-[#E6EAF3] rounded-2xl overflow-hidden bg-white max-h-72 overflow-y-auto shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4 w-16">Inst. #</th>
                            <th className="py-3 px-4">Period</th>
                            <th className="py-3 px-4 whitespace-nowrap">Due Date</th>
                            <th className="py-3 px-4">Components</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap">Base Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6EAF3] text-xs font-medium text-[#141A2E]">
                          {wizardActiveYear &&
                            generateInstallmentSchedule(
                              wizardActiveYear,
                              billingCycle,
                              feeComponents.map((c) => ({
                                fee_head_id: c.id,
                                name: c.name,
                                frequency: c.frequency,
                                amount_rupees: typeof c.amountRupees === "number" ? c.amountRupees : 0,
                                is_mandatory: true,
                                is_system_managed: c.isSystemManaged,
                              }))
                            ).map((inst) => (
                              <tr key={inst.installment_number} className="hover:bg-[#F8FAFC]/50 transition-colors">
                                <td className="py-3 px-4 font-bold text-gray-500">
                                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[11px]">
                                    {inst.installment_number}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-semibold text-[#141A2E]">
                                  <div>{inst.label}</div>
                                  <div className="text-[10px] text-[#5B6478] font-mono mt-0.5">
                                    {inst.period_start} to {inst.period_end}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-[#5B6478] font-medium whitespace-nowrap">
                                  {inst.due_date}
                                </td>
                                <td className="py-3 px-4 text-[#5B6478]">
                                  <div className="flex flex-wrap gap-1">
                                    {inst.included_components.map((cName, cIdx) => (
                                      <span
                                        key={cIdx}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-[#141A2E] border border-gray-200"
                                      >
                                        {cName}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-[#141A2E] whitespace-nowrap text-sm">
                                  {fmtRupees(inst.base_amount_rupees)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Late Fee Rules */}
                  <div className="p-4 border border-[#E6EAF3] rounded-2xl bg-white space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[#141A2E]">
                          Late Fee Rules
                        </span>
                        <p className="text-[11px] text-[#5B6478]">
                          Apply automated penalty rules when invoices exceed grace period.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input aria-label="Select item"
                          type="checkbox"
                          checked={enableLateFee}
                          onChange={(e) => setEnableLateFee(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:bg-[#2158E0]"></div>
                      </label>
                    </div>

                    {enableLateFee && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E6EAF3]">
                        <div>
                          <label htmlFor="feestructurespage-late-fee-type" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                            Late Fee Type
                          </label>
                          <select id="feestructurespage-late-fee-type" aria-label="Late Fee Type"
                            value={lateFeeType}
                            onChange={(e) => setLateFeeType(e.target.value as any)}
                            className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] bg-white outline-none cursor-pointer"
                          >
                            <option value="fixed">Fixed Amount (₹)</option>
                            <option value="daily">Daily Amount (₹/day)</option>
                            <option value="percent">Percentage (%)</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="feestructurespage-late-fee-amount" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                            Late Fee Amount
                          </label>
                          <input id="feestructurespage-late-fee-amount" aria-label="Late Fee Amount"
                            type="number"
                            min={0}
                            value={lateFeeAmount}
                            onChange={(e) =>
                              setLateFeeAmount(
                                Number.isFinite(e.currentTarget.valueAsNumber)
                                  ? e.currentTarget.valueAsNumber
                                  : 0
                              )
                            }
                            className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] outline-none"
                          />
                        </div>

                        <div>
                          <label htmlFor="feestructurespage-grace-period-days" className="block text-xs font-semibold text-[#141A2E] mb-1.5">
                            Grace Period (Days)
                          </label>
                          <input id="feestructurespage-grace-period-days" aria-label="Grace Period (Days)"
                            type="number"
                            min={0}
                            value={gracePeriodDays}
                            onChange={(e) =>
                              setGracePeriodDays(
                                Number.isFinite(e.currentTarget.valueAsNumber)
                                  ? e.currentTarget.valueAsNumber
                                  : 0
                              )
                            }
                            className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──────────────── STEP 4: Review & Publish ──────────────── */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-[#141A2E]">Review & Publish</h3>
                    <p className="text-xs text-[#5B6478] mt-0.5">
                      Verify the financial calculations and student coverage before activating.
                    </p>
                  </div>

                  {loadingPreview ? (
                    <div className="py-16 text-center text-[#5B6478]">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2158E0] mx-auto mb-2" />
                      <span>Calculating real student coverage and transport charges...</span>
                    </div>
                  ) : previewCalculation ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* LEFT COLUMN */}
                      <div className="space-y-5">
                        {/* Structure Summary Card */}
                        <div className="border border-[#E6EAF3] rounded-2xl p-4 bg-white space-y-3">
                          <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-2.5">
                            <span className="text-xs font-bold text-[#141A2E]">Structure Summary</span>
                            <button
                              onClick={() => setWizardStep(1)}
                              className="text-xs font-semibold text-[#2158E0] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#5B6478]">Name</span>
                              <span className="font-semibold text-[#141A2E]">{step1Name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5B6478]">Academic Year</span>
                              <span className="font-semibold text-[#141A2E]">
                                {academicYears.find((y) => y.id === step1YearId)?.label || "Active Year"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5B6478]">Class & Section</span>
                              <span className="font-semibold text-[#141A2E]">
                                {wizardSelectedClass?.name || "Class"} (
                                {step1SectionId
                                  ? wizardSelectedClass?.sections?.find((s) => s.id === step1SectionId)?.name || "Section"
                                  : "All Sections"}
                                )
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5B6478]">Effective Period</span>
                              <span className="font-semibold text-[#141A2E]">
                                {step1EffectiveFrom} – {step1EffectiveTo}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5B6478]">Billing Cycle</span>
                              <span className="font-semibold text-[#141A2E]">
                                {billingCycle === "quarterly"
                                  ? "Quarterly (4 Terms)"
                                  : billingCycle === "monthly"
                                  ? "Monthly (12 Installments)"
                                  : billingCycle === "half_yearly"
                                  ? "Half-Yearly (2 Terms)"
                                  : "Annual (1 Session)"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Calculation Preview (Per Student) Card */}
                        <div className="border border-blue-200/80 rounded-2xl p-4 bg-blue-50/40 space-y-3">
                          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                            <span className="text-xs font-bold text-[#141A2E]">
                              Calculation Preview (Per Student)
                            </span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                              Annualized Model
                            </span>
                          </div>
                          <div className="space-y-2 text-xs">
                            {previewCalculation.one_time_rupees > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#5B6478]">One-Time Admission / Entry Fees</span>
                                <span className="font-semibold text-[#141A2E]">
                                  {fmtRupees(previewCalculation.one_time_rupees)}
                                </span>
                              </div>
                            )}
                            {previewCalculation.yearly_rupees > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#5B6478]">Yearly Academic / Dev Charges</span>
                                <span className="font-semibold text-[#141A2E]">
                                  {fmtRupees(previewCalculation.yearly_rupees)}
                                </span>
                              </div>
                            )}
                            {previewCalculation.monthly_annual_rupees > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#5B6478]">
                                  Monthly Recurring ({previewCalculation.recurring_components_label})
                                </span>
                                <span className="font-semibold text-[#141A2E]">
                                  {fmtRupees(previewCalculation.monthly_annual_rupees)} ({fmtRupees(previewCalculation.monthly_recurring_rupees)}/mo)
                                </span>
                              </div>
                            )}
                            {previewCalculation.quarterly_annual_rupees > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#5B6478]">Quarterly Exam / Term Fees</span>
                                <span className="font-semibold text-[#141A2E]">
                                  {fmtRupees(previewCalculation.quarterly_annual_rupees)} ({fmtRupees(Math.round(previewCalculation.quarterly_annual_rupees / 4))}/qtr)
                                </span>
                              </div>
                            )}
                            {previewCalculation.half_yearly_annual_rupees > 0 && (
                              <div className="flex justify-between">
                                <span className="text-[#5B6478]">Half-Yearly Components</span>
                                <span className="font-semibold text-[#141A2E]">
                                  {fmtRupees(previewCalculation.half_yearly_annual_rupees)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-amber-900 pt-1 border-t border-blue-200/40">
                              <span className="flex items-center gap-1 font-semibold">
                                <Truck className="w-3.5 h-3.5 text-amber-600" /> Transport (Separated):
                              </span>
                              <span className="text-xs font-bold text-amber-800">
                                {previewCalculation.transport_riders_count} riders charged ({previewCalculation.non_transport_students_count} non-riders pay ₹0)
                              </span>
                            </div>

                            <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                              <span className="text-xs font-bold text-[#141A2E]">
                                Base Academic Total (Per Student)
                              </span>
                              <span className="text-base font-bold text-[#2158E0]">
                                {fmtRupees(previewCalculation.base_annual_per_student_rupees)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT COLUMN */}
                      <div className="space-y-5">
                        {/* Fee Components Summary Card */}
                        <div className="border border-[#E6EAF3] rounded-2xl p-4 bg-white space-y-3">
                          <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-2.5">
                            <span className="text-xs font-bold text-[#141A2E]">Configured Fee Heads</span>
                            <button
                              onClick={() => setWizardStep(2)}
                              className="text-xs font-semibold text-[#2158E0] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="divide-y divide-[#E6EAF3]">
                            {feeComponents.map((comp) => (
                              <div
                                key={comp.id}
                                className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0"
                              >
                                <div className="flex items-center gap-2.5">
                                  {renderFeeHeadIcon(comp.iconType)}
                                  <div>
                                    <div className="text-xs font-semibold text-[#141A2E]">
                                      {comp.name}
                                    </div>
                                    <div className="text-[10px] text-[#5B6478] capitalize">
                                      {comp.frequency}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-bold text-[#141A2E]">
                                    {comp.amountRupees === "auto"
                                      ? "Auto per stop"
                                      : fmtRupees(comp.amountRupees as number)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Applicable Students & Transport Breakdown */}
                        <div className="border border-[#E6EAF3] rounded-2xl p-4 bg-white space-y-3">
                          <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-2.5">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-[#2158E0]" />
                              <span className="text-xs font-bold text-[#141A2E]">
                                Student Coverage ({previewCalculation.total_enrolled_students} Enrolled)
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setViewStudentsModalStructure({
                                  structureName: step1Name,
                                  className: wizardSelectedClass?.name || "Class",
                                  sectionName: step1SectionId ? "Specific Section" : "All Sections",
                                  students: previewStudentsRef.current,
                                });
                              }}
                              className="px-3 py-1 border border-[#E6EAF3] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#141A2E] transition-colors cursor-pointer"
                            >
                              View Students List
                            </button>
                          </div>
                          <div className="space-y-1.5 text-xs text-[#5B6478]">
                            <div className="flex justify-between">
                              <span>Non-Transport Students:</span>
                              <span className="font-semibold text-emerald-700">
                                {previewCalculation.non_transport_students_count} (₹0 Transport Fee)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Active Transport Riders:</span>
                              <span className="font-semibold text-amber-700">
                                {previewCalculation.transport_riders_count} (Charged per Stop)
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-gray-100">
                              <span className="font-bold text-[#141A2E]">Estimated Class Total Demand:</span>
                              <span className="font-bold text-[#2158E0]">
                                {fmtRupees(previewCalculation.class_grand_total_annual_rupees)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Drawer Footer with Actions (Sticky) */}
            <div className="px-6 py-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between shrink-0">
              {wizardStep > 1 ? (
                <button
                  onClick={handlePrevStep}
                  className="px-4 py-2 border border-[#E6EAF3] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#141A2E] flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 border border-[#E6EAF3] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#5B6478] cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <div className="flex items-center gap-2">
                {/* Save as Draft option available across wizard */}
                <button
                  type="button"
                  onClick={() => handleSaveStructure(false)}
                  disabled={savingStructure || !step1Name.trim() || !step1ClassId}
                  className="px-4 py-2 border border-[#E6EAF3] hover:bg-amber-50/50 text-amber-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Save as Draft</span>
                </button>

                {wizardStep < 4 ? (
                  <button
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-[#2158E0] hover:bg-[#1b48b8] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSaveStructure(true)}
                    disabled={savingStructure}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingStructure ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Publish Structure</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── ADD FEE HEAD MODAL ──────────────────────────────────────────────── */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E6EAF3] w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3">
              <h3 className="text-sm font-bold text-[#141A2E]">Add Fee Component</h3>
              <button aria-label="Close"
                onClick={() => setIsAddHeadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Select Existing Fee Head */}
              <div>
                <label htmlFor="feestructurespage-choose-existing-fee-head" className="block text-xs font-semibold text-[#141A2E] mb-1">
                  Choose Existing Fee Head
                </label>
                <select id="feestructurespage-choose-existing-fee-head" aria-label="Choose Existing Fee Head"
                  value={selectedExistingHeadId}
                  onChange={(e) => {
                    setSelectedExistingHeadId(e.target.value);
                    if (e.target.value) setNewHeadName("");
                  }}
                  className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] bg-white outline-none cursor-pointer"
                >
                  <option value="">-- Or enter new fee head below --</option>
                  {heads
                    .filter((h) => !h.is_system && !feeComponents.some((c) => c.id === h.id))
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                </select>
              </div>

              {!selectedExistingHeadId && (
                <>
                  <div>
                    <label htmlFor="feestructurespage-new-fee-head-name" className="block text-xs font-semibold text-[#141A2E] mb-1">
                      New Fee Head Name
                    </label>
                    <input id="feestructurespage-new-fee-head-name"
                      type="text"
                      placeholder="e.g. Science Lab Fee, Sports Fee"
                      value={newHeadName}
                      onChange={(e) => setNewHeadName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] outline-none focus:border-[#2158E0]"
                    />
                  </div>

                  <div>
                    <label htmlFor="feestructurespage-category" className="block text-xs font-semibold text-[#141A2E] mb-1">Category</label>
                    <select id="feestructurespage-category" aria-label="Category"
                      value={newHeadCategory}
                      onChange={(e) => setNewHeadCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] bg-white outline-none cursor-pointer"
                    >
                      <option value="Academic">Academic</option>
                      <option value="Amenities">Amenities</option>
                      <option value="Administrative">Administrative</option>
                      <option value="Optional">Optional</option>
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="feestructurespage-frequency" className="block text-xs font-semibold text-[#141A2E] mb-1">
                    Frequency
                  </label>
                  <select id="feestructurespage-frequency" aria-label="Frequency"
                    value={newHeadFrequency}
                    onChange={(e) => setNewHeadFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] bg-white outline-none cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half_yearly">Half-Yearly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="feestructurespage-amount" className="block text-xs font-semibold text-[#141A2E] mb-1">
                    Amount (₹)
                  </label>
                  <input id="feestructurespage-amount" aria-label="Amount (₹)"
                    type="number"
                    min={0}
                    value={newHeadAmount}
                    onChange={(e) =>
                      setNewHeadAmount(
                        Number.isFinite(e.currentTarget.valueAsNumber)
                          ? e.currentTarget.valueAsNumber
                          : 0
                      )
                    }
                    className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6EAF3] flex justify-end gap-2">
              <button
                onClick={() => setIsAddHeadModalOpen(false)}
                className="px-3 py-1.5 border border-[#E6EAF3] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#5B6478] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFeeHead}
                className="px-4 py-1.5 bg-[#2158E0] hover:bg-[#1b48b8] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Add Component
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW REAL ENROLLED STUDENTS MODAL ─────────────────────────────────── */}
      {viewStudentsModalStructure && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E6EAF3] w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E6EAF3] pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#141A2E]">
                  Enrolled Students — {viewStudentsModalStructure.className} (
                  {viewStudentsModalStructure.sectionName})
                </h3>
                <p className="text-xs text-[#5B6478] mt-0.5">
                  Showing {viewStudentsModalStructure.students.length} students enrolled in this scope.
                  Transport charges apply strictly to students with active bus assignments.
                </p>
              </div>
              <button aria-label="Close"
                onClick={() => setViewStudentsModalStructure(null)}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Table */}
            <div className="flex-1 overflow-y-auto border border-[#E6EAF3] rounded-xl">
              {viewStudentsModalStructure.students.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5B6478]">
                  No active students found in this class/section.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Adm No.</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Transport Status</th>
                      <th className="py-2.5 px-3 text-right">Transport Monthly</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EAF3]">
                    {viewStudentsModalStructure.students.map((st) => (
                      <tr key={st.student_id} className="hover:bg-[#F8FAFC]/60">
                        <td className="py-2.5 px-3 font-mono text-gray-500">
                          {st.admission_no}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#141A2E]">
                          {st.first_name} {st.last_name}
                        </td>
                        <td className="py-2.5 px-3">
                          {st.has_transport ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Truck className="w-3 h-3 text-amber-600" />
                              {st.route_name || "Assigned Bus"}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">No Transport (₹0)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#141A2E]">
                          {st.has_transport
                            ? fmtRupees(Math.round(st.monthly_fee_paise / 100))
                            : "₹0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 border-t border-[#E6EAF3] flex justify-end shrink-0">
              <button
                onClick={() => setViewStudentsModalStructure(null)}
                className="px-4 py-2 bg-[#2158E0] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STRUCTURE DETAIL & CALCULATION PREVIEW MODAL ────────────────────── */}
      {detailModalStructure && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E6EAF3] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E6EAF3] bg-[#F8FAFC]/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2158E0] border border-blue-100 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#141A2E]">
                      {detailModalStructure.name}
                    </h2>
                    {detailModalStructure.version && detailModalStructure.version > 1 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        v{detailModalStructure.version}
                      </span>
                    ) : null}
                    {detailModalStructure.status === "active" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : detailModalStructure.status === "draft" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1 h-1 rounded-full bg-amber-500" />
                        Draft
                      </span>
                    ) : detailModalStructure.status === "superseded" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <span className="w-1 h-1 rounded-full bg-purple-500" />
                        Superseded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5B6478] mt-0.5">
                    {detailModalStructure.classNameDisplay} &bull; {detailModalStructure.sectionDisplay || "All Sections"} &bull;{" "}
                    {academicYears.find((y) => y.id === detailModalStructure.academic_year_id)?.label || "Active Academic Year"}
                  </p>
                </div>
              </div>
              <button aria-label="Close"
                onClick={() => setDetailModalStructure(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetailModal ? (
                <div className="py-20 text-center text-[#5B6478]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2158E0] mx-auto mb-3" />
                  <p className="text-xs">Computing live financial calculations and student transport eligibility...</p>
                </div>
              ) : detailModalCalculation ? (
                <>
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Academic Base */}
                    <div className="p-3.5 bg-blue-50/50 border border-blue-200/60 rounded-xl space-y-1">
                      <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                        Academic Base / Student
                      </div>
                      <div className="text-xl font-bold text-[#2158E0]">
                        {fmtRupees(detailModalCalculation.base_annual_per_student_rupees)}
                      </div>
                      <div className="text-[10px] text-[#5B6478]">
                        One-Time: {fmtRupees(detailModalCalculation.one_time_rupees)} | Recurring: {fmtRupees(detailModalCalculation.base_annual_per_student_rupees - detailModalCalculation.one_time_rupees)}
                      </div>
                    </div>

                    {/* Enrolled Students */}
                    <div className="p-3.5 bg-gray-50 border border-[#E6EAF3] rounded-xl space-y-1">
                      <div className="text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                        Class Enrollment
                      </div>
                      <div className="text-xl font-bold text-[#141A2E]">
                        {detailModalCalculation.total_enrolled_students} Students
                      </div>
                      <div className="text-[10px] text-[#5B6478]">
                        Class Academic Demand: {fmtRupees(detailModalCalculation.class_base_annual_rupees)}
                      </div>
                    </div>

                    {/* Transport Riders (Separated) */}
                    <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-1">
                      <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-amber-600" /> Transport (Separated)
                      </div>
                      <div className="text-xl font-bold text-amber-900">
                        {fmtRupees(detailModalCalculation.class_transport_annual_rupees)}
                      </div>
                      <div className="text-[10px] text-amber-700">
                        {detailModalCalculation.transport_riders_count} Riders ({detailModalCalculation.non_transport_students_count} Non-Riders pay ₹0)
                      </div>
                    </div>

                    {/* Class Grand Total */}
                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl space-y-1">
                      <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                        Grand Annual Demand
                      </div>
                      <div className="text-xl font-bold text-emerald-700">
                        {fmtRupees(detailModalCalculation.class_grand_total_annual_rupees)}
                      </div>
                      <div className="text-[10px] text-emerald-600">
                        Academic Demand + Active Transport
                      </div>
                    </div>
                  </div>

                  {/* Tabs Header */}
                  <div className="border-b border-[#E6EAF3] flex items-center gap-2">
                    <button
                      onClick={() => setDetailModalTab("components")}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        detailModalTab === "components"
                          ? "border-[#2158E0] text-[#2158E0]"
                          : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Fee Components ({detailModalCalculation.component_breakdowns.length})</span>
                    </button>
                    <button
                      onClick={() => setDetailModalTab("installments")}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        detailModalTab === "installments"
                          ? "border-[#2158E0] text-[#2158E0]"
                          : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Installments Schedule ({detailModalCalculation.installments.length})</span>
                    </button>
                    <button
                      onClick={() => setDetailModalTab("students")}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        detailModalTab === "students"
                          ? "border-[#2158E0] text-[#2158E0]"
                          : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Student & Transport ({detailModalCalculation.students_summary.length})</span>
                    </button>
                    <button
                      onClick={() => setDetailModalTab("simulator")}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        detailModalTab === "simulator"
                          ? "border-[#2158E0] text-[#2158E0]"
                          : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Policy Simulator</span>
                    </button>
                  </div>

                  {/* TAB 1: FEE COMPONENTS */}
                  {detailModalTab === "components" && (
                    <div className="space-y-3">
                      <div className="border border-[#E6EAF3] rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#F8FAFC] border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase">
                            <tr>
                              <th className="py-2.5 px-3.5">Component</th>
                              <th className="py-2.5 px-3">Frequency</th>
                              <th className="py-2.5 px-3 text-center">Multiplier</th>
                              <th className="py-2.5 px-3 text-right">Base Amount</th>
                              <th className="py-2.5 px-3 text-right">Annual Total / Student</th>
                              <th className="py-2.5 px-3 text-center">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6EAF3]">
                            {detailModalCalculation.component_breakdowns.map((cb) => (
                              <tr key={cb.fee_head_id} className="hover:bg-[#F8FAFC]/50">
                                <td className="py-2.5 px-3.5 font-semibold text-[#141A2E]">
                                  {cb.name}
                                </td>
                                <td className="py-2.5 px-3 text-[#5B6478] capitalize">
                                  {cb.frequency.replace(/_/g, " ")}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-medium text-[#141A2E]">
                                  {cb.annual_multiplier}&times;
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#5B6478]">
                                  {fmtRupees(cb.amount_rupees)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-[#141A2E]">
                                  {fmtRupees(cb.annual_amount_rupees)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {cb.is_one_time ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      One-Time
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                      Recurring
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-[#F8FAFC] border-t border-[#E6EAF3] text-xs font-bold text-[#141A2E]">
                            <tr>
                              <td colSpan={4} className="py-3 px-3.5 text-right">
                                Total Academic Base Fee (Per Student):
                              </td>
                              <td className="py-3 px-3 text-right text-base text-[#2158E0]">
                                {fmtRupees(detailModalCalculation.base_annual_per_student_rupees)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Transport Policy: </span>
                          Transport fees are strictly separated from base academic fees. They are resolved dynamically per stop and billed only to eligible students with active transport assignments.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INSTALLMENTS SCHEDULE */}
                  {detailModalTab === "installments" && (
                    <div className="space-y-3">
                      <div className="border border-[#E6EAF3] rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#F8FAFC] border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase">
                            <tr>
                              <th className="py-2.5 px-3 text-center w-12">#</th>
                              <th className="py-2.5 px-3.5">Installment Period</th>
                              <th className="py-2.5 px-3">Period Window</th>
                              <th className="py-2.5 px-3">Due Date</th>
                              <th className="py-2.5 px-3.5 text-right">Base Amount</th>
                              <th className="py-2.5 px-3">Components Included</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6EAF3]">
                            {detailModalCalculation.installments.map((inst) => (
                              <tr key={inst.installment_number} className="hover:bg-[#F8FAFC]/50">
                                <td className="py-2.5 px-3 text-center font-mono font-semibold text-gray-500">
                                  {inst.installment_number}
                                </td>
                                <td className="py-2.5 px-3.5 font-semibold text-[#141A2E]">
                                  {inst.label}
                                </td>
                                <td className="py-2.5 px-3 text-[11px] font-mono text-[#5B6478]">
                                  {inst.period_start} &rarr; {inst.period_end}
                                </td>
                                <td className="py-2.5 px-3 text-[#5B6478] whitespace-nowrap">
                                  {inst.due_date}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-bold text-[#141A2E]">
                                  {fmtRupees(inst.base_amount_rupees)}
                                </td>
                                <td className="py-2.5 px-3 text-[11px] text-[#5B6478]">
                                  {inst.included_components.join(", ")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-[#F8FAFC] border-t border-[#E6EAF3] text-xs font-bold text-[#141A2E]">
                            <tr>
                              <td colSpan={4} className="py-3 px-3.5 text-right">
                                Sum of Installments:
                              </td>
                              <td className="py-3 px-3.5 text-right text-base text-[#2158E0]">
                                {fmtRupees(
                                  Math.round(
                                    detailModalCalculation.installments.reduce(
                                      (acc, i) => acc + i.base_amount_paise,
                                      0
                                    ) / 100
                                  )
                                )}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STUDENT & TRANSPORT COVERAGE */}
                  {detailModalTab === "students" && (
                    <div className="space-y-3">
                      <div className="border border-[#E6EAF3] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#F8FAFC] border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase sticky top-0">
                            <tr>
                              <th className="py-2.5 px-3">Adm No.</th>
                              <th className="py-2.5 px-3.5">Student Name</th>
                              <th className="py-2.5 px-3">Transport Status</th>
                              <th className="py-2.5 px-3 text-right">Transport (Mo)</th>
                              <th className="py-2.5 px-3 text-right">Academic Base</th>
                              <th className="py-2.5 px-3 text-right">Transport Annual</th>
                              <th className="py-2.5 px-3.5 text-right">Total Annual Fee</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6EAF3]">
                            {detailModalCalculation.students_summary.map((st) => (
                              <tr key={st.student_id} className="hover:bg-[#F8FAFC]/50">
                                <td className="py-2.5 px-3 font-mono text-gray-500">
                                  {st.admission_no}
                                </td>
                                <td className="py-2.5 px-3.5 font-semibold text-[#141A2E]">
                                  {st.first_name} {st.last_name}
                                </td>
                                <td className="py-2.5 px-3">
                                  {st.has_transport ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                      <Truck className="w-3 h-3 text-amber-600" />
                                      {st.route_name || "Assigned Bus"}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">Non-Rider (₹0)</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-[#141A2E]">
                                  {st.has_transport
                                    ? fmtRupees(Math.round(st.monthly_transport_paise / 100))
                                    : "₹0"}
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#5B6478]">
                                  {fmtRupees(st.base_fee_rupees)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-amber-800">
                                  {fmtRupees(st.transport_fee_rupees)}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-bold text-[#141A2E]">
                                  {fmtRupees(st.total_fee_rupees)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: POLICY SIMULATOR */}
                  {detailModalTab === "simulator" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Mid-Year Admission Simulator */}
                      <div className="p-4 border border-[#E6EAF3] rounded-2xl bg-white space-y-4 shadow-2xs">
                        <div className="border-b border-[#E6EAF3] pb-2.5 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <h4 className="text-xs font-bold text-[#141A2E]">
                            Mid-Year Admission Proration Simulator
                          </h4>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div>
                            <label htmlFor="feestructurespage-select-admission-date" className="block text-xs font-semibold text-[#5B6478] mb-1">
                              Select Admission Date
                            </label>
                            <input id="feestructurespage-select-admission-date" aria-label="Select Admission Date"
                              type="date"
                              value={detailSimDate}
                              onChange={(e) => setDetailSimDate(e.target.value)}
                              className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl outline-none text-xs text-[#141A2E] focus:border-[#2158E0]"
                            />
                          </div>

                          {(() => {
                            const ay = academicYears.find((y) => y.id === detailModalStructure.academic_year_id) || selectedYear;
                            if (!ay) return null;
                            const compInputs: ComponentCalculationInput[] = detailModalCalculation.component_breakdowns.map((cb) => ({
                              fee_head_id: cb.fee_head_id,
                              name: cb.name,
                              frequency: cb.frequency,
                              amount_rupees: cb.amount_rupees,
                              is_mandatory: cb.is_mandatory,
                            }));
                            const cycle = (detailModalStructure.metadata as any)?.billingCycle || "quarterly";
                            const simResult = calculateMidYearAdmissionFee(compInputs, ay, detailSimDate, cycle);

                            return (
                              <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-[#5B6478]">Months Remaining in AY:</span>
                                  <span className="font-semibold text-[#141A2E]">{simResult.months_remaining} of {simResult.total_months} months</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#5B6478]">Payable Installments:</span>
                                  <span className="font-semibold text-[#141A2E]">{simResult.prorated_installments.length} installments</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-blue-200/50 font-bold">
                                  <span className="text-[#141A2E]">Prorated Student Base:</span>
                                  <span className="text-[#2158E0] text-sm">{fmtRupees(simResult.total_prorated_rupees)}</span>
                                </div>
                                <div className="text-[10px] text-[#5B6478]">
                                  (Full session base: {fmtRupees(simResult.total_original_rupees)})
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Concession Simulator */}
                      <div className="p-4 border border-[#E6EAF3] rounded-2xl bg-white space-y-4 shadow-2xs">
                        <div className="border-b border-[#E6EAF3] pb-2.5 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-bold text-[#141A2E]">
                            Concession & Scholarship Impact Simulator
                          </h4>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="feestructurespage-concession-type" className="block text-xs font-semibold text-[#5B6478] mb-1">
                                Concession Type
                              </label>
                              <select id="feestructurespage-concession-type" aria-label="Concession Type"
                                value={detailSimConcessionType}
                                onChange={(e) => setDetailSimConcessionType(e.target.value as any)}
                                className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl outline-none text-xs text-[#141A2E] bg-white cursor-pointer"
                              >
                                <option value="percentage">Percentage (%)</option>
                                <option value="flat">Flat Amount (₹)</option>
                                <option value="full_waiver">100% Full Waiver (RTE)</option>
                              </select>
                            </div>
                            {detailSimConcessionType !== "full_waiver" && (
                              <div>
                                <label htmlFor="feestructurespage-detailsimconcessiontype-percen" className="block text-xs font-semibold text-[#5B6478] mb-1">
                                  {detailSimConcessionType === "percentage" ? "Discount Percentage (%)" : "Flat Amount (₹)"}
                                </label>
                                <input id="feestructurespage-detailsimconcessiontype-percen" aria-label="Input value"
                                  type="number"
                                  min={0}
                                  max={detailSimConcessionType === "percentage" ? 100 : undefined}
                                  value={detailSimConcessionValue}
                                  onChange={(e) =>
                                    setDetailSimConcessionValue(
                                      Number.isFinite(e.currentTarget.valueAsNumber)
                                        ? e.currentTarget.valueAsNumber
                                        : 0
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-[#E6EAF3] rounded-xl outline-none text-xs text-[#141A2E]"
                                />
                              </div>
                            )}
                          </div>

                          {(() => {
                            const concResult = calculateConcessionImpact(
                              detailModalCalculation.base_annual_per_student_paise,
                              detailSimConcessionType,
                              detailSimConcessionType === "percentage"
                                ? detailSimConcessionValue
                                : detailSimConcessionValue * 100
                            );

                            return (
                              <div className="p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-[#5B6478]">Gross Academic Fee:</span>
                                  <span className="font-semibold text-[#141A2E]">{fmtRupees(concResult.original_amount_rupees)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-800">
                                  <span className="font-medium">Concession Deduction:</span>
                                  <span className="font-bold">- {fmtRupees(concResult.concession_amount_rupees)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-emerald-200/50 font-bold">
                                  <span className="text-[#141A2E]">Net Payable Fee / Student:</span>
                                  <span className="text-emerald-700 text-sm">{fmtRupees(concResult.net_amount_rupees)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const st = detailModalStructure;
                    setDetailModalStructure(null);
                    handleOpenEditWizard(st);
                  }}
                  className="px-4 py-2 border border-[#E6EAF3] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#141A2E] flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit Structure</span>
                </button>
                <button
                  onClick={() => {
                    const st = detailModalStructure;
                    setDetailModalStructure(null);
                    handleDuplicate(st);
                  }}
                  className="px-4 py-2 border border-[#E6EAF3] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#141A2E] flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>Duplicate</span>
                </button>
              </div>
              <button
                onClick={() => setDetailModalStructure(null)}
                className="px-5 py-2 bg-[#141A2E] hover:bg-gray-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. ASSIGNMENT & BILLING WORKFLOW MODAL ────────────────────────── */}
      {assignModalStructure && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E6EAF3] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E6EAF3] bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141A2E] flex items-center gap-2">
                    <span>Assign Structure & Generate Dues</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      {assignModalStructure.name}
                    </span>
                  </h3>
                  <p className="text-xs text-[#5B6478] mt-0.5">
                    Target: <span className="font-semibold text-[#141A2E]">{assignModalStructure.classNameDisplay}</span> ({assignModalStructure.sectionDisplay || "All Sections"})
                  </p>
                </div>
              </div>
              <button
                aria-label="Close"
                onClick={() => setAssignModalStructure(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {loadingAssignPreview ? (
                <div className="py-16 text-center text-[#5B6478] space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2158E0] mx-auto" />
                  <p className="text-xs font-semibold">Resolving eligible student enrollments & calculating dues schedule...</p>
                </div>
              ) : assignModalPreview ? (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl p-3">
                      <div className="text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider">Eligible Students</div>
                      <div className="text-lg font-bold text-[#141A2E] mt-1">{assignModalPreview.summary.total_eligible}</div>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl p-3">
                      <div className="text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider">Already Assigned</div>
                      <div className="text-lg font-bold text-blue-700 mt-1">{assignModalPreview.summary.already_assigned}</div>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl p-3">
                      <div className="text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider">Newly Eligible</div>
                      <div className="text-lg font-bold text-emerald-700 mt-1">{assignModalPreview.summary.newly_eligible}</div>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl p-3">
                      <div className="text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider">Transport Riders</div>
                      <div className="text-lg font-bold text-amber-700 mt-1">{assignModalPreview.summary.transport_riders}</div>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl p-3">
                      <div className="text-[10px] font-semibold text-[#8A94A6] uppercase tracking-wider">RTE / Waived</div>
                      <div className="text-lg font-bold text-purple-700 mt-1">{assignModalPreview.summary.rte_count}</div>
                    </div>
                    <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3">
                      <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Projected Demand</div>
                      <div className="text-base font-bold text-emerald-800 mt-1">{fmtRupees(Math.round(assignModalPreview.summary.projected_dues_paise / 100))}</div>
                    </div>
                  </div>

                  {/* Idempotency & Billing Execution Settings */}
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={assignGenerateDues}
                        onChange={(e) => setAssignGenerateDues(e.target.checked)}
                        className="mt-0.5 rounded border-[#E6EAF3] text-[#2158E0] focus:ring-[#2158E0]"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#141A2E]">
                          Generate installment dues and invoices according to schedule
                        </span>
                        <p className="text-[11px] text-[#5B6478] mt-0.5">
                          When checked, dues will be generated for each term and synchronized with the fee ledger.
                          Existing dues for already-assigned students will not be duplicated.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Success Execution Result Banner */}
                  {assignSuccessSummary && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm">Assignment & Billing Executed Successfully!</div>
                        <div className="mt-1 space-y-0.5 text-xs text-emerald-900">
                          <div>• Newly assigned students: <span className="font-bold">{assignSuccessSummary.assigned_count}</span></div>
                          <div>• Installment dues created: <span className="font-bold">{assignSuccessSummary.created_dues_count}</span></div>
                          <div>• Already assigned students preserved: <span className="font-bold">{assignSuccessSummary.already_assigned_count || 0}</span></div>
                          <div>• Active transport riders charged: <span className="font-bold">{assignSuccessSummary.transport_riders_count}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Students Table with Search */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-[#141A2E]">
                        Eligible Students ({assignModalPreview.students.length})
                      </span>
                      <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search student or admission no..."
                          value={assignStudentSearch}
                          onChange={(e) => setAssignStudentSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-[#E6EAF3] rounded-lg text-xs outline-none focus:border-[#2158E0]"
                        />
                      </div>
                    </div>

                    <div className="border border-[#E6EAF3] rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#F8FAFC] border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Adm No.</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Class & Section</th>
                            <th className="py-2.5 px-3">RTE Status</th>
                            <th className="py-2.5 px-3">Transport Status</th>
                            <th className="py-2.5 px-3 text-right">Assignment State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6EAF3] font-medium text-[#141A2E]">
                          {assignModalPreview.students
                            .filter((st) => {
                              const q = assignStudentSearch.toLowerCase().trim();
                              if (!q) return true;
                              return (
                                st.first_name.toLowerCase().includes(q) ||
                                st.last_name.toLowerCase().includes(q) ||
                                st.admission_no.toLowerCase().includes(q)
                              );
                            })
                            .map((st) => (
                              <tr key={st.student_id} className="hover:bg-[#F8FAFC]">
                                <td className="py-2 px-3 font-mono text-[#5B6478]">{st.admission_no}</td>
                                <td className="py-2 px-3 font-semibold text-[#141A2E]">
                                  {st.first_name} {st.last_name}
                                </td>
                                <td className="py-2 px-3 text-[#5B6478]">
                                  {st.class_name || assignModalStructure.classNameDisplay} {st.section_name ? `• ${st.section_name}` : ""}
                                </td>
                                <td className="py-2 px-3">
                                  {st.is_rte ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                      RTE 100% Waived
                                    </span>
                                  ) : (
                                    <span className="text-[#8A94A6]">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  {st.has_transport ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                      <Truck className="w-3 h-3 text-amber-600" />
                                      <span>Active Rider ({fmtRupees(Math.round(st.monthly_transport_paise / 100))}/mo)</span>
                                    </span>
                                  ) : (
                                    <span className="text-[#8A94A6] text-[11px]">₹0 (Non-Rider)</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {st.is_already_assigned ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#2158E0] border border-blue-200">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Already Assigned
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Ready to Assign
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-red-600 text-xs font-semibold">
                  Failed to load assignment preview.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setAssignModalStructure(null)}
                className="px-4 py-2 border border-[#E6EAF3] hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#5B6478] cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleExecuteBulkAssign}
                disabled={executingBulkAssign || !assignModalPreview || assignModalPreview.students.length === 0}
                className="px-5 py-2.5 bg-[#2158E0] hover:bg-[#1b48b8] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                {executingBulkAssign ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {assignGenerateDues ? "Confirm Assignment & Generate Dues" : "Confirm Assignment (No Dues)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
