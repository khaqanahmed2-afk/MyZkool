import React, { useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MasterAdminSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterAdminSearchModal: React.FC<MasterAdminSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const quickSearchItems = [
    { title: "Peace Convent School", category: "School", url: "/master-admin/schools/b70261ef-37f1-46c8-a148-2c496a9d33a8" },
    { title: "Khaqan Public School", category: "School", url: "/master-admin/schools" },
    { title: "Abdul Hamed Memorial Enter College", category: "Pending School", url: "/master-admin/schools?status=pending" },
    { title: "Pro Subscription Plan", category: "Pricing Plan", url: "/master-admin/subscriptions" },
    { title: "Basic Subscription Plan", category: "Pricing Plan", url: "/master-admin/subscriptions" },
    { title: "Pending School Subscription Invoices", category: "Billing", url: "/master-admin/billing" },
    { title: "Open Support Tickets Queue", category: "Support", url: "/master-admin/support" },
    { title: "Platform Audit Logs", category: "Security", url: "/master-admin/audit-logs" },
  ];

  const filteredSearch = quickSearchItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            id="master-admin-search-dialog"
            name="globalSearchQuery"
            aria-label="Search schools, subscriptions, invoices, tickets"
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schools, subscriptions, invoices, tickets..."
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredSearch.length > 0 ? (
            <div className="space-y-1">
              {filteredSearch.map((item) => (
                <button
                  key={`${item.category}-${item.url}`}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(item.url);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors group cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {item.category}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching records found for "{searchQuery}"
            </div>
          )}
        </div>
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Press ESC to close</span>
          <span>Use ↑ ↓ to navigate</span>
        </div>
      </div>
    </div>
  );
};
