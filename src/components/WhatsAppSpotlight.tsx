import React from "react";
import { CheckCheck, MessageSquare, ShieldCheck, ArrowRight, Bell, Smartphone, Sparkles, Send } from "lucide-react";

interface WhatsAppSpotlightProps {
  onOpenDemo: () => void;
}

export const WhatsAppSpotlight: React.FC<WhatsAppSpotlightProps> = ({ onOpenDemo }) => {
  return (
    <section className="py-20 lg:py-24 bg-[#2158E0] text-white relative overflow-hidden" id="whatsapp-spotlight">
      {/* Subtle background glow circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#1FAE7A]/20 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Copy & Value Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-[#1FAE7A]" />
              <span>The Parent Engagement Advantage</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-white leading-tight">
              Built WhatsApp-First, Not as an Afterthought
            </h2>

            <p className="text-base sm:text-lg text-blue-100 leading-relaxed">
              No new app for parents to download or forget about. Fee reminders, attendance alerts and school notices go straight to WhatsApp: the one place every parent already checks, every day.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-emerald-300">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base text-blue-50 font-medium">
                  <strong>Zero Parent Training:</strong> Parents don't need logins or passwords.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-emerald-300">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base text-blue-50 font-medium">
                  <strong>One-Click UPI Fee Payments:</strong> Instant receipts issued on WhatsApp.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-emerald-300">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base text-blue-50 font-medium">
                  <strong>98.4% Open Rates:</strong> Urgent bus delay or weather notices seen immediately.
                </span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onOpenDemo}
                className="px-7 py-3.5 text-sm sm:text-base font-semibold text-[#141A2E] bg-white hover:bg-neutral-100 rounded-full shadow-lg shadow-black/10 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Experience the WhatsApp Flow</span>
                <ArrowRight className="w-4 h-4 text-[#2158E0]" />
              </button>
            </div>
          </div>

          {/* Right Column: Realistic Phone Chat Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-sm sm:max-w-md bg-[#121B22] rounded-[36px] p-3 shadow-2xl shadow-black/40 border-4 border-white/20 relative">
              {/* Phone Speaker Notch */}
              <div className="w-32 h-4 bg-[#1F2C34] rounded-full mx-auto mb-2" />

              {/* WhatsApp Interface */}
              <div className="bg-[#ECE5DD] rounded-[26px] overflow-hidden text-[#111B21] flex flex-col min-h-[500px]">
                {/* Chat Top Bar */}
                <div className="bg-[#008069] text-white p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-white text-[#008069] font-bold text-sm flex items-center justify-center font-heading">
                      SM
                    </div>
                    <div>
                      <div className="text-sm font-bold leading-tight flex items-center gap-1.5">
                        <span>St. Mary's Academy</span>
                        <span className="w-3.5 h-3.5 rounded-full bg-[#25D366] text-white text-[9px] flex items-center justify-center font-bold">✓</span>
                      </div>
                      <div className="text-[11px] text-emerald-100">Official School Channel • WhatsApp Verified</div>
                    </div>
                  </div>
                  <div className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-medium">
                    Automated ERP
                  </div>
                </div>

                {/* Chat Message Bubble Feed */}
                <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
                  
                  {/* Bubble 1: Attendance Alert */}
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[92%] border border-black/5">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-semibold mb-1">
                      <span>Daily Attendance Alert</span>
                      <span>08:15 AM</span>
                    </div>
                    <p className="text-xs text-[#141A2E] leading-relaxed">
                      Dear Mr. Sharma, your child <strong>Aarav Sharma (Class 7-B)</strong> was marked <strong>Present</strong> today at 08:14 AM.
                    </p>
                    <div className="mt-1 text-[10px] text-emerald-700 font-medium">
                      ✓ School gate recorded
                    </div>
                  </div>

                  {/* Bubble 2: Fee Reminder with UPI Link */}
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[92%] border border-black/5">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-semibold mb-1">
                      <span>Quarter 2 Fee Notice</span>
                      <span>09:30 AM</span>
                    </div>
                    <p className="text-xs text-[#141A2E] leading-relaxed">
                      Quarter 2 fee for <strong>Aarav</strong> is due on <strong>20th September</strong>.
                    </p>
                    <div className="my-2 p-2.5 bg-blue-50/80 rounded-xl border border-blue-100 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-[#5B6478]">Amount Due</div>
                        <div className="text-sm font-bold text-[#141A2E]">₹4,500</div>
                      </div>
                      <span className="text-[11px] font-bold text-white bg-[#2158E0] px-3 py-1 rounded-full shadow-xs">
                        Pay via UPI
                      </span>
                    </div>
                    <div className="text-[9px] text-[#5B6478]">
                      Supports Google Pay, PhonePe, Paytm &amp; NetBanking.
                    </div>
                  </div>

                  {/* Bubble 3: Parent Response */}
                  <div className="bg-[#D9FDD3] p-2.5 rounded-2xl rounded-tr-none shadow-sm ml-auto max-w-[82%] border border-black/5">
                    <p className="text-xs text-[#111B21]">
                      Paid, thank you! Please send receipt.
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-[#667781]">09:35 AM</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" />
                    </div>
                  </div>

                  {/* Bubble 4: PTM Notice & Auto-Receipt */}
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[92%] border border-black/5">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-semibold mb-1">
                      <span>PTM Notice &amp; Receipt</span>
                      <span>09:36 AM</span>
                    </div>
                    <p className="text-xs text-[#141A2E] leading-relaxed">
                      Receipt <strong>#REC-88219</strong> generated. Also, reminder for <strong>Parent-Teacher Meeting (PTM)</strong> this Saturday, 10:00 AM.
                    </p>
                    <div className="mt-2 text-[10px] text-[#2158E0] font-semibold flex items-center gap-1">
                      <span>Tap to download PDF receipt</span>
                    </div>
                  </div>

                </div>

                {/* Chat Input Bar Mock */}
                <div className="bg-[#F0F2F5] p-2 flex items-center gap-2 border-t border-black/5">
                  <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-neutral-400">
                    Type a message...
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#008069] text-white flex items-center justify-center">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
