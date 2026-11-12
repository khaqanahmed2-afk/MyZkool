import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Users,
  FileText,
  Receipt,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: "student" | "invoice" | "receipt" | "staff" | "action";
  href: string;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { schoolId } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Handle keyboard navigation inside the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        navigate(results[selectedIndex].href);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !schoolId) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const items: SearchResultItem[] = [];

      try {
        if (isSupabaseConfigured) {
          const q = query.trim();

          // 1. Search students
          const { data: students } = await supabase
            .from("students")
            .select("id, first_name, last_name, admission_no")
            .eq("school_id", schoolId)
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,admission_no.ilike.%${q}%`)
            .limit(5);

          (students || []).forEach((s) => {
            items.push({
              id: `stu-${s.id}`,
              title: `${s.first_name} ${s.last_name || ""}`.trim(),
              subtitle: `Admission No: ${s.admission_no}`,
              type: "student",
              href: `/admin/students/${s.id}`,
            });
          });

          // 2. Search fee receipts
          const { data: receipts } = await supabase
            .from("fee_receipts")
            .select("id, receipt_no, total_paise")
            .eq("school_id", schoolId)
            .ilike("receipt_no", `%${q}%`)
            .limit(4);

          (receipts || []).forEach((r) => {
            items.push({
              id: `rcpt-${r.id}`,
              title: `Receipt ${r.receipt_no}`,
              subtitle: `Amount: ₹${((r.total_paise || 0) / 100).toLocaleString("en-IN")}`,
              type: "receipt",
              href: `/admin/fees/collections`,
            });
          });

          // 3. Search staff
          const { data: staff } = await supabase
            .from("staff")
            .select("id, first_name, last_name, role, designation")
            .eq("school_id", schoolId)
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,designation.ilike.%${q}%`)
            .limit(3);

          (staff || []).forEach((st) => {
            items.push({
              id: `st-${st.id}`,
              title: `${st.first_name} ${st.last_name || ""}`.trim(),
              subtitle: `${st.designation || st.role || "Staff"}`,
              type: "staff",
              href: `/admin/staff`,
            });
          });
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
        setResults(items);
        setSelectedIndex(0);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, schoolId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, invoices, receipts, staff..."
            className="w-full text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">
              Searching database records...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No matching records found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with a student name, admission number, or receipt code.
              </p>
            </div>
          )}

          {!loading && !query && (
            <div className="p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Quick Navigation
              </span>
              <div className="mt-2 space-y-1">
                {[
                  { title: "Student Admissions", href: "/admin/students", icon: Users },
                  { title: "Fee Collections", href: "/admin/fees/collections", icon: Receipt },
                  { title: "Attendance Register", href: "/admin/attendance", icon: GraduationCap },
                  { title: "Fee Invoices & Dues", href: "/admin/fees/invoices", icon: FileText },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        navigate(item.href);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#2158E0]" />
                        <span>{item.title}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.href);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-[#2158E0]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === "student"
                            ? "bg-blue-100/70 text-blue-700"
                            : item.type === "receipt"
                            ? "bg-emerald-100/70 text-emerald-700"
                            : "bg-purple-100/70 text-purple-700"
                        }`}
                      >
                        {item.type === "student" ? (
                          <Users className="w-3.5 h-3.5" />
                        ) : item.type === "receipt" ? (
                          <Receipt className="w-3.5 h-3.5" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-[#141A2E]">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#64748B] truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with ↑ / ↓</span>
          <span>Press Enter to select</span>
        </div>
      </div>
    </div>
  );
}

