import React from "react";
import { BookOpen, X, Mail } from "lucide-react";

interface MasterAdminHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterAdminHelpModal: React.FC<MasterAdminHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Master Admin Guidance & Docs</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close documentation modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
          <p>
            <strong>Welcome to the MyZkool Platform Control Plane.</strong> As a Super Administrator, you have
            exclusive visibility and administrative governance across all registered educational institutions.
          </p>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-800">Quick Operational Guide:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
              <li>
                <strong>Onboard Schools:</strong> Navigate to Schools &gt; New to provision an institutional tenant.
              </li>
              <li>
                <strong>Subscription Tiers:</strong> Basic (₹999/mo), Pro (₹1,799/mo), Custom (&gt;1,800 students).
              </li>
              <li>
                <strong>Cross-Tenant Privacy:</strong> Student biometric and personal identifiers remain isolated
                under DPDP Act governance.
              </li>
              <li>
                <strong>Direct Support:</strong> Contact engineering via support@myzkool.com or +91 8400404002.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="mailto:support@myzkool.com"
              className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold text-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Engineering Desk</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
