import React, { useState } from "react";
import { X, CheckCircle2, MessageSquare, ArrowRight, School, Phone, User, MapPin, Mail, AlertCircle } from "lucide-react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: string;
  onOpenPrivacy?: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose, defaultPlan, onOpenPrivacy }) => {
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [board, setBoard] = useState("CBSE");
  const [studentCount, setStudentCount] = useState("Up to 800");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(true);
  
  // Status: idle | submitting | success | error
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolName.trim() || !phone.trim()) {
      setErrorMessage("Please fill in your School Name and WhatsApp contact number.");
      return;
    }
    if (!consentGiven) {
      setErrorMessage("Please accept the data processing consent required under the DPDP Act.");
      return;
    }
    setErrorMessage("");
    setStatus("submitting");

    const formData = new FormData(e.currentTarget);
    formData.append("access_key", "00db5821-a619-418f-bc9f-480cd6782d9f");
    formData.append("subject", `New Demo Request: ${schoolName} (${city || "India"})`);
    formData.append("from_name", "MyZkool Website");
    if (defaultPlan) {
      formData.append("selected_tier", defaultPlan);
    }

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Something went wrong sending your request.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error connecting to submission server.");
    }
  };

  const resetAndClose = () => {
    setStatus("idle");
    setSchoolName("");
    setCity("");
    setContactName("");
    setPhone("");
    setEmail("");
    setErrorMessage("");
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E6EAF3] overflow-hidden relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-[#F8FAFC] border-b border-[#E6EAF3] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#2158E0] uppercase tracking-wider">
              {defaultPlan ? `Selected: ${defaultPlan} Plan` : "30-Minute Free Demo"}
            </div>
            <h3 id="demo-modal-title" className="text-xl font-bold font-heading text-[#141A2E]">
              See MyZkool in Action for Your School
            </h3>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 rounded-full hover:bg-[#E2E8F0] text-[#5B6478] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {status === "success" ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#1FAE7A] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-2xl font-bold font-heading text-[#141A2E]">
                Demo Request Received!
              </h4>
              <p className="text-sm text-[#5B6478] max-w-sm mx-auto leading-relaxed" role="status">
                Thanks, we've received your details. Our team will reach out on
                WhatsApp shortly with your personalized preview.
              </p>

              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E6EAF3] text-left text-xs space-y-2 max-w-sm mx-auto">
                <div><strong>School:</strong> {schoolName} {city ? `(${city})` : ""}</div>
                <div><strong>Curriculum:</strong> {board} • {studentCount}</div>
                <div><strong>WhatsApp Contact:</strong> {phone}</div>
                <div><strong>Representative:</strong> {contactName || "School Leader"}</div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5 max-w-sm mx-auto">
                <a
                  href={`https://wa.me/919555954854?text=Hi%2C%20I%20just%20requested%20a%20demo%20for%20${encodeURIComponent(schoolName)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full px-6 py-3.5 rounded-full bg-[#1FAE7A] hover:bg-[#199468] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message Us Directly on WhatsApp (+91 95559 54854)</span>
                </a>
                <div className="text-[11px] text-[#5B6478]">
                  Or email our founder team directly at{" "}
                  <a href="mailto:khaqanbuilds@gmail.com" className="text-[#2158E0] font-semibold underline">
                    khaqanbuilds@gmail.com
                  </a>
                </div>
                <button
                  onClick={resetAndClose}
                  className="w-full mt-2 py-2.5 rounded-full border border-[#E6EAF3] text-xs font-semibold text-[#141A2E] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Web3Forms Honeypot field (hidden from real users) */}
              <input type="hidden" name="botcheck" style={{ display: "none" }} />

              {status === "error" && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2" role="alert">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Submission Error</span>
                  </div>
                  <p>
                    {errorMessage || "Something went wrong sending your request."} Please WhatsApp us directly at{" "}
                    <a href="https://wa.me/919555954854?text=Hi%2C%20I%20tried%20requesting%20a%20demo%20on%20the%20website" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-800">
                      +91 95559 54854
                    </a>{" "}
                    or email{" "}
                    <a href="mailto:khaqanbuilds@gmail.com" className="underline font-bold text-blue-800">
                      khaqanbuilds@gmail.com
                    </a>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#141A2E] mb-1">
                  School Name *
                </label>
                <div className="relative">
                  <School className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5B6478]" />
                  <input
                    type="text"
                    name="school_name"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. St. Xavier's Public School"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E6EAF3] focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] text-sm text-[#141A2E] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141A2E] mb-1">
                    City / Town
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5B6478]" />
                    <input
                      type="text"
                      name="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lucknow, Kanpur"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E6EAF3] focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] text-sm text-[#141A2E] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141A2E] mb-1">
                    Affiliated Board
                  </label>
                  <select
                    name="board"
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] focus:border-[#2158E0] text-sm text-[#141A2E] bg-white outline-none"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE / ISC</option>
                    <option value="State Board">State Board (UP, MP, etc.)</option>
                    <option value="Other">Other / Matriculation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141A2E] mb-1">
                    Student Strength
                  </label>
                  <select
                    name="student_count"
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6EAF3] focus:border-[#2158E0] text-sm text-[#141A2E] bg-white outline-none"
                  >
                    <option value="Under 400">Under 400 students</option>
                    <option value="Up to 800">400 - 800 students (Basic)</option>
                    <option value="800 to 1,800">800 - 1,800 students (Pro)</option>
                    <option value="1,800+">1,800+ students (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141A2E] mb-1">
                    Your Name / Role
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5B6478]" />
                    <input
                      type="text"
                      name="contact_name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Principal / Trustee / Admin"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E6EAF3] focus:border-[#2158E0] text-sm text-[#141A2E] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141A2E] mb-1">
                    WhatsApp Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5B6478]" />
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 95559 54854"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E6EAF3] focus:border-[#2158E0] focus:ring-1 focus:ring-[#2158E0] text-sm text-[#141A2E] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141A2E] mb-1">
                    School Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5B6478]" />
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="principal@school.edu.in"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E6EAF3] focus:border-[#2158E0] text-sm text-[#141A2E] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* DPDP Act 2023 Consent Checkbox - Required to enable submit */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-[11px] text-[#5B6478] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="dpdp_consent"
                    value="agreed"
                    required
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 rounded text-[#2158E0] focus:ring-[#2158E0] border-[#CBD5E1] cursor-pointer"
                  />
                  <span>
                    I consent to MyZkool contacting our school representative on WhatsApp/call in accordance with India's <strong>DPDP Act, 2023</strong> and the{" "}
                    {onOpenPrivacy ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onOpenPrivacy();
                        }}
                        className="text-[#2158E0] underline font-semibold cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                    ) : (
                      <span className="text-[#2158E0] underline font-semibold">Privacy Policy</span>
                    )}
                    .
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={status === "submitting" || !consentGiven}
                className="w-full mt-4 py-3.5 px-6 rounded-full bg-[#2158E0] hover:bg-[#1a4ec4] text-white font-bold text-sm shadow-md shadow-[#2158E0]/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? (
                  <span>Sending Demo Request to Web3Forms...</span>
                ) : (
                  <>
                    <span>Book a Free Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
