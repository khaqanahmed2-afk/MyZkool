import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Search,
  Filter,
  CreditCard,
  Sliders,
  CheckCircle2,
  Users,
  Download,
  AlertCircle,
  Eye,
  Layers,
  Sparkles,
  Grid,
  FileCheck,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Check,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  fetchEnrichedStudentIdCards,
  EnrichedStudentIdCard,
  IdCardCustomization,
  getIdCardCustomization,
  saveIdCardCustomization,
  DEFAULT_CUSTOMIZATION,
  generateQrCodeDataUrl,
  CardStatus,
} from "../../../services/idCardService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { IdCardPreview } from "../../../components/admin/students/id-cards/IdCardPreview";
import { IdCardCustomizationPanel } from "../../../components/admin/students/id-cards/IdCardCustomizationPanel";
import {
  IdCardPrintSheet,
  PrintLayoutMode,
} from "../../../components/admin/students/id-cards/IdCardPrintSheet";
import { CardStatusModal } from "../../../components/admin/students/id-cards/CardStatusModal";
import { THEME_LIST, getThemeDefinition } from "../../../components/admin/students/id-cards/themeRegistry";

type StudioViewTab = "inspector" | "batch_grid" | "print_preview";

export default function StudentIdCards() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { schoolId: authSchoolId } = useAuth();
  const schoolId = authSchoolId || "";

  // Query parameters
  const targetStudentId =
    searchParams.get("studentId") ||
    searchParams.get("student") ||
    searchParams.get("id") ||
    null;

  const selectedParam =
    searchParams.get("selected") ||
    searchParams.get("studentIds") ||
    null;

  const targetClassId = searchParams.get("classId");

  const targetStudentIds = useMemo(() => {
    if (selectedParam) {
      return selectedParam.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (targetStudentId) {
      return [targetStudentId];
    }
    return undefined;
  }, [selectedParam, targetStudentId]);

  // State
  const [cards, setCards] = useState<EnrichedStudentIdCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(targetClassId || "all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Studio Workspace State
  const [activeTab, setActiveTab] = useState<StudioViewTab>("inspector");
  const [activeStudentId, setActiveStudentId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isCustomizing, setIsCustomizing] = useState<boolean>(true);
  const [printLayout, setPrintLayout] = useState<PrintLayoutMode>("side_by_side");
  const [showCutGuides, setShowCutGuides] = useState<boolean>(true);

  // Status Modal
  const [statusModalCard, setStatusModalCard] = useState<EnrichedStudentIdCard | null>(null);

  // Customization Settings
  const [customization, setCustomization] = useState<IdCardCustomization>(() =>
    getIdCardCustomization(schoolId)
  );

  // QR Code Map: Maps student_id -> QR data URL for instant printing
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  // 1. Load Data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    async function loadData() {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      try {
        // Load classes for dropdown
        const clsRes = await getClassesWithSections(schoolId, "ay-2026");
        if (!isMounted) return;
        if (clsRes.classes) {
          setClasses(clsRes.classes);
        }

        // Fetch enriched student ID card items
        const enriched = await fetchEnrichedStudentIdCards(schoolId, {
          studentId: targetStudentId || undefined,
          studentIds: targetStudentIds,
          classId: selectedClass !== "all" ? selectedClass : undefined,
          sectionId: selectedSection !== "all" ? selectedSection : undefined,
        });

        if (!isMounted) return;
        setCards(enriched);

        // Pre-select student IDs for batch actions
        if (targetStudentIds && targetStudentIds.length > 0) {
          setSelectedStudentIds(new Set(targetStudentIds));
          setActiveStudentId(targetStudentIds[0]);
        } else if (enriched.length > 0) {
          // Select all by default or first student
          setSelectedStudentIds(new Set(enriched.map((c) => c.student_id)));
          setActiveStudentId(enriched[0].student_id);
        }

        // Load stored customization for this school
        const stored = getIdCardCustomization(schoolId);
        setCustomization(stored);
      } catch (err) {
        console.error("Failed to load enriched student ID card data:", err);
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : "Unable to issue student ID cards.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [schoolId, targetStudentId, selectedParam, selectedClass, selectedSection]);

  // 2. Pre-generate QR codes for selected cards for lightning-fast printing
  useEffect(() => {
    let isCurrent = true;
    async function pregenerateQrs() {
      const newMap: Record<string, string> = { ...qrMap };
      const missing = cards.filter((c) => !newMap[c.student_id] && c.verification_url);
      if (missing.length === 0) return;

      for (const card of missing) {
        if (!isCurrent) break;
        try {
          const url = await generateQrCodeDataUrl(card.verification_url);
          newMap[card.student_id] = url;
        } catch {}
      }

      if (isCurrent) {
        setQrMap(newMap);
      }
    }

    if (cards.length > 0) {
      pregenerateQrs();
    }

    return () => {
      isCurrent = false;
    };
  }, [cards]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      // Status filter
      if (statusFilter !== "all" && c.card_status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.full_name.toLowerCase().includes(q) ||
          c.admission_no.toLowerCase().includes(q) ||
          c.class_name.toLowerCase().includes(q) ||
          (c.roll_no && c.roll_no.toLowerCase().includes(q)) ||
          c.guardian_phone.includes(q) ||
          (c.father_name && c.father_name.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [cards, statusFilter, searchQuery]);

  // Active student card in Inspector
  const activeCard = useMemo(() => {
    if (activeStudentId) {
      const match = cards.find((c) => c.student_id === activeStudentId);
      if (match) return match;
    }
    return filteredCards[0] || cards[0] || null;
  }, [activeStudentId, cards, filteredCards]);

  // Selected cards for printing
  const printableCards = useMemo(() => {
    if (selectedStudentIds.size === 0) return filteredCards;
    return filteredCards.filter((c) => selectedStudentIds.has(c.student_id));
  }, [filteredCards, selectedStudentIds]);

  // Multi-selection handlers
  const toggleSelectStudent = useCallback((id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedStudentIds(new Set(filteredCards.map((c) => c.student_id)));
  }, [filteredCards]);

  const handleDeselectAll = useCallback(() => {
    setSelectedStudentIds(new Set());
  }, []);

  // Customization update
  const handleCustomizationChange = useCallback(
    (updated: Partial<IdCardCustomization>) => {
      setCustomization((prev) => {
        const selectedTheme = updated.themeId ? getThemeDefinition(updated.themeId) : null;
        const next = {
          ...prev,
          ...updated,
          ...(selectedTheme
            ? {
                primaryColor: selectedTheme.defaultPrimaryColor,
                secondaryColor: selectedTheme.defaultSecondaryColor,
              }
            : {}),
        };
        saveIdCardCustomization(schoolId, next);
        return next;
      });
    },
    [schoolId]
  );

  const handleResetCustomization = useCallback(() => {
    setCustomization(DEFAULT_CUSTOMIZATION);
    saveIdCardCustomization(schoolId, DEFAULT_CUSTOMIZATION);
  }, [schoolId]);

  const handleSaveAsDefault = useCallback(() => {
    saveIdCardCustomization(schoolId, customization);
  }, [schoolId, customization]);

  // Card Status update callback
  const handleCardStatusUpdated = useCallback(
    (updatedStatus: CardStatus, revocationReason?: string) => {
      if (!statusModalCard) return;
      setCards((prev) =>
        prev.map((c) =>
          c.student_id === statusModalCard.student_id
            ? { ...c, card_status: updatedStatus, revocation_reason: revocationReason || null }
            : c
        )
      );
    },
    [statusModalCard]
  );

  // Print Handler
  const handlePrint = useCallback(() => {
    // If currently in inspector tab, temporarily switch to print_preview or trigger print
    window.print();
  }, []);

  const activeTheme = getThemeDefinition(customization.themeId);

  return (
    <div className="min-h-screen bg-slate-50/80 p-3 sm:p-5 md:p-8 font-sans">
      {/* Invisible on screen during normal work, active on print */}
      <div className="print-only hidden">
        <IdCardPrintSheet
          cards={printableCards}
          customization={customization}
          qrMap={qrMap}
          printLayout={printLayout}
          showCutGuides={showCutGuides}
        />
      </div>

      {/* Screen Controls Header */}
      <div className="no-print max-w-7xl mx-auto space-y-4 mb-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              to="/admin/students"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Students
            </Link>
            <div className="flex items-center gap-2.5 mt-1 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-[#2158E0]" />
                Student ID Card Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100/80 text-[#2158E0] border border-blue-200">
                CR80 • 54 × 86 mm
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Theme: {activeTheme.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Design, customize, verify and print CR80 standard dual-sided student identity cards.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCustomizing((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isCustomizing
                  ? "bg-blue-50 text-[#2158E0] border-blue-200 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{isCustomizing ? "Hide Customizer" : "Customize Studio"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={printableCards.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>
                Print A4 Sheet ({printableCards.length})
              </span>
            </button>
          </div>
        </div>

        {/* Tab & Filter Ribbon */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("inspector")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "inspector"
                    ? "bg-white text-[#2158E0] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Card Inspector</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("batch_grid")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "batch_grid"
                    ? "bg-white text-[#2158E0] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Batch Gallery ({filteredCards.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("print_preview")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "print_preview"
                    ? "bg-white text-[#2158E0] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>A4 Sheet Preview</span>
              </button>
            </div>

            {/* Quick Status / Batch Counters */}
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
              <span>
                Total: <strong className="text-slate-800">{cards.length}</strong>
              </span>
              <span>•</span>
              <span>
                Filtered: <strong className="text-slate-800">{filteredCards.length}</strong>
              </span>
              <span>•</span>
              <span className="text-[#2158E0] font-bold">
                Selected for Print: {selectedStudentIds.size}
              </span>
              {(targetStudentId || selectedParam) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass("all");
                    setSearchQuery("");
                    navigate("/admin/students/id-cards");
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Clear URL Filter
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-1 max-w-xl">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student, admission no, roll no..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#2158E0] bg-white"
                />
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-[#2158E0]"
                >
                  <option value="all">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Card Status Filter */}
              <div className="shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-[#2158E0]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="revoked">Revoked Only</option>
                </select>
              </div>
            </div>

            {/* Selection Quick Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                Select All ({filteredCards.length})
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Body: Split View with Workspace & Customizer Drawer */}
      <div className="no-print max-w-7xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-500 text-xs">
            Loading student ID cards and institutional credentials...
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-12 text-center max-w-md mx-auto space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Unable to issue ID cards</h3>
            <p className="text-xs text-slate-500">{loadError}</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Student Cards Found</h3>
            <p className="text-xs text-slate-500">
              No students match the current filter criteria.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedClass("all");
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Primary Workspace (Left/Center) */}
            <div className={`${isCustomizing ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
              {/* TAB 1: CARD INSPECTOR */}
              {activeTab === "inspector" && activeCard && (
                <div className="space-y-4">
                  {/* Active Student Selector Ribbon */}
                  <div className="bg-white border border-[#E6EAF3] rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3 overflow-x-auto">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-700">Student:</span>
                      <select
                        value={activeCard.student_id}
                        onChange={(e) => setActiveStudentId(e.target.value)}
                        className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-[#2158E0]"
                      >
                        {filteredCards.map((c) => (
                          <option key={c.student_id} value={c.student_id}>
                            {c.full_name} ({c.admission_no}) - Class {c.class_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(activeCard.student_id)}
                          onChange={() => toggleSelectStudent(activeCard.student_id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                        <span>Include in Print Sheet</span>
                      </label>
                    </div>
                  </div>

                  {/* High Fidelity Interactive Preview */}
                  <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 sm:p-6 shadow-xs">
                    <IdCardPreview
                      card={activeCard}
                      customization={customization}
                      onCustomizationChange={handleCustomizationChange}
                      onOpenStatusModal={(c) => setStatusModalCard(c)}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: BATCH GRID GALLERY */}
              {activeTab === "batch_grid" && (
                <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Batch Card Gallery</h3>
                      <p className="text-xs text-slate-500">
                        Review cards across classes with multi-select printing.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      Showing {filteredCards.length} students
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
                    {filteredCards.map((card) => {
                      const isSelected = selectedStudentIds.has(card.student_id);
                      const isRevoked = card.card_status === "revoked";
                      const isInactive = card.card_status === "inactive";
                      const theme = getThemeDefinition(customization.themeId);
                      const ThemeComp = theme.Component;

                      return (
                        <div
                          key={card.student_id}
                          className={`p-3 rounded-2xl border-2 transition flex flex-col items-center bg-slate-50/50 ${
                            isSelected
                              ? "border-[#2158E0] shadow-sm bg-blue-50/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {/* Selection bar */}
                          <div className="w-full flex items-center justify-between mb-2 px-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectStudent(card.student_id)}
                                className="w-4 h-4 text-[#2158E0] rounded border-slate-300"
                              />
                              <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                                {card.first_name}
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveStudentId(card.student_id);
                                setActiveTab("inspector");
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                            >
                              Inspect
                            </button>
                          </div>

                          {/* Card Front in Container */}
                          <div className="rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white">
                            <ThemeComp
                              card={card}
                              customization={customization}
                              side="front"
                              qrDataUrl={qrMap[card.student_id]}
                            />
                          </div>

                          {/* Status and Action Buttons */}
                          <div className="w-full mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => setStatusModalCard(card)}
                              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                                isRevoked
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : isInactive
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {card.card_status}
                            </button>

                              <button
                                type="button"
                                onClick={() => navigate(`/admin/students/${card.student_id}`)}
                                className="font-mono text-[#2158E0] font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2158E0] rounded"
                                aria-label={`Open ${card.full_name}'s student profile`}
                              >
                              {card.admission_no}
                              </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: A4 PRINT SHEET PREVIEW */}
              {activeTab === "print_preview" && (
                <div className="space-y-4">
                  {/* Print Layout Options Bar */}
                  <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700">Print Layout:</span>
                      <select
                        value={printLayout}
                        onChange={(e) => setPrintLayout(e.target.value as PrintLayoutMode)}
                        className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-semibold"
                      >
                        <option value="side_by_side">Side-by-Side (Fold & Laminate)</option>
                        <option value="front_only">Front Cards Only</option>
                        <option value="back_only">Back Cards Only</option>
                        <option value="duplex">Duplex (Front Sheet, Back Sheet)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showCutGuides}
                          onChange={(e) => setShowCutGuides(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                        <span>Show Cutting Guides</span>
                      </label>

                      <button
                        type="button"
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Sheet Now</span>
                      </button>
                    </div>
                  </div>

                  {/* Render the actual Print Sheet Component in Preview Mode */}
                  <IdCardPrintSheet
                    cards={printableCards}
                    customization={customization}
                    qrMap={qrMap}
                    printLayout={printLayout}
                    showCutGuides={showCutGuides}
                  />
                </div>
              )}
            </div>

            {/* Customization Drawer / Panel (Right Column) */}
            {isCustomizing && (
              <div className="lg:col-span-4 sticky top-6">
                <IdCardCustomizationPanel
                  customization={customization}
                  onChange={handleCustomizationChange}
                  onReset={handleResetCustomization}
                  onSaveAsDefault={handleSaveAsDefault}
                  schoolNameDefault={cards[0]?.school_name || "School name unavailable"}
                  sessionDefault={cards[0]?.academic_session || "2026-2027"}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Status Modal */}
      {statusModalCard && (
        <CardStatusModal
          card={statusModalCard}
          schoolId={schoolId}
          onClose={() => setStatusModalCard(null)}
          onStatusUpdated={handleCardStatusUpdated}
        />
      )}
    </div>
  );
}
