import React, { useState, useEffect } from "react";
import { X, ShieldCheck, FileText, RefreshCw, Mail, Scale, CheckCircle2 } from "lucide-react";

export type LegalDocType = "privacy" | "terms" | "refund" | "grievance";

interface LegalModalProps {
  isOpen: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, initialDoc = "privacy", onClose }) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);

  useEffect(() => {
    if (initialDoc) {
      setActiveDoc(initialDoc);
    }
  }, [initialDoc]);

  useEffect(() => {
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
      aria-labelledby="legal-modal-title"
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E6EAF3] overflow-hidden relative max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with document tabs */}
        <div className="p-5 bg-[#F8FAFC] border-b border-[#E6EAF3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 id="legal-modal-title" className="text-base font-bold font-heading text-[#141A2E]">
                Legal &amp; Compliance Center
              </h3>
              <p className="text-[11px] text-[#5B6478]">Compliant with Indian DPDP Act, 2023 &amp; IT Rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#E2E8F0] text-[#5B6478] transition-colors"
            aria-label="Close legal modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 bg-[#F8FAFC] border-b border-[#E6EAF3] flex gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveDoc("privacy")}
            className={`py-2 px-3 rounded-t-lg transition-colors whitespace-nowrap ${
              activeDoc === "privacy"
                ? "bg-white text-[#2158E0] border-t border-x border-[#E6EAF3] -mb-px"
                : "text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Privacy Policy (DPDP Act)
          </button>
          <button
            onClick={() => setActiveDoc("terms")}
            className={`py-2 px-3 rounded-t-lg transition-colors whitespace-nowrap ${
              activeDoc === "terms"
                ? "bg-white text-[#2158E0] border-t border-x border-[#E6EAF3] -mb-px"
                : "text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveDoc("refund")}
            className={`py-2 px-3 rounded-t-lg transition-colors whitespace-nowrap ${
              activeDoc === "refund"
                ? "bg-white text-[#2158E0] border-t border-x border-[#E6EAF3] -mb-px"
                : "text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Refund Policy
          </button>
          <button
            onClick={() => setActiveDoc("grievance")}
            className={`py-2 px-3 rounded-t-lg transition-colors whitespace-nowrap ${
              activeDoc === "grievance"
                ? "bg-white text-[#2158E0] border-t border-x border-[#E6EAF3] -mb-px"
                : "text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Grievance Officer
          </button>
        </div>

        {/* Scrollable Document Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#5B6478] leading-relaxed">
          {activeDoc === "privacy" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-[#141A2E] text-base mb-1">
                  Digital Personal Data Protection Policy (DPDP Act, 2023)
                </h4>
                <p className="text-xs text-[#5B6478]">Last Updated: September 2026</p>
              </div>

              <p>
                MyZkool ("we", "our", "us") values the confidentiality and trust placed by schools, educators, parents, and students. This policy outlines our obligations under India's <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and the Information Technology (Reasonable Security Practices and Procedures) Rules, 2011.
              </p>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1 text-xs text-[#141A2E]">
                <div className="font-bold text-[#2158E0]">Key Commitments:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[#5B6478]">
                  <li><strong>School-Owned Data:</strong> All student registers, fee rolls, and parent phone numbers belong strictly to the subscribing school institution.</li>
                  <li><strong>Zero Selling of Data:</strong> We never sell, monetize, or profile student records for third-party commercial advertisements.</li>
                  <li><strong>Indian Data Residency:</strong> Core databases are hosted in certified cloud regions located within the territory of India.</li>
                </ul>
              </div>

              <div>
                <h5 className="font-bold text-[#141A2E] mb-1">1. Information Collected</h5>
                <p>
                  We collect school contact information (name, phone, school affiliation) for demo requests and account configuration. For active schools, student attendance and fee registers are processed solely on behalf of the school administration as a Data Fiduciary.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-[#141A2E] mb-1">2. AI Assistant &amp; Ephemeral Document Analysis</h5>
                <p>
                  Any sample fee receipts or register images uploaded to the MyZkool AI Advisor are analyzed in-memory for instant structured extraction preview and are <strong>ephemeral</strong>: they are not retained or added to public training corpora.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-[#141A2E] mb-1">3. Data Principal Rights</h5>
                <p>
                  Under the DPDP Act, schools and parents have the right to request access, correction, or erasure of personal records by contacting the school coordinator or our Grievance Officer at <a href="mailto:khaqanbuilds@gmail.com" className="text-[#2158E0] underline font-medium">khaqanbuilds@gmail.com</a>.
                </p>
              </div>
            </div>
          )}

          {activeDoc === "terms" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-[#141A2E] text-base mb-1">
                  Master Subscription &amp; Service Agreement
                </h4>
                <p className="text-xs text-[#5B6478]">Effective for all MyZkool Partner Schools</p>
              </div>

              <div>
                <h5 className="font-bold text-[#141A2E] mb-1">1. Software-as-a-Service (SaaS) License</h5>
                <p>
                  MyZkool grants the subscribing school institution a non-exclusive, non-transferable license to access the school website builder, management ERP, and WhatsApp messaging dispatch tools according to the chosen tier (Basic, Pro, or Custom).
                </p>
              </div>

              <div>
                <h5 className="font-bold text-[#141A2E] mb-1">2. Service Level Agreement (SLA) &amp; Uptime</h5>
                <p>
                  We target 99.8% monthly uptime for school administrative portals and real-time WhatsApp notification pipelines. Scheduled maintenance is communicated at least 48 hours in advance during off-peak hours.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-[#141A2E] mb-1">3. WhatsApp Business Compliance</h5>
                <p>
                  Parent notifications must adhere to Meta / WhatsApp Business policies. Schools agree to send educational announcements, attendance, and fee alerts strictly to registered parent numbers on school rolls.
                </p>
              </div>
            </div>
          )}

          {activeDoc === "refund" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-[#141A2E] text-base mb-1">
                  Fair Billing, Refund &amp; Cancellation Policy
                </h4>
                <p className="text-xs text-[#5B6478]">Transparent guarantees for Indian schools</p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-emerald-800">30-Day Money-Back Guarantee:</span>
                <p className="text-emerald-900">
                  New schools can cancel within the first 30 days of onboarding if not completely satisfied with our platform or assisted migration, receiving a 100% full refund of subscription fees paid.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-[#141A2E] mb-1">Pro-Rata Prepaid Plan Refunds</h5>
                <p>
                  Schools selecting 6-month or 12-month prepayment may cancel early at any time. Any remaining full, unused calendar months will be refunded pro-rata to the original payment method without early termination penalties.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-[#141A2E] mb-1">Processing Time</h5>
                <p>
                  Approved refunds are credited directly back to the school's bank account or UPI source within 5 to 7 business banking days.
                </p>
              </div>
            </div>
          )}

          {activeDoc === "grievance" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-[#141A2E] text-base mb-1">
                  Statutory Grievance Redressal Officer
                </h4>
                <p className="text-xs text-[#5B6478]">In accordance with IT Rules, 2021 &amp; DPDP Act, 2023</p>
              </div>

              <p>
                If your school administration, trustee, teacher, or parent has questions, data concerns, or requests regarding personal information handled through the MyZkool platform, please contact our designated Grievance Officer:
              </p>

              <div className="p-4 bg-[#F8FAFC] border border-[#E6EAF3] rounded-2xl space-y-2 text-xs">
                <div><strong>Designation:</strong> Chief Grievance &amp; Data Protection Officer</div>
                <div><strong>Name:</strong> R. K. Saxena</div>
                <div><strong>Address:</strong> MyZkool Technologies, Gomti Nagar, Lucknow, Uttar Pradesh - 226010, India</div>
                <div>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:khaqanbuilds@gmail.com" className="text-[#2158E0] font-semibold underline">
                    khaqanbuilds@gmail.com
                  </a>
                </div>
                <div>
                  <strong>Direct WhatsApp:</strong>{" "}
                  <a href="https://wa.me/919555954854" target="_blank" rel="noreferrer" className="text-[#1FAE7A] font-semibold underline">
                    +91 95559 54854
                  </a>
                </div>
                <div><strong>Turnaround Time:</strong> Written acknowledgment within 24 hours; resolution within 15 working days.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E6EAF3] flex items-center justify-between">
          <span className="text-[11px] text-[#5B6478]">© 2024 - 2026 MyZkool Technologies. All rights reserved.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#2158E0] hover:bg-[#1a4ec4] text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
