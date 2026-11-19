import React from "react";
import { User, Phone, Home, MapPin } from "lucide-react";
import { IdCardThemeProps, formatClassLabel } from "../types";
import { BarcodeSvg } from "../BarcodeSvg";

export const ModernBlueYellowTheme: React.FC<IdCardThemeProps> = ({
  card,
  customization,
  side,
  isPrint = false,
}) => {
  const primaryColor = customization.primaryColor || "#0F2C59"; // Deep Navy Blue
  const secondaryColor = customization.secondaryColor || "#FBBF24"; // Bright Sunny Yellow

  const schoolName = customization.schoolNameOverride || card.school_name || "Peace Convent School";
  const schoolLocation = customization.schoolLocationOverride || card.school_location || "MAWAI, AYODHYA, UTTAR PRADESH";
  const session = customization.sessionOverride || card.academic_session || "2026–27";

  // Card identifier formatted like MZK-2026-0101
  const cardCode = card.admission_no
    ? card.admission_no.replace("ADM-", "MZK-")
    : "MZK-2026-0101";

  // Dotted pattern style for header
  const dottedBackgroundStyle: React.CSSProperties = {
    backgroundColor: primaryColor,
    backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.28) 1.1px, transparent 1.1px)",
    backgroundSize: "4.5px 4.5px",
  };

  const fatherName = card.father_name || card.guardian_name || "Zuber Ahmad";
  const contactNo = card.contact_no || card.guardian_phone || "8953572872";

  // Format Class Label without duplication (e.g. "CLASS 11 – SCIENCE")
  const classLabel = formatClassLabel(card.class_name, card.section_name);

  // Address formatting & splitting for back side
  const permAddr =
    card.permanent_address ||
    card.student_address ||
    "Village Mawai, Post Mawai, District Ayodhya, Uttar Pradesh – 224117";
  const permAddrParts = permAddr.split(",").map((p) => p.trim()).filter(Boolean);
  let permAddressLine1 = "Village Mawai, Post Mawai,";
  let permAddressLine2 = "District Ayodhya, Uttar Pradesh – 224117";

  if (permAddrParts.length >= 3) {
    permAddressLine1 = permAddrParts.slice(0, 2).join(", ") + ",";
    permAddressLine2 = permAddrParts.slice(2).join(", ");
  } else if (permAddrParts.length === 2) {
    permAddressLine1 = permAddrParts[0] + ",";
    permAddressLine2 = permAddrParts[1];
  } else if (permAddrParts.length === 1) {
    permAddressLine1 = permAddrParts[0];
    permAddressLine2 = "";
  }

  // School address lines
  const schoolAddrParts = (card.school_address || "Behind Abdul Hameed Memorial Inter College, Mawai, Ayodhya, Uttar Pradesh – 224117, India")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const schoolAddressLine1 = schoolAddrParts[0] || "Behind Abdul Hameed Memorial Inter College";
  const schoolAddressLine2 = schoolAddrParts.slice(1).join(", ") || "Mawai, Ayodhya, Uttar Pradesh – 224117";

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
        {/* TOP SECTION: Deep Navy Blue with Dotted Pattern & Curves (Height: 29mm) */}
        <div className="relative w-full h-[29mm] shrink-0" style={dottedBackgroundStyle}>
          {/* Lanyard Slot Cutout Indicator at top center */}
          <div className="pt-1.5 flex justify-center">
            <div className="w-[12mm] h-[2.4mm] rounded-full bg-white/95 border border-black/10 flex items-center justify-center shadow-xs">
              <div className="w-[8.5mm] h-[1.2mm] rounded-full bg-slate-300/70" />
            </div>
          </div>

          {/* Yellow decorative circular shape on the left */}
          <div
            className="absolute left-[-7mm] top-[11mm] w-[17mm] h-[17mm] rounded-full pointer-events-none z-0"
            style={{ backgroundColor: secondaryColor }}
          />

          {/* School Brand: Logo + Divider + Name + Location */}
          <div className="relative z-10 px-2.5 pt-1 flex items-center">
            {customization.showSchoolLogo && (
              <div className="w-8 h-8 rounded-full bg-white shadow-xs p-0.5 shrink-0 flex items-center justify-center border border-white/70">
                {card.school_logo_url ? (
                  <img
                    src={card.school_logo_url}
                    alt="Logo"
                    className="w-full h-full object-contain rounded-full"
                  />
                ) : (
                  <span className="text-[7.5px] font-black text-slate-800 tracking-tight">PEACE</span>
                )}
              </div>
            )}

            {/* Vertical White Divider */}
            <div className="w-[1.2px] h-7 bg-white/70 mx-2 shrink-0" />

            <div className="min-w-0 flex-1 leading-tight">
              <h2 className="text-[9.5px] font-black text-white tracking-tight uppercase leading-snug truncate">
                {schoolName}
              </h2>
              {customization.showSchoolLocation && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 shrink-0 text-amber-300" style={{ color: secondaryColor }} />
                  <span
                    className="text-[6.2px] font-extrabold uppercase tracking-wide truncate text-amber-200"
                    style={{ color: "#FEF3C7" }}
                  >
                    {schoolLocation}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Curved Wave Cutout framing the photo */}
          <svg
            className="absolute bottom-0 left-0 w-full h-[11mm] pointer-events-none z-0"
            viewBox="0 0 100 35"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 Q50,38 100,0 L100,35 L0,35 Z"
              fill="#FFFFFF"
            />
          </svg>

          {/* STUDENT PHOTOGRAPH: Centered with Yellow Offset Decorative Shadow */}
          {customization.showStudentPhoto && (
            <div className="absolute left-1/2 -translate-x-1/2 top-[13.5mm] z-20">
              {/* Offset Yellow Shadow Shape behind bottom-right of photo */}
              <div
                className="absolute w-[22mm] h-[24.5mm] rounded-2xl pointer-events-none"
                style={{
                  backgroundColor: secondaryColor,
                  top: "2.5px",
                  left: "2.5px",
                }}
              />

              {/* Foreground Photo Frame */}
              <div className="relative w-[22mm] h-[24.5mm] rounded-2xl border-[2.8px] border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                {card.photo_url ? (
                  <img
                    src={card.photo_url}
                    alt={card.full_name}
                    className="w-full h-full object-cover object-center"
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

        {/* MIDDLE SECTION: Content begins at 40mm (2mm clearance below photo) */}
        <div className="flex-1 px-3 pt-[11mm] pb-0 flex flex-col items-center justify-between text-center">
          <div className="w-full flex flex-col items-center">
            {/* Student Full Name: Prominent, Centered, Completely Visible */}
            <h3 className="text-[12.5px] font-black text-slate-900 tracking-tight leading-tight truncate max-w-[48mm]">
              {card.full_name}
            </h3>

            {/* Yellow Rounded Class Badge: "CLASS 11 – SCIENCE" (No duplication) */}
            {customization.showClassSection && (
              <div className="mt-1.5">
                <span
                  className="inline-block px-3.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider text-slate-950 shadow-2xs"
                  style={{ backgroundColor: secondaryColor }}
                >
                  {classLabel}
                </span>
              </div>
            )}

            {/* Father Name and Contact Number Rows */}
            <div className="w-full max-w-[47mm] mt-2 space-y-1 px-0.5">
              {customization.showFatherName && (
                <div className="flex items-center text-left py-0.5">
                  <div className="w-3.5 flex justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                  <div className="w-[1px] h-3.5 bg-slate-300 mx-1.5 shrink-0" />
                  <span className="text-[7.6px] font-bold text-slate-700 shrink-0">Father Name&nbsp;&nbsp;:</span>
                  <span className="text-[7.8px] font-extrabold text-slate-900 ml-1.5 truncate flex-1">
                    {fatherName}
                  </span>
                </div>
              )}

              {customization.showContactNo && (
                <div className="flex items-center text-left py-0.5">
                  <div className="w-3.5 flex justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                  <div className="w-[1px] h-3.5 bg-slate-300 mx-1.5 shrink-0" />
                  <span className="text-[7.6px] font-bold text-slate-700 shrink-0">Contact No.&nbsp;&nbsp;:</span>
                  <span className="font-mono text-[7.8px] font-extrabold text-slate-900 ml-1.5 truncate flex-1">
                    {contactNo}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Barcode on the Front */}
          {customization.showBarcode && (
            <div className="w-full flex flex-col items-center justify-center pt-0.5 pb-1">
              <div className="w-full border-t border-slate-200 mb-1" />
              <BarcodeSvg
                value={cardCode}
                width={145}
                height={20}
                showText={false}
              />
              {customization.showStudentId && (
                <span className="font-mono text-[7.2px] font-extrabold text-slate-800 tracking-[0.22em] mt-0.5">
                  {cardCode}
                </span>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Accent Line & Solid Navy Blue Block */}
        <div className="w-full shrink-0">
          <div className="w-full h-[1.5px]" style={{ backgroundColor: secondaryColor }} />
          <div className="w-full h-[5.5mm]" style={{ backgroundColor: primaryColor }} />
        </div>
      </div>
    );
  }

  // ==========================================
  // BACK SIDE OF THEME 1 (Modern Bold Blue & Yellow)
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
      {/* TOP SECTION: Blue Curved Header with Centered Logo & Title */}
      <div className="relative w-full h-[24mm] shrink-0" style={dottedBackgroundStyle}>
        {/* Lanyard slot */}
        <div className="pt-1.5 flex justify-center">
          <div className="w-[12mm] h-[2.4mm] rounded-full bg-white/95 border border-black/10 flex items-center justify-center shadow-xs">
            <div className="w-[8.5mm] h-[1.2mm] rounded-full bg-slate-300/70" />
          </div>
        </div>

        {/* Center Circular Logo */}
        <div className="relative z-10 flex flex-col items-center justify-center pt-1">
          {customization.showSchoolLogo && (
            <div className="w-8 h-8 rounded-full bg-white shadow-xs p-0.5 flex items-center justify-center border border-white/70 mb-0.5">
              {card.school_logo_url ? (
                <img
                  src={card.school_logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain rounded-full"
                />
              ) : (
                <span className="text-[7.5px] font-black text-slate-800 tracking-tight">PEACE</span>
              )}
            </div>
          )}
          <h2 className="text-[9.5px] font-black text-white uppercase tracking-tight leading-none text-center px-2 truncate max-w-[48mm]">
            {schoolName}
          </h2>
          <span className="text-[6.5px] text-blue-100 font-semibold uppercase tracking-wider block mt-0.5">
            Student identity card
          </span>
        </div>

        {/* Downward curved scoop at bottom of header */}
        <svg
          className="absolute bottom-0 left-0 w-full h-[9mm] pointer-events-none z-0"
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 Q50,30 100,0 L100,30 L0,30 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* MIDDLE BODY: Balanced Layout with Return Address & Highlighted Permanent Address */}
      <div className="flex-1 px-3.5 py-2 flex flex-col justify-around text-center">
        {/* Return Address Instructions */}
        {customization.showSchoolAddress && (
          <div className="text-[6.5px] text-slate-500 leading-snug py-1">
            <p className="text-slate-500 italic">If found, please return to</p>
            <p className="font-bold text-slate-800 truncate mt-0.5">{schoolAddressLine1}</p>
            <p className="font-bold text-slate-800 truncate">{schoolAddressLine2}</p>
            {customization.showSchoolContact && (
              <p className="text-[6.2px] font-mono font-medium text-slate-600 mt-1">
                {card.school_phone} | {card.school_email}
              </p>
            )}
          </div>
        )}

        {/* Dedicated Highlighted Permanent Address Container */}
        {customization.showPermanentAddress && (
          <div
            className="p-2.5 rounded-xl border text-left leading-snug shadow-2xs my-1"
            style={{
              backgroundColor: "#FFFBEB", // Soft Warm Cream Amber
              borderColor: "#FDE68A",
            }}
          >
            <span
              className="text-[6.2px] font-extrabold uppercase tracking-wider block mb-1"
              style={{ color: "#B45309" }}
            >
              PERMANENT ADDRESS
            </span>
            <div className="flex items-center gap-1.5">
              <Home className="w-4 h-4 shrink-0 text-amber-700" />
              <div className="w-[1px] h-6 bg-amber-300 mx-1 shrink-0" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[7.8px] font-extrabold text-slate-900 leading-tight">
                  {permAddressLine1}
                </p>
                {permAddressLine2 && (
                  <p className="text-[7.8px] font-extrabold text-slate-800 leading-tight mt-0.5">
                    {permAddressLine2}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM YELLOW DISCLAIMER STRIP */}
      <div
        className="py-1.5 px-2 text-center shrink-0"
        style={{ backgroundColor: secondaryColor }}
      >
        <span className="text-[6.2px] font-black text-slate-950 uppercase tracking-tight block">
          {customization.disclaimerText || "PROPERTY OF THE SCHOOL. NOT TRANSFERABLE."}
        </span>
      </div>
    </div>
  );
};
