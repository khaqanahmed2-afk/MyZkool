import React from "react";
import { ChevronsRight, Building2, User } from "lucide-react";
import { IdCardThemeProps } from "../types";
import { BarcodeSvg } from "../BarcodeSvg";

export const ModernBlueYellowTheme: React.FC<IdCardThemeProps> = ({
  card,
  customization,
  side,
  qrDataUrl,
  isPrint = false,
}) => {
  const primaryColor = customization.primaryColor || "#1D4ED8"; // Royal Blue
  const secondaryColor = customization.secondaryColor || "#FBBF24"; // Warm Sunny Yellow

  const schoolName = customization.schoolNameOverride || card.school_name || "School name unavailable";
  const session = customization.sessionOverride || card.academic_session || "2026–27";
  const initials = `${card.first_name?.[0] || ""}${card.last_name?.[0] || ""}`.toUpperCase() || "ST";

  // Display card code formatted like MZK-2026-0142
  const cardCode = card.admission_no
    ? card.admission_no.replace("ADM-", "MZK-")
    : "MZK-2026-0142";
  const usesBlueContactPanel = customization.themeId === "minimal_blue_white";

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
        {/* TOP SECTION: Royal Blue with Dotted Pattern & Curves */}
        <div className="relative w-full h-[37mm] shrink-0" style={dottedBackgroundStyle}>
          {/* Lanyard Slot Cutout Indicator at top center */}
          <div className="pt-1.5 flex justify-center">
            <div className="w-[13mm] h-[2.5mm] rounded-full bg-white/95 border border-black/10 flex items-center justify-center shadow-xs">
              <div className="w-[9mm] h-[1.2mm] rounded-full bg-slate-300/70" />
            </div>
          </div>

          {/* Yellow decorative semi-circle on the left */}
          <div
            className="absolute left-[-5mm] top-[14mm] w-[15mm] h-[15mm] rounded-full pointer-events-none z-0"
            style={{ backgroundColor: secondaryColor }}
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
              <span
                className="text-[6.5px] font-bold block leading-tight tracking-wide"
                style={{ color: secondaryColor }}
              >
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

          {/* STUDENT PHOTOGRAPH: Centered with Yellow Offset Decorative Shadow */}
          {customization.showStudentPhoto && (
            <div className="absolute left-1/2 -translate-x-1/2 top-[15mm] z-20">
              {/* Offset Yellow Shadow Shape behind bottom-right of photo */}
              <div
                className="absolute w-[23mm] h-[26mm] rounded-2xl pointer-events-none"
                style={{
                  backgroundColor: secondaryColor,
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

        {/* MIDDLE SECTION: Student Name, Class Badge, and 3 Info Tiles */}
        <div className="flex-1 px-3 pt-6 pb-1 flex flex-col items-center justify-start text-center">
          {/* Student Full Name */}
          <h3 className="text-[11.5px] font-black text-slate-900 tracking-tight leading-tight truncate max-w-[48mm]">
            {card.full_name}
          </h3>

          {/* Yellow Rounded Class Badge */}
          {customization.showClassSection && (
            <div className="mt-1">
              <span
                className="inline-block px-3 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider text-slate-950 shadow-2xs"
                style={{ backgroundColor: secondaryColor }}
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
              <a
                href={`/admin/students/${card.student_id}`}
                className="text-[8.5px] font-black text-slate-900 leading-tight block mt-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2158E0]"
                aria-label={`Open ${card.full_name}'s student profile`}
              >
                {card.admission_no.replace(/[^0-9]/g, "").slice(-4) || "0142"}
              </a>
            </div>
          </div>

          <div className="w-full mt-2 grid grid-cols-2 gap-2 text-left">
            <div>
              <span className="text-[5.5px] font-bold text-slate-400 block">Date of birth</span>
              <span className="text-[6.8px] font-bold text-slate-700 block">
                {card.dob ? new Date(card.dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not available"}
              </span>
            </div>
            <div>
              <span className="text-[5.5px] font-bold text-slate-400 block">Admission date</span>
              <span className="text-[6.8px] font-bold text-slate-700 block">
                {card.admission_date ? new Date(card.admission_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Not available"}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Dedicated Blue Verification Panel with QR Code */}
        <div
          className="relative px-2.5 py-1.5 flex items-center justify-between text-white shrink-0 border-t-2"
          style={{
            backgroundColor: primaryColor,
            borderTopColor: secondaryColor,
          }}
        >
          <a
            href={`/admin/students/${card.student_id}`}
            className="w-full text-center font-mono text-[9px] font-black tracking-wider text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Open ${card.full_name}'s student profile`}
          >
            {card.admission_no}
          </a>
        </div>
      </div>
    );
  }

  // ==========================================
  // BACK SIDE OF THEME 1 (Modern Blue & Yellow)
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

      {/* MIDDLE BODY */}
      <div className="flex-1 px-3 py-1 flex flex-col justify-between text-center">
        {/* Return Address Instructions */}
        <div className="text-[6px] text-slate-500 leading-snug">
          <p className="text-slate-400 italic">If found, please return to</p>
          <p className="font-semibold text-slate-700 truncate">{card.school_address?.split(",")?.[0] || "[School address line]"}</p>
          <p className="font-semibold text-slate-700 truncate">{card.school_address?.split(",")?.slice(1)?.join(",")?.trim() || "[City, State, PIN]"}</p>
          <p className="text-[5.5px] font-mono text-slate-500 mt-0.5">
            {card.school_phone} | {card.school_email}
          </p>
        </div>

        {/* Highlighted Yellow Emergency Contact Card */}
        <div
          className="p-1.5 rounded-xl border text-left leading-snug"
          style={{
            backgroundColor: usesBlueContactPanel ? "#DBEAFE" : "#FEF3C7",
            borderColor: usesBlueContactPanel ? "#BFDBFE" : "#FDE68A",
          }}
        >
          <span
            className="text-[5.5px] font-extrabold uppercase tracking-widest block mb-0.5"
              style={{ color: usesBlueContactPanel ? "#2158E0" : "#B45309" }}
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

        {/* Large Barcode Section */}
        {customization.showBarcode && (
          <div className="flex flex-col items-center justify-center pt-0.5">
            <BarcodeSvg
              value={cardCode}
              width={140}
              height={22}
              showText={false}
            />
            <span className="font-mono text-[6.5px] font-bold text-slate-700 tracking-widest mt-0.5">
              {cardCode}
            </span>
          </div>
        )}
      </div>

      {/* BOTTOM YELLOW DISCLAIMER STRIP */}
      <div
        className="py-1 px-2 text-center shrink-0"
        style={{ backgroundColor: secondaryColor }}
      >
        <span className="text-[6px] font-black text-slate-950 uppercase tracking-tight block">
          Property of the school. Not transferable.
        </span>
      </div>
    </div>
  );
};
