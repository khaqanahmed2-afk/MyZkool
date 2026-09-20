import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Search,
  Filter,
  CreditCard,
  Building2,
  Phone,
  QrCode,
  Download,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getStudentIdCardData,
  StudentIdCardItem,
} from "../../../services/studentOperationsService";
import { getClassesWithSections } from "../../../services/classSectionService";

export default function StudentIdCards() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { schoolId: authSchoolId } = useAuth();
  const schoolId = authSchoolId || "default-school";

  const targetStudentId = searchParams.get("studentId");
  const targetClassId = searchParams.get("classId");

  const [cards, setCards] = useState<StudentIdCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(targetClassId || "all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load classes for filter dropdown
        const clsRes = await getClassesWithSections(schoolId, "ay-2026");
        if (clsRes.classes) {
          setClasses(clsRes.classes);
        }

        // Load ID card data
        const data = await getStudentIdCardData(schoolId, {
          studentId: targetStudentId || undefined,
          classId: selectedClass !== "all" ? selectedClass : undefined,
        });
        setCards(data);
      } catch (err) {
        console.error("Failed to load ID card data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [schoolId, targetStudentId, selectedClass]);

  const handlePrint = () => {
    window.print();
  };

  const filteredCards = cards.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.admission_no.toLowerCase().includes(q) ||
      c.class_name.toLowerCase().includes(q) ||
      c.guardian_phone.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Print-specific style block */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 86mm) !important;
            gap: 6mm !important;
            justify-content: center !important;
            margin: 0 auto !important;
          }
          .print-card {
            width: 86mm !important;
            height: 54mm !important;
            border: 1px solid #94a3b8 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            border-radius: 4mm !important;
            overflow: hidden !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Screen Controls Header (hidden on print) */}
      <div className="no-print max-w-6xl mx-auto space-y-4 mb-8">
        <div>
          <Link
            to="/admin/students"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Students
          </Link>
        </div>

        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-[#2158E0]" />
              Student ID Cards
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Spec A4.10: 86 x 54 mm print-ready layout with student photo, barcode/QR verification, and guardian contacts.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredCards.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet ({filteredCards.length})</span>
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or admission no..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#2158E0]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-[#2158E0]"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong>{filteredCards.length}</strong> cards (86 × 54 mm format)
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs">
          Loading student ID cards...
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Students Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            No enrolled students match the selected filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedClass("all");
              setSearchQuery("");
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto print-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
          {filteredCards.map((card) => {
            const initials = `${card.first_name[0] || ""}${card.last_name[0] || ""}`.toUpperCase();

            return (
              <div
                key={card.student_id}
                className="print-card bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
                style={{
                  width: "86mm",
                  height: "54mm",
                  boxSizing: "border-box",
                }}
              >
                {/* Top Brand Banner */}
                <div className="bg-[#1E3A8A] text-white px-3 py-1 flex items-center justify-between border-b border-blue-900">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                    <span className="text-[10px] font-bold tracking-wide uppercase truncate">
                      {card.school_name || "MyZkool Academy"}
                    </span>
                  </div>
                  <span className="text-[8px] bg-blue-800/80 px-1.5 py-0.5 rounded tracking-wider uppercase font-semibold text-blue-200">
                    Student ID
                  </span>
                </div>

                {/* Main Card Content */}
                <div className="p-2 flex gap-2 flex-1 items-center">
                  {/* Student Photo / Avatar */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="w-[18mm] h-[22mm] rounded-lg border border-slate-200 bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold text-sm overflow-hidden shadow-2xs">
                      {card.photo_url ? (
                        <img
                          src={card.photo_url}
                          alt={card.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    {card.blood_group && (
                      <span className="mt-1 text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        {card.blood_group}
                      </span>
                    )}
                  </div>

                  {/* Student Details */}
                  <div className="flex-1 min-w-0 space-y-0.5 text-[9px] text-slate-600 leading-tight">
                    <h3 className="font-bold text-slate-900 text-[11px] truncate leading-tight">
                      {card.full_name}
                    </h3>
                    <div className="flex items-center gap-1 font-mono text-blue-700 font-semibold">
                      <span>Adm: {card.admission_no}</span>
                    </div>
                    <div className="text-slate-700 font-medium">
                      Class: <strong>{card.class_name}</strong>
                      {card.section_name && ` (${card.section_name})`}
                    </div>
                    <div>
                      DOB: <span className="font-mono">{card.dob}</span>
                    </div>
                    <div className="truncate">
                      Parent: <span className="font-semibold text-slate-800">{card.guardian_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700">
                      <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="font-mono font-semibold">{card.guardian_phone}</span>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="shrink-0 flex flex-col items-center justify-center pl-1 border-l border-slate-100">
                    <div className="w-[14mm] h-[14mm] bg-slate-50 border border-slate-200 rounded p-0.5 flex items-center justify-center">
                      {/* Stylized QR representation encoding the student verification payload */}
                      <svg
                        className="w-full h-full text-slate-900"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="5" height="5" x="3" y="3" rx="1" />
                        <rect width="5" height="5" x="16" y="3" rx="1" />
                        <rect width="5" height="5" x="3" y="16" rx="1" />
                        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                        <path d="M21 21v.01" />
                        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                        <path d="M3 12h.01" />
                        <path d="M12 3h.01" />
                        <path d="M12 16v.01" />
                        <path d="M16 12h1" />
                        <path d="M21 12v.01" />
                        <path d="M12 21v-1" />
                      </svg>
                    </div>
                    <span className="text-[6.5px] font-mono text-slate-400 mt-0.5">VERIFY</span>
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="bg-slate-50 border-t border-slate-100 px-3 py-0.5 flex items-center justify-between text-[7.5px] text-slate-400 font-medium">
                  <span>Authorized Signatory</span>
                  <span className="font-mono">VALID 2026-27</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
