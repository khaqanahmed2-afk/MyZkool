import React from "react";
import { ChevronsRight, Shield, ShieldCheck, User } from "lucide-react";
import { IdCardThemeProps } from "../types";

export const MinimalBlueWhiteTheme: React.FC<IdCardThemeProps> = ({
  card,
  customization,
  side,
  qrDataUrl,
  isPrint = false,
}) => {
  const primaryColor = "#1D4ED8"; // Royal Blue
  const accentShapeColor = "#93C5FD"; // Soft Sky Blue
  const badgeBg = "#DBEAFE"; // Pastel Sky Blue

  const schoolName = customization.schoolNameOverride || card.school_name || "Green Valley Public School";
  const session = customization.sessionOverride || card.academic_session || "2026–27";
  const initials = `${card.first_name?.[0] || ""}${card.last_name?.[0] || ""}`.toUpperCase() || "ST";

  const cardCode = card.admission_no
    ? card.admission_no.replace("ADM-", "MZK-")
    : "MZK-2026-0142";

  // Dotted pattern style for header
  const dottedBackgroundStyle: React.CSSProperties = {
    backgroundColor: primaryColor,
    backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.28) 1.1px, transparent 1.1px)",
    backgroundSize: "4.5px 4.5px",
  };

  if (side === "front") {
    return (
      <div
        className="relative bg-white flex flex-col justify-between overflow-hidden select-none font-sans"
        style={{
          width: "54mm",
          height: "86mm",
          minWidth: "54mm",
          maxWidth: "54mm",
          minHeight: "86mm",
          maxHeight: "86mm",
          borderRadius: "5mm",
          boxSizing: "border-box",
        }}
      >
        {/* TOP SECTION: Royal Blue with Dotted Pattern & Soft Blue Curves */}
        <div className="relative w-full h-[37mm] shrink-0" style={dottedBackgroundStyle}>
          {/* Lanyard Slot Cutout Indicator at top center */}
          <div className="pt-1.5 flex justify-center">
            <div className="w-[13mm] h-[2.5mm] rounded-full bg-white/95 border border-black/10 flex items-center justify-center shadow-xs">
              <div className="w-[9mm] h-[1.2mm] rounded-full bg-slate-300/70" />
            </div>
          </div>

          {/* Soft Sky Blue decorative semi-circle on the left */}
          <div
            className="absolute left-[-5mm] top-[14mm] w-[15mm] h-[15mm] rounded-full pointer-events-none z-0"
            style={{ backgroundColor: accentShapeColor }}
          />

          {/* School Brand: Logo + Name + Session */}
          <div className="relative z-10 px-3 pt-1 flex items-center gap-1.5">
            {customization.showSchoolLogo && (
              <div className="w-6 h-6 rounded-full bg-white shadow-xs p-0.5 shrink-0 flex items-center justify-center border border-white/60">
                {card.school_logo_url ? (
                  <img
                    src={card.school_logo_url}
                    alt="Logo"
                    className="w-full h-full object-contain rounded-full"
                  />
                ) : (
                  <span className="text-[7.5px] font-black text-slate-800 tracking-tight">MZ</span>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <h2 className="text-[8px] font-extrabold text-white tracking-tight leading-tight truncate">
                {schoolName}
              </h2>
              <span className="text-[6.5px] font-bold block leading-tight tracking-wide text-blue-100">
                Session {session}
              </span>
            </div>
          </div>

          {/* Vertical "STUDENT ID" label on right margin */}
          <div className="absolute right-1.5 top-[8mm] bottom-[3mm] flex flex-col justify-around items-center z-10 select-none pointer-events-none">
            {["S", "T", "U", "D", "E", "N", "T", "•", "I", "D"].map((ch, idx) => (
              <span key={idx} className="text-[4.5px] font-black text-white/80 leading-none">
                {ch}
              </span>
            ))}
          </div>

          {/* Bottom Curved Wave Cutout framing the photo */}
          <svg
            className="absolute bottom-0 left-0 w-full h-[14mm] pointer-events-none z-0"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 Q50,45 100,0 L100,40 L0,40 Z"
              fill="#FFFFFF"
            />
          </svg>

          {/* STUDENT PHOTOGRAPH: Centered with Soft Blue Offset Decorative Shadow */}
          {customization.showStudentPhoto && (
            <div className="absolute left-1/2 -translate-x-1/2 top-[15mm] z-20">
              {/* Offset Sky Blue Shadow Shape behind bottom-right of photo */}
              <div
                className="absolute w-[23mm] h-[26mm] rounded-2xl pointer-events-none"
                style={{
                  backgroundColor: accentShapeColor,
                  top: "2.5px",
                  left: "2.5px",
                }}
              />

              {/* Foreground Photo Frame */}
              <div className="relative w-[23mm] h-[26mm] rounded-2xl border-[2.8px] border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                {card.photo_url ? (
                  <img
                    src={card.photo_url}
                    alt={card.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 text-blue-900">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE SECTION: Student Name, Soft Blue Class Badge, and 3 Info Tiles */}
        <div className="flex-1 px-3 pt-6 pb-1 flex flex-col items-center justify-start text-center">
          {/* Student Full Name */}
          <h3 className="text-[11.5px] font-black text-slate-900 tracking-tight leading-tight truncate max-w-[48mm]">
            {card.full_name}
          </h3>

          {/* Soft Pastel Blue Class Badge */}
          {customization.showClassSection && (
            <div className="mt-1">
              <span
                className="inline-block px-3 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider text-blue-700 shadow-2xs"
                style={{ backgroundColor: badgeBg }}
              >
                CLASS {card.class_name} {card.section_name ? `- ${card.section_name}` : ""}
              </span>
            </div>
          )}

          {/* 3 Information Tiles: ROLL NO | BLOOD | ADM NO */}
          <div className="w-full mt-2 grid grid-cols-3 gap-1 px-0.5">
            {/* Tile 1: Roll No */}
            <div className="bg-slate-100/90 rounded-lg py-1 px-0.5 text-center border border-slate-200/50">
              <span className="text-[5.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                ROLL NO
              </span>
              <span className="text-[8.5px] font-black text-slate-900 leading-tight block mt-0.5">
                {card.roll_no || "24"}
              </span>
            </div>

            {/* Tile 2: Blood Group */}
            <div className="bg-slate-100/90 rounded-lg py-1 px-0.5 text-center border border-slate-200/50">
              <span className="text-[5.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                BLOOD
              </span>
              <span className="text-[8.5px] font-black text-slate-900 leading-tight block mt-0.5">
                {card.blood_group || "B+"}
              </span>
            </div>

            {/* Tile 3: Admission No */}
            <div className="bg-slate-100/90 rounded-lg py-1 px-0.5 text-center border border-slate-200/50">
              <span className="text-[5.5px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                ADM NO
              </span>
              <span className="text-[8.5px] font-black text-slate-900 leading-tight block mt-0.5">
                {card.admission_no.replace(/[^0-9]/g, "").slice(-4) || "0142"}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Dedicated Blue Verification Panel with QR Code */}
        <div
          className="relative px-2.5 py-1.5 flex items-center justify-between text-white shrink-0 border-t-2"
          style={{
            backgroundColor: primaryColor,
            borderTopColor: accentShapeColor,
          }}
        >
          {/* White QR Container */}
          {customization.showQrCode && (
            <div className="w-[12mm] h-[12mm] rounded-lg bg-white p-0.5 flex items-center justify-center shadow-xs shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-slate-200 rounded flex items-center justify-center text-[5px] text-slate-600 font-mono">
                  QR
                </div>
              )}
            </div>
          )}

          {/* Identifier & Validity */}
          <div className="flex-1 px-2 text-left leading-tight">
            <span className="font-mono text-[8.5px] font-black tracking-wider text-white block uppercase">
              {cardCode}
            </span>
            <span className="text-[6.2px] text-blue-200 font-medium block mt-0.5">
              Valid till Mar 2027
            </span>
          </div>

          {/* Double Chevron Accent Icon */}
          <div className="shrink-0 flex items-center">
            <ChevronsRight className="w-4 h-4 text-white font-black" />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // BACK SIDE OF THEME 2 (Minimal Blue & White)
  // ==========================================
  return (
    <div
      className="relative bg-white flex flex-col justify-between overflow-hidden select-none font-sans"
      style={{
        width: "54mm",
        height: "86mm",
        minWidth: "54mm",
        maxWidth: "54mm",
        minHeight: "86mm",
        maxHeight: "86mm",
        borderRadius: "5mm",
        boxSizing: "border-box",
      }}
    >
      {/* TOP SECTION: Blue Curved Header with Logo & Title */}
      <div className="relative w-full h-[22mm] shrink-0" style={dottedBackgroundStyle}>
        {/* Lanyard slot */}
        <div className="pt-1.5 flex justify-center">
          <div className="w-[13mm] h-[2.5mm] rounded-full bg-white/95 border border-black/10 flex items-center justify-center shadow-xs">
            <div className="w-[9mm] h-[1.2mm] rounded-full bg-slate-300/70" />
          </div>
        </div>

        {/* Center Circular Logo */}
        <div className="relative z-10 flex flex-col items-center justify-center pt-0.5">
          {customization.showSchoolLogo && (
            <div className="w-6 h-6 rounded-full bg-white shadow-xs p-0.5 flex items-center justify-center border border-white/60 mb-0.5">
              {card.school_logo_url ? (
                <img
                  src={card.school_logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain rounded-full"
                />
              ) : (
                <span className="text-[7px] font-black text-slate-800 tracking-tight">MZ</span>
              )}
            </div>
          )}
          <h2 className="text-[8.5px] font-extrabold text-white uppercase tracking-tight leading-none text-center px-2 truncate max-w-[48mm]">
            {schoolName}
          </h2>
          <span className="text-[6px] text-blue-200 font-medium block mt-0.5">
            Student identity card
          </span>
        </div>

        {/* Downward curved scoop at bottom of header */}
        <svg
          className="absolute bottom-0 left-0 w-full h-[8mm] pointer-events-none z-0"
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 Q50,30 100,0 L100,30 L0,30 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* MIDDLE BODY: 2-Column Metadata Grid, Soft-Blue Emergency Box, Signatures, Verification Pill */}
      <div className="flex-1 px-3 py-1 flex flex-col justify-between text-left">
        {/* Personal Metadata: Date of Birth & Admitted On */}
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-2 pb-0.5">
            <div>
              <span className="text-[5.5px] uppercase font-bold text-slate-400 block tracking-wider">
                DATE OF BIRTH
              </span>
              <span className="text-[7.5px] font-black text-slate-800 block">
                {card.dob ? new Date(card.dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "14 Aug 2015"}
              </span>
            </div>
            <div>
              <span className="text-[5.5px] uppercase font-bold text-slate-400 block tracking-wider">
                ADMITTED ON
              </span>
              <span className="text-[7.5px] font-black text-slate-800 block">
                {card.admission_date ? new Date(card.admission_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "01 Apr 2021"}
              </span>
            </div>
          </div>

          {/* Student Address */}
          <div>
            <span className="text-[5.5px] uppercase font-bold text-slate-400 block tracking-wider">
              ADDRESS
            </span>
            <p className="text-[6.8px] font-medium text-slate-700 leading-tight line-clamp-1">
              {card.student_address?.split(",")?.slice(0, 2)?.join(",") || "[Home address line], [City]"}
            </p>
          </div>
        </div>

        {/* Highlighted Soft-Blue Emergency Contact Card */}
        <div
          className="p-1.5 rounded-xl border leading-snug"
          style={{
            backgroundColor: "#EFF6FF", // Soft Ice/Sky Blue
            borderColor: "#BFDBFE",
          }}
        >
          <span
            className="text-[5.5px] font-extrabold uppercase tracking-widest block mb-0.5"
            style={{ color: "#1D4ED8" }}
          >
            EMERGENCY CONTACT
          </span>
          <p className="text-[7.5px] font-black text-slate-900 leading-tight">
            {card.guardian_name} {card.guardian_relation ? `(${card.guardian_relation})` : "(Father)"}
          </p>
          <p className="text-[7.5px] font-mono font-bold text-slate-800 leading-tight mt-0.5">
            {card.emergency_contact || card.guardian_phone || "+91 98765 43210"}
          </p>
          {card.blood_group && (
            <p className="text-[7px] font-bold text-slate-700 mt-0.5">
              Blood group: {card.blood_group}
            </p>
          )}
        </div>

        {/* Signatures Row */}
        <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-100">
          <div className="flex flex-col items-center">
            <div className="w-14 border-b border-slate-300 mb-0.5" />
            <span className="text-[5.8px] font-semibold text-slate-500 uppercase">
              {customization.studentSignatureTitle || "Student signature"}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-14 border-b border-slate-300 mb-0.5" />
            <span className="text-[5.8px] font-bold text-slate-700 uppercase">
              {customization.principalTitle || "Principal"}
            </span>
          </div>
        </div>

        {/* Digital Verification Box with Shield Icon */}
        <div className="p-1.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 shadow-2xs">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1 leading-tight text-left">
            <span className="text-[7px] font-black text-slate-900 block leading-tight">
              Scan front QR to verify
            </span>
            <span className="text-[6px] font-mono font-bold text-slate-500 block leading-tight mt-0.5">
              {cardCode}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM SOFT BLUE DISCLAIMER STRIP */}
      <div
        className="py-1 px-2 text-center shrink-0"
        style={{ backgroundColor: badgeBg }}
      >
        <span className="text-[6px] font-black text-blue-900 uppercase tracking-tight block">
          Property of the school. Not transferable.
        </span>
      </div>
    </div>
  );
};
