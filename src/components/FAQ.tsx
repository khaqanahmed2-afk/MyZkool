import React, { useState } from "react";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";
import { FAQItem } from "../types";

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: "Do we need an IT person to set this up?",
      answer: "No. Our team sets up your website and ERP with you during onboarding. We train your administrative staff, configure your fee heads, and get your classes running smoothly without requiring technical staff.",
    },
    {
      question: "Will parents need to download an app?",
      answer: "No. All parent communication works over WhatsApp, which they already use. Fee reminders, attendance notices, and student report cards arrive in their existing chat window with instant open rates.",
    },
    {
      question: "Can we move our existing student data in?",
      answer: "Yes. Our onboarding team helps migrate student, fee and attendance records from your current registers or spreadsheets. You can share your Excel files or physical registers and we handle the data formatting.",
    },
    {
      question: "Is our school's data secure?",
      answer: "Yes. Data is access-controlled by role, so only authorized staff see what they should. Teachers only access their assigned classes, accountants handle fee books, and principals maintain total oversight.",
    },
  ];

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-[#F6F8FC] border-b border-[#E6EAF3]" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#2158E0] text-xs font-bold tracking-wide uppercase mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-[#141A2E] tracking-tight">
            Common Questions from School Principals
          </h2>
          <p className="mt-3 text-base text-[#5B6478]">
            Clear, honest answers about moving your school's operations to MyZkool.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E6EAF3] overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-[#FAFBFD] transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="font-heading font-bold text-base sm:text-lg text-[#141A2E]">
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#141A2E] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 bg-blue-50 text-[#2158E0]" : ""}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-sm sm:text-base text-[#5B6478] leading-relaxed border-t border-[#F1F5F9] pt-4 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions WhatsApp prompt */}
        <div className="mt-10 p-5 rounded-2xl bg-white border border-[#E6EAF3] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#1FAE7A] flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#141A2E]">Have a question specific to your school board?</div>
              <div className="text-xs text-[#5B6478]">Our school specialists are available on WhatsApp for direct answers.</div>
            </div>
          </div>
          <a
            href="https://wa.me/919555954854?text=Hi%2C%20I%20have%20a%20question%20regarding%20our%20school%20setup%20on%20MyZkool"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-full bg-[#1FAE7A] hover:bg-[#199468] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            Chat with an Advisor
          </a>
        </div>

      </div>
    </section>
  );
};
