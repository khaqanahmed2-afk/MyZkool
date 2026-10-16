import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getCollectionsViewData,
  exportCollectionsCSV,
  EnrichedTransaction,
  CollectionSummaryMetrics,
} from "../../../services/feeCollectionsQueryService";
import { formatPaise } from "../../../lib/amountInWords";
import { CollectFeeDrawer } from "../../../components/admin/fees/CollectFeeDrawer";
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
  { id: "refunded", label: "Refunded" },
] as const;

export default function FeeCollectionsPage() {
  const { schoolId, school } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  const [search, setSearch] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "yesterday" | "this_week" | "this_month" | "custom">("today");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [activeTab, setActiveTab] = useState<string>("all");

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Data & loading state
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [allFilteredTransactions, setAllFilteredTransactions] = useState<EnrichedTransaction[]>([]);
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
  });

  // Table row selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Drawers & Modals
  const [isCollectDrawerOpen, setIsCollectDrawerOpen] = useState(false);
  const [selectedTransactionForModal, setSelectedTransactionForModal] = useState<EnrichedTransaction | null>(null);
  const [isCancelModalMode, setIsCancelModalMode] = useState(false);
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Check URL query parameters on mount (e.g. ?student=...)
  useEffect(() => {
    const studentParam = searchParams.get("student") || searchParams.get("studentId");
    if (studentParam) {
      setIsCollectDrawerOpen(true);
    }
  }, [searchParams]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getCollectionsViewData(schoolId, {
        search,
        academicYearId,
        classId: selectedClassId,
        paymentMethod: selectedPaymentMethod,
        dateRange,
        status: selectedStatus,
        methodTab: activeTab,
        page: currentPage,
        pageSize,
        sortBy: "date",
        sortOrder: "desc",
      });

      setSummary(data.summary);
      setTransactions(data.transactions);
      setAllFilteredTransactions(data.allFilteredTransactions || data.transactions);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setClassesList(data.classes);
      setYearsList(data.academicYears);

      // Default academic year if not yet set
      if (!academicYearId && data.academicYears.length > 0) {
        const cur = data.academicYears.find((y) => y.is_current) || data.academicYears[0];
        setAcademicYearId(cur.id);
      }
    } catch (err) {
      console.error("Failed to load fee collections:", err);
    } finally {
      setLoading(false);
    }
  }, [
    schoolId,
    search,
    academicYearId,
    selectedClassId,
    selectedPaymentMethod,
    dateRange,
    selectedStatus,
    activeTab,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination on filter change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
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
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F7EE] text-[#0B7B49] border border-emerald-200">Received</span>;
      case "pending":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case "failed":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Failed</span>;
      case "refunded":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Refunded</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700">{status}</span>;
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    setIsExportDropdownOpen(false);
    const toExport = allFilteredTransactions.length > 0 ? allFilteredTransactions : transactions;
    exportCollectionsCSV(toExport);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Page Header (Matches Reference Image) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#141A2E] tracking-tight">Fee Collections</h1>
          <p className="text-sm text-[#5B6478] mt-0.5">
            Track payments, receipts and daily fee collection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick Date Selector */}
          <div className="relative">
            <button
              onClick={() => setDateRange(dateRange === "today" ? "all" : "today")}
              className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-colors ${
                dateRange === "today"
                  ? "bg-[#E8F7EE] border-emerald-300 text-[#0B7B49]"
                  : "bg-white border-[#E6EAF3] text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Today</span>
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-gray-500" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-[#E6EAF3] rounded-xl shadow-lg z-30 py-1 divide-y divide-gray-100">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-50/60 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export as CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Green Action Button */}
          <button
            onClick={() => setIsCollectDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0B7B49] text-white rounded-xl text-xs font-bold hover:bg-[#09663c] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Collect Fee</span>
          </button>
        </div>
      </div>

      {/* 2. Collection Summary Cards (Matches Reference Image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Collection */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-2xs hover:shadow-sm transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-[#E8F7EE] text-[#0B7B49] flex items-center justify-center shrink-0">
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
            <p className="text-xs text-[#5B6478] mt-1 truncate">
              {summary.thisMonthCount} transactions
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
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by student name, admission no., receipt no. or transaction id..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:border-[#0B7B49] focus:ring-1 focus:ring-[#0B7B49] transition-all"
          />
        </div>

        {/* Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Academic Year */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Academic Year</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49]"
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
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49]"
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
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Payment Method</label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49]"
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
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49]"
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
            <label className="text-[11px] font-semibold text-gray-500 block mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E6EAF3] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0B7B49]"
            >
              <option value="all">All</option>
              <option value="received">Received</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Clear Filters Action */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full py-2 px-3 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Method Chips / Tabs Row (Matches Reference Image) */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 scrollbar-none">
          {PAYMENT_METHOD_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#0B7B49] text-white shadow-2xs font-bold"
                    : "bg-[#F8FAFC] text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-[#E6EAF3]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Payment Transactions Table (Matches Reference Image) */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="px-5 py-4 border-b border-[#E6EAF3] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#141A2E]">
            Payment Transactions ({totalCount})
          </h2>
          {selectedRowIds.size > 0 && (
            <span className="text-xs text-[#0B7B49] font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {selectedRowIds.size} selected
            </span>
          )}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-gray-500 font-semibold border-b border-[#E6EAF3]">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRowIds.size === transactions.length && transactions.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#0B7B49] focus:ring-[#0B7B49] border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-semibold text-gray-600">Receipt No.</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Date & Time</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Student</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Class</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Invoice(s)</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Amount</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Method</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="py-3 px-4 text-center font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E6EAF3]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#0B7B49]" />
                      <span>Loading payment transactions...</span>
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
                      onClick={() => setIsCollectDrawerOpen(true)}
                      className="mt-3 px-4 py-2 bg-[#0B7B49] text-white rounded-xl text-xs font-semibold hover:bg-[#09663c] transition-colors"
                    >
                      Collect Fee
                    </button>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isRowSelected = selectedRowIds.has(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isRowSelected ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => handleToggleRow(tx.id)}
                          className="w-4 h-4 rounded text-[#0B7B49] focus:ring-[#0B7B49] border-gray-300 cursor-pointer"
                        />
                      </td>

                      {/* Receipt No (Clickable Green Link) */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTransactionForModal(tx);
                            setIsCancelModalMode(false);
                          }}
                          className="font-bold text-[#0B7B49] hover:underline cursor-pointer"
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
                        {tx.formatted_amount}
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
                          type="button"
                          onClick={() => setActiveMenuRowId(activeMenuRowId === tx.id ? null : tx.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {activeMenuRowId === tx.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenuRowId(null)}
                            />
                            <div className="absolute right-4 top-10 w-44 bg-white border border-[#E6EAF3] rounded-xl shadow-xl z-20 py-1 divide-y divide-gray-100 text-left">
                              <button
                                onClick={() => {
                                  setSelectedTransactionForModal(tx);
                                  setIsCancelModalMode(false);
                                  setActiveMenuRowId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-400" />
                                <span>View Receipt</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTransactionForModal(tx);
                                  setIsCancelModalMode(false);
                                  setActiveMenuRowId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Printer className="w-3.5 h-3.5 text-gray-400" />
                                <span>Print / PDF</span>
                              </button>
                              {tx.status !== "refunded" && (
                                <button
                                  onClick={() => {
                                    setSelectedTransactionForModal(tx);
                                    setIsCancelModalMode(true);
                                    setActiveMenuRowId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
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
            of <span className="font-semibold text-gray-800">{totalCount}</span> payments
          </div>

          {/* Page numbers navigation */}
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#E6EAF3] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => {
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[#0B7B49] text-white"
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
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold border border-[#E6EAF3] text-gray-700 hover:bg-gray-50 ${
                    currentPage === totalPages ? "bg-[#0B7B49] text-white" : ""
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#E6EAF3] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Page size dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-white border border-[#E6EAF3] rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#0B7B49]"
            >
              <option value={8}>8 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collect Fee Side Drawer */}
      <CollectFeeDrawer
        isOpen={isCollectDrawerOpen}
        onClose={() => setIsCollectDrawerOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        academicYearId={academicYearId}
      />

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
