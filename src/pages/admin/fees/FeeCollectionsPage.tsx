import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Wallet,
  Calendar,
  Landmark,
  Banknote,
  Search,
  Plus,
  Download,
  Filter,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Printer,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckSquare,
  Lock,
  Undo2,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getCollectionsViewData,
  exportCollectionsCSV,
  EnrichedTransaction,
  CollectionSummaryMetrics,
} from "../../../services/feeCollectionsQueryService";
import { formatPaise } from "../../../lib/amountInWords";
import { ReceiptDetailsModal } from "../../../components/admin/fees/ReceiptDetailsModal";
import type { PaymentMode } from "../../../types/collection";

const PAYMENT_METHOD_TABS = [
  { id: "all", label: "All Payments" },
  { id: "cash", label: "Cash" },
  { id: "upi", label: "UPI" },
  { id: "bank_transfer", label: "Bank Transfer" },
  { id: "cheque", label: "Cheque" },
  { id: "online", label: "Online" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "refunded", label: "Refunded" },
  { id: "reversed", label: "Reversed" },
] as const;

type SortColumn = "date" | "amount" | "receipt_no" | "student_name" | "class_name" | "payment_method" | "status";

export default function FeeCollectionsPage() {
  const { schoolId, school } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "yesterday" | "this_week" | "this_month" | "custom">("today");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [activeTab, setActiveTab] = useState<string>("all");

  // Sorting state
  const [sortBy, setSortBy] = useState<SortColumn>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Data & loading state
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const allFilteredTransactionsRef = useRef<EnrichedTransaction[]>([]);
  const [classesList, setClassesList] = useState<Array<{ id: string; name: string }>>([]);
  const [yearsList, setYearsList] = useState<Array<{ id: string; label: string; is_current: boolean }>>([]);
  const [summary, setSummary] = useState<CollectionSummaryMetrics>({
    todayPaise: 0,
    todayCount: 0,
    thisMonthPaise: 0,
    thisMonthCount: 0,
    onlinePaise: 0,
    onlineCount: 0,
    cashPaise: 0,
    cashCount: 0,
    cancelledCount: 0,
    totalAuditedCount: 0,
  });

  // Table row selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Modals & Popovers
  const [selectedTransactionForModal, setSelectedTransactionForModal] = useState<EnrichedTransaction | null>(null);
  const [isCancelModalMode, setIsCancelModalMode] = useState(false);
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Check URL query parameters on mount (e.g. ?student=...) and forward to full page
  useEffect(() => {
    const studentParam = searchParams.get("student") || searchParams.get("studentId");
    if (studentParam) {
      navigate(`/admin/fees/collect?student=${encodeURIComponent(studentParam)}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getCollectionsViewData(schoolId, {
        search: debouncedSearch,
        academicYearId,
        classId: selectedClassId,
        paymentMethod: selectedPaymentMethod,
        dateRange,
        status: selectedStatus,
        methodTab: activeTab,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder,
      });

      setSummary(data.summary);
      setTransactions(data.transactions);
      allFilteredTransactionsRef.current = data.allFilteredTransactions || data.transactions;
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setClassesList(data.classes);
      setYearsList(data.academicYears);

      // Default academic year if not yet set
      if (!academicYearId && data.academicYears.length > 0) {
        const cur = data.academicYears.find((y) => y.is_current) || data.academicYears[0];
        setAcademicYearId(cur.id);
      }
    } catch (err: any) {
      console.error("Failed to load fee collections:", err);
      setFetchError(err?.message || "Failed to load fee collection transactions. Please check your network and retry.");
    } finally {
      setLoading(false);
    }
  }, [
    schoolId,
    debouncedSearch,
    academicYearId,
    selectedClassId,
    selectedPaymentMethod,
    dateRange,
    selectedStatus,
    activeTab,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort handler
  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder(column === "date" || column === "amount" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedClassId("all");
    setSelectedPaymentMethod("all");
    setDateRange("all");
    setSelectedStatus("all");
    setActiveTab("all");
    setCurrentPage(1);
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === transactions.length && transactions.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const handleBulkExport = () => {
    const selectedList = transactions.filter((t) => selectedRowIds.has(t.id));
    if (selectedList.length > 0) {
      exportCollectionsCSV(selectedList);
    }
  };

  const handleBulkPrint = () => {
    const selectedList = transactions.filter((t) => selectedRowIds.has(t.id));
    if (selectedList.length > 0) {
      setSelectedTransactionForModal(selectedList[0]);
    }
  };

  // Method Badge color resolver
  const getMethodBadge = (mode: PaymentMode) => {
    switch (mode) {
      case "upi":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">UPI</span>;
      case "cash":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Cash</span>;
      case "bank_transfer":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Bank Transfer</span>;
      case "cheque":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Cheque</span>;
      case "online":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Online</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 uppercase">{mode}</span>;
    }
  };

  // Status Badge color resolver
  const getStatusBadge = (status: EnrichedTransaction["status"]) => {
    switch (status) {
      case "received":
      case "successful":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F7EE] text-[#0B7B49] border border-emerald-200">Successful</span>;
      case "pending":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case "failed":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Failed</span>;
      case "cancelled":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">Cancelled</span>;
      case "refunded":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Refunded</span>;
      case "reversed":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">Reversed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700">{status}</span>;
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    setIsExportDropdownOpen(false);
    const toExport = allFilteredTransactionsRef.current.length > 0 ? allFilteredTransactionsRef.current : transactions;
    exportCollectionsCSV(toExport);
  };

  const renderSortableHeader = (label: string, field: SortColumn, extraClasses = "") => {
    const isActive = sortBy === field;
    return (
      <th
        scope="col"
        tabIndex={0}
        role="columnheader"
        aria-sort={isActive ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
        onClick={() => handleSort(field)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSort(field);
          }
        }}
        className={`py-3 px-4 font-semibold text-gray-600 select-none cursor-pointer hover:bg-slate-100/70 transition-colors focus:outline-none focus:bg-slate-100 ${extraClasses}`}
        title={`Sort by ${label}`}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {isActive ? (
            sortOrder === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5 text-[#2563EB]" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-[#2563EB]" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Page Header (Matches Reference Image) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">Fee Collections</h1>
          <p className="text-sm text-[#5B6478] mt-0.5">
            Track payments, receipts and daily fee collection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Date Selector: Today */}
          <button
            type="button"
            onClick={() => setDateRange(dateRange === "today" ? "all" : "today")}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0 ${
              dateRange === "today"
                ? "bg-[#EBF2FE] border-blue-200 text-[#2563EB]"
                : "bg-white border-[#E6EAF3] text-gray-700 hover:bg-gray-50 hover:border-gray-300"
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${dateRange === "today" ? "text-[#2563EB]" : "text-gray-500"}`} />
            <span>Today</span>
          </button>

          {/* Cheque Register Shortcut */}
          <Link
            to="/admin/fees/cheques"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-[#2563EB] transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Manage Cheques & Clearances"
          >
            <CheckSquare className="w-3.5 h-3.5 text-gray-500" />
            <span>Cheque Register</span>
          </Link>

          {/* Day Close Shortcut */}
          <Link
            to="/admin/fees/day-close"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-[#2563EB] transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Day Close & Cash Reconciliation"
          >
            <Lock className="w-3.5 h-3.5 text-gray-500" />
            <span>Day Close</span>
          </Link>

          {/* Refunds Register Shortcut */}
          <Link
            to="/admin/fees/refunds"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-[#2563EB] transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Refunds Register & Reversals"
          >
            <Undo2 className="w-3.5 h-3.5 text-gray-500" />
            <span>Refunds Register</span>
          </Link>

          {/* Fee & Receipt Settings Shortcut */}
          <Link
            to="/admin/fees/setup/settings"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-[#2563EB] transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Configure Billing Preferences, Receipt Templates, Branding & Payment Options"
          >
            <Settings className="w-3.5 h-3.5 text-gray-500" />
            <span>Fee & Receipt Settings</span>
          </Link>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-[#2563EB] transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExportDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-[#E6EAF3] rounded-xl shadow-lg z-30 py-1 divide-y divide-gray-100">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50/70 hover:text-[#2563EB] flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>Export as CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Blue Collect Fee Action */}
          <Link
            to="/admin/fees/collect"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Collect Fee</span>
          </Link>
        </div>
      </div>

      {/* 2. Collection Summary Cards (Matches Reference Image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Collection */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-[#EBF2FE] text-[#2563EB] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500 leading-none">Today's Collection</p>
            <h3 className="text-xl sm:text-2xl font-black text-[#141A2E] mt-1.5">
              {formatPaise(summary.todayPaise)}
            </h3>
            <p className="text-xs text-[#5B6478] mt-1 truncate">
              {summary.todayCount} {summary.todayCount === 1 ? "payment" : "payments"} received today
            </p>
          </div>
        </div>

        {/* Card 2: This Month */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-[#EBF2FE] text-[#2158E0] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500 leading-none">This Month</p>
            <h3 className="text-xl sm:text-2xl font-black text-[#141A2E] mt-1.5">
              {formatPaise(summary.thisMonthPaise)}
            </h3>
            <p className="text-xs text-[#5B6478] mt-1 truncate" title={`${summary.thisMonthCount} settled payments`}>
              <span className="font-semibold text-gray-700">{summary.thisMonthCount}</span> settled payments
              {summary.cancelledCount && summary.cancelledCount > 0 ? (
                <span className="text-gray-400 text-[11px] ml-1">({summary.cancelledCount} voided)</span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Card 3: Online Payments */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500 leading-none">Online Payments</p>
            <h3 className="text-xl sm:text-2xl font-black text-[#141A2E] mt-1.5">
              {formatPaise(summary.onlinePaise)}
            </h3>
            <p className="text-xs text-[#5B6478] mt-1 truncate">
              {summary.onlineCount} transactions
            </p>
          </div>
        </div>

        {/* Card 4: Cash Payments */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-[#FFF4E5] text-[#D97706] flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500 leading-none">Cash Payments</p>
            <h3 className="text-xl sm:text-2xl font-black text-[#141A2E] mt-1.5">
              {formatPaise(summary.cashPaise)}
            </h3>
            <p className="text-xs text-[#5B6478] mt-1 truncate">
              {summary.cashCount} transactions
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Panel (Matches Reference Image) */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Search Input with Debounce & Clear */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            aria-label="Search fee collections"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by student name, admission no., receipt no. or transaction reference..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Academic Year */}
          <div>
            <label htmlFor="feecollectionspage-academic-year" className="text-[11px] font-semibold text-gray-500 block mb-1">Academic Year</label>
            <select
              id="feecollectionspage-academic-year"
              aria-label="Academic Year"
              value={academicYearId}
              onChange={(e) => {
                setAcademicYearId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            >
              {yearsList.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label htmlFor="feecollectionspage-class" className="text-[11px] font-semibold text-gray-500 block mb-1">Class</label>
            <select
              id="feecollectionspage-class"
              aria-label="Class"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="feecollectionspage-payment-method" className="text-[11px] font-semibold text-gray-500 block mb-1">Payment Method</label>
            <select
              id="feecollectionspage-payment-method"
              aria-label="Payment Method"
              value={selectedPaymentMethod}
              onChange={(e) => {
                setSelectedPaymentMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label htmlFor="feecollectionspage-date-range" className="text-[11px] font-semibold text-gray-500 block mb-1">Date Range</label>
            <select
              id="feecollectionspage-date-range"
              aria-label="Date Range"
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="feecollectionspage-status" className="text-[11px] font-semibold text-gray-500 block mb-1">Status</label>
            <select
              id="feecollectionspage-status"
              aria-label="Status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="all">All Statuses</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>

          {/* Reset Filters Action */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full py-1.5 px-3 bg-white border border-[#E6EAF3] text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Quick Tabs Row */}
        <div className="pt-2 border-t border-[#E6EAF3] flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PAYMENT_METHOD_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-2xs"
                    : "bg-[#F8FAFC] text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Transactions Table Card */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="px-5 py-4 border-b border-[#E6EAF3] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#141A2E]">
              Payment Transactions ({totalCount})
            </h2>
            <p className="text-[11px] text-[#5B6478] mt-0.5">
              Comprehensive audit log of settled, pending, and voided receipts.
            </p>
          </div>
          {selectedRowIds.size > 0 && (
            <span className="text-xs text-[#2563EB] font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {selectedRowIds.size} selected
            </span>
          )}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-gray-500 font-semibold border-b border-[#E6EAF3]">
              <tr>
                <th scope="col" className="py-3 px-4 w-10 text-center">
                  <input
                    aria-label="Select all items"
                    type="checkbox"
                    checked={selectedRowIds.size === transactions.length && transactions.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] border-gray-300 cursor-pointer"
                  />
                </th>
                {renderSortableHeader("Receipt No.", "receipt_no")}
                {renderSortableHeader("Date & Time", "date")}
                {renderSortableHeader("Student", "student_name")}
                {renderSortableHeader("Class", "class_name")}
                <th scope="col" className="py-3 px-4 font-semibold text-gray-600">Invoice(s)</th>
                {renderSortableHeader("Amount", "amount")}
                {renderSortableHeader("Method", "payment_method")}
                {renderSortableHeader("Status", "status")}
                <th scope="col" className="py-3 px-4 text-center font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E6EAF3]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="py-3.5 px-4 text-center">
                      <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-20 h-4 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-24 h-4 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-200 rounded-full shrink-0" />
                        <div className="space-y-1">
                          <div className="w-28 h-3.5 bg-slate-200 rounded" />
                          <div className="w-16 h-2.5 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-14 h-4 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-20 h-4 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-16 h-4 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-16 h-5 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-20 h-5 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="w-6 h-6 bg-slate-100 rounded mx-auto" />
                    </td>
                  </tr>
                ))
              ) : fetchError ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <AlertCircle className="w-8 h-8 text-rose-500" />
                      <p className="text-sm font-semibold text-gray-800">Failed to load fee collections</p>
                      <p className="text-xs text-gray-500">{fetchError}</p>
                      <button
                        type="button"
                        onClick={fetchData}
                        className="mt-2 px-4 py-1.5 bg-[#2563EB] text-white text-xs font-semibold rounded-xl hover:bg-[#1D4ED8] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <p className="text-sm font-medium text-gray-600">No payment transactions found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try clearing filters or click Collect Fee to record a new payment.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/fees/collect")}
                      className="mt-3 px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-semibold hover:bg-[#1D4ED8] transition-colors cursor-pointer"
                    >
                      Collect Fee
                    </button>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isRowSelected = selectedRowIds.has(tx.id);
                  const isCancelled = tx.status === "cancelled";
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isRowSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          aria-label={`Select receipt ${tx.receipt_no}`}
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => handleToggleRow(tx.id)}
                          className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] border-gray-300 cursor-pointer"
                        />
                      </td>

                      {/* Receipt No (Clickable Blue Link) */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTransactionForModal(tx);
                            setIsCancelModalMode(false);
                          }}
                          className="font-bold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          {tx.receipt_no}
                        </button>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                        {tx.formatted_date_time}
                      </td>

                      {/* Student (Avatar Initials + Name + Admission No) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#EBF2FE] text-[#2158E0] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {tx.initials}
                          </div>
                          <div>
                            <p className="font-bold text-[#141A2E] leading-tight">{tx.student_name}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{tx.admission_no}</p>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4 text-gray-700 font-medium whitespace-nowrap">
                        {tx.class_name}
                      </td>

                      {/* Invoice(s) */}
                      <td className="py-3.5 px-4 text-gray-600">
                        {tx.invoice_numbers.join(", ") || "—"}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-[#141A2E] whitespace-nowrap">
                        <span className={isCancelled ? "line-through text-gray-400 font-normal" : ""}>
                          {tx.formatted_amount}
                        </span>
                        {isCancelled && (
                          <span className="block text-[10px] text-gray-400 font-normal">Voided</span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getMethodBadge(tx.payment_method)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(tx.status)}
                      </td>

                      {/* Actions Menu */}
                      <td className="py-3.5 px-4 text-center relative">
                        <button
                          aria-label={`Actions for ${tx.receipt_no}`}
                          type="button"
                          onClick={() => setActiveMenuRowId(activeMenuRowId === tx.id ? null : tx.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {activeMenuRowId === tx.id && (
                          <>
                            <div
                              aria-hidden="true"
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenuRowId(null)}
                            />
                            <div className="absolute right-4 top-10 w-44 bg-white border border-[#E6EAF3] rounded-xl shadow-xl z-20 py-1 divide-y divide-gray-100 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTransactionForModal(tx);
                                  setIsCancelModalMode(false);
                                  setActiveMenuRowId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-400" />
                                <span>View Receipt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTransactionForModal(tx);
                                  setIsCancelModalMode(false);
                                  setActiveMenuRowId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-gray-400" />
                                <span>Print / PDF</span>
                              </button>
                              {tx.status !== "refunded" && tx.status !== "cancelled" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransactionForModal(tx);
                                    setIsCancelModalMode(true);
                                    setActiveMenuRowId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                                  <span>Cancel / Refund</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination (Matches Reference Image) */}
        <div className="px-5 py-4 border-t border-[#E6EAF3] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-gray-800">
              {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-800">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-semibold text-gray-800">{totalCount}</span> records
          </div>

          {/* Page numbers navigation */}
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous page"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#E6EAF3] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => {
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#2563EB] text-white"
                      : "border border-[#E6EAF3] text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-gray-400">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold border border-[#E6EAF3] text-gray-700 hover:bg-gray-50 cursor-pointer ${
                    currentPage === totalPages ? "bg-[#2563EB] text-white" : ""
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              aria-label="Next page"
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#E6EAF3] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Page size dropdown */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Page size dropdown"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-white border border-[#E6EAF3] rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value={8}>8 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedRowIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#141A2E] text-white px-5 py-3 rounded-2xl shadow-2xl z-40 flex items-center gap-4 animate-in slide-in-from-bottom duration-200 border border-slate-700">
          <span className="text-xs font-semibold">
            <span className="bg-[#2563EB] text-white px-2 py-0.5 rounded-full mr-1.5 text-[11px] font-bold">
              {selectedRowIds.size}
            </span>
            {selectedRowIds.size === 1 ? "receipt" : "receipts"} selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={handleBulkExport}
            className="text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleBulkPrint}
            className="text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={() => setSelectedRowIds(new Set())}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Receipt Details Modal */}
      <ReceiptDetailsModal
        transaction={selectedTransactionForModal}
        initialCancelOpen={isCancelModalMode}
        onClose={() => {
          setSelectedTransactionForModal(null);
          setIsCancelModalMode(false);
        }}
        onCancelled={() => {
          fetchData();
        }}
      />
    </div>
  );
}
