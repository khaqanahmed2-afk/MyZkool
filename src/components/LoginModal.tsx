import React from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight, MessageSquare, Lock, UserCheck } from "lucide-react";
import { MyZkoolLogo } from "./MyZkoolLogo";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDemo: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onOpenDemo }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#E6EAF3] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-[#F8FAFC] border-b border-[#E6EAF3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MyZkoolLogo size={36} showText={false} />
            <div>
              <h3 id="login-modal-title" className="text-lg font-bold font-heading text-[#141A2E]">
                Sign in to MyZkool
              </h3>
              <p className="text-[11px] text-[#5B6478]">Access your school's secure workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close login dialog"
            className="p-2 rounded-full hover:bg-[#E2E8F0] text-[#5B6478] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Staff / Admin Login */}
          <div className="p-5 rounded-2xl border border-[#E6EAF3] bg-[#F8FAFC] space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#141A2E]">School Admin / Staff Login</div>
                <div className="text-xs text-[#5B6478]">Use your school's secure login page</div>
              </div>
            </div>
            <Link
              to="/login"
              onClick={onClose}
              className="w-full mt-1 py-3 px-5 rounded-full bg-[#2158E0] hover:bg-[#1a4ec4] text-white font-bold text-sm shadow-md shadow-[#2158E0]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              id="login-modal-go-to-login"
            >
              <span>Go to Login Page</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Parent Info */}
          <div className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 text-[#1FAE7A] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#141A2E]">Parents: No Login Needed</div>
                <div className="text-xs text-[#5B6478]">Updates arrive on your WhatsApp automatically</div>
              </div>
            </div>
            <p className="text-xs text-[#5B6478] leading-relaxed pl-1">
              Attendance alerts, fee reminders and report cards go straight to your WhatsApp. No app to install, no password to remember.
            </p>
          </div>

          {/* Footer links */}
          <div className="pt-1 border-t border-[#F1F5F9] flex items-center justify-center gap-3 text-xs text-[#5B6478] flex-wrap">
            <span>New school?</span>
            <Link
              to="/register"
              onClick={onClose}
              className="font-bold text-[#2158E0] hover:underline"
            >
              Register School Account
            </Link>
            <span>•</span>
            <button
              onClick={() => {
                onClose();
                onOpenDemo();
              }}
              className="font-medium text-[#5B6478] hover:text-[#141A2E] hover:underline cursor-pointer"
            >
              Book Free Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
