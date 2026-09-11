import React, { useState } from "react";
import { X, ShieldCheck, Lock, ArrowRight, MessageSquare, CheckCircle } from "lucide-react";
import { MyZkoolLogo } from "./MyZkoolLogo";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDemo: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onOpenDemo }) => {
  const [role, setRole] = useState<"admin" | "teacher" | "parent">("admin");
  const [schoolCode, setSchoolCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [simulatedLogin, setSimulatedLogin] = useState(false);

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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSimulatedLogin(true);
    setTimeout(() => {
      setSimulatedLogin(false);
      // In production, each school has a dedicated isolated tenant subdomain
      const targetDomain = schoolCode.trim() 
        ? `https://${schoolCode.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")}.myzkool.in` 
        : "https://app.myzkool.in";
      alert(`Redirecting to verified school instance: ${targetDomain}\n\n(For demo preview, credentials have been verified)`);
      onClose();
    }, 800);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
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
                MyZkool Single Login
              </h3>
              <p className="text-[11px] text-[#5B6478]">Access your school's dedicated workspace</p>
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

        {/* Role Selector Tabs */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F1F5F9] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setRole("admin")}
              className={`py-2 rounded-lg transition-all ${
                role === "admin" ? "bg-white text-[#2158E0] shadow-xs" : "text-[#5B6478]"
              }`}
            >
              School Admin
            </button>
            <button
              onClick={() => setRole("teacher")}
              className={`py-2 rounded-lg transition-all ${
                role === "teacher" ? "bg-white text-[#2158E0] shadow-xs" : "text-[#5B6478]"
              }`}
            >
              Staff / Teacher
            </button>
            <button
              onClick={() => setRole("parent")}
              className={`py-2 rounded-lg transition-all ${
                role === "parent" ? "bg-white text-[#1FAE7A] shadow-xs" : "text-[#5B6478]"
              }`}
            >
              Parent Portal
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 pt-2">
          {role === "parent" ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#1FAE7A] flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold font-heading text-[#141A2E]">
                No Password Needed for Parents!
              </h4>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                As a parent, your child's attendance, report cards, and fee receipts arrive automatically on your WhatsApp.
              </p>
              <div className="pt-2">
                <label className="block text-xs font-bold text-left text-[#141A2E] mb-1">
                  Check Parent WhatsApp Status
                </label>
                <input
                  type="tel"
                  value={parentMobile}
                  onChange={(e) => setParentMobile(e.target.value)}
                  placeholder="Enter registered mobile number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] text-sm text-[#141A2E] outline-none focus:border-[#1FAE7A]"
                />
              </div>
              <button
                onClick={() => {
                  alert(`Verified! If your child is enrolled in a MyZkool-powered school, you will receive real-time notifications on WhatsApp.`);
                  onClose();
                }}
                className="w-full py-2.5 rounded-full bg-[#1FAE7A] hover:bg-[#18996b] text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
              >
                Verify WhatsApp Connected School
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#141A2E] mb-1">
                  School Domain / Code
                </label>
                <input
                  type="text"
                  required
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="e.g. stmarys or 213084"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6EAF3] text-sm text-[#141A2E] outline-none focus:border-[#2158E0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141A2E] mb-1">
                  Username or Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@school.edu.in"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6EAF3] text-sm text-[#141A2E] outline-none focus:border-[#2158E0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141A2E] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6EAF3] text-sm text-[#141A2E] outline-none focus:border-[#2158E0]"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[#5B6478] pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" className="rounded text-[#2158E0]" defaultChecked />
                  <span>Remember me</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); alert("Please contact your school administrator or MyZkool onboarding manager."); }} className="text-[#2158E0] hover:underline">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={simulatedLogin}
                className="w-full mt-3 py-3 rounded-full bg-[#2158E0] hover:bg-[#1a4ec4] text-white font-bold text-sm shadow-md shadow-[#2158E0]/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <span>{simulatedLogin ? "Logging in..." : "Login to Workspace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-center">
            <span className="text-xs text-[#5B6478]">New school looking to onboard? </span>
            <button
              onClick={() => {
                onClose();
                onOpenDemo();
              }}
              className="text-xs font-bold text-[#2158E0] hover:underline"
            >
              Book a Free Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
