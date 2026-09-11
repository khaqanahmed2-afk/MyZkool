import React from "react";
import { Mail, MessageSquare, Phone, MapPin, Heart, ShieldCheck, Instagram } from "lucide-react";
import { LegalDocType } from "./LegalModal";
import { MyZkoolLogo } from "./MyZkoolLogo";

interface FooterProps {
  onOpenLegal?: (doc: LegalDocType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  return (
    <footer className="bg-white border-t border-[#E6EAF3] pt-16 pb-12 text-[#5B6478]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#E6EAF3]">
          
          {/* Brand Col (2 cols wide on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <MyZkoolLogo size={42} showText={true} />
            
            <p className="text-sm text-[#5B6478] leading-relaxed max-w-sm">
              One platform for your school's website, ERP and parent communication. Designed for schools across India.
            </p>

            <div className="text-xs text-[#5B6478] pt-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2158E0] shrink-0" />
                <span className="font-medium text-[#141A2E]">Based in Lucknow, Uttar Pradesh, India</span>
              </div>
              <p className="text-[11px] text-[#5B6478] pl-5">
                MyZkool Technologies • Lucknow, Uttar Pradesh
              </p>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-heading font-bold text-sm text-[#141A2E] tracking-wider uppercase mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#features" className="hover:text-[#2158E0] transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#2158E0] transition-colors">
                  Pricing &amp; Plans
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#2158E0] transition-colors">
                  How it Works
                </a>
              </li>
              <li>
                <a href="#roadmap" className="hover:text-[#2158E0] transition-colors">
                  Product Roadmap
                </a>
              </li>
              <li>
                <a href="#comparison-table" className="hover:text-[#2158E0] transition-colors">
                  Feature Comparison
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Trust Column */}
          <div>
            <h4 className="font-heading font-bold text-sm text-[#141A2E] tracking-wider uppercase mb-4">
              Legal &amp; Trust
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal?.("privacy")}
                  className="hover:text-[#2158E0] transition-colors cursor-pointer text-left"
                >
                  Privacy Policy (DPDP Act)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal?.("terms")}
                  className="hover:text-[#2158E0] transition-colors cursor-pointer text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal?.("refund")}
                  className="hover:text-[#2158E0] transition-colors cursor-pointer text-left"
                >
                  Refund &amp; Cancellation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal?.("grievance")}
                  className="hover:text-[#2158E0] transition-colors cursor-pointer text-left flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Grievance Officer (Lucknow)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Get in Touch Column */}
          <div>
            <h4 className="font-heading font-bold text-sm text-[#141A2E] tracking-wider uppercase mb-4">
              Get in Touch
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://wa.me/919555954854?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20MyZkool"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>+91 95559 54854</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:khaqanbuilds@gmail.com"
                  className="inline-flex items-center gap-2 text-[#141A2E] hover:text-[#2158E0] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#5B6478] shrink-0" />
                  <span>khaqanbuilds@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/myzkool"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors font-medium"
                >
                  <Instagram className="w-4 h-4 shrink-0" />
                  <span>@myzkool</span>
                </a>
              </li>
              <li>
                <div className="text-xs text-[#5B6478]">
                  Support Hours: Mon to Sat, 8:00 AM to 7:00 PM IST
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5B6478]">
          <p>© 2024 - 2026 MyZkool Technologies. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => onOpenLegal?.("privacy")} className="hover:underline cursor-pointer">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => onOpenLegal?.("terms")} className="hover:underline cursor-pointer">Terms</button>
            <span>•</span>
            <button onClick={() => onOpenLegal?.("refund")} className="hover:underline cursor-pointer">Refunds</button>
            <span>•</span>
            <button onClick={() => onOpenLegal?.("grievance")} className="hover:underline cursor-pointer">Grievance Officer</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
