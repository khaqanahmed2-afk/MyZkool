import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Palette,
  Check,
} from "lucide-react";
import { EnrichedStudentIdCard, IdCardCustomization, generateQrCodeDataUrl } from "../../../../services/idCardService";
import { getThemeDefinition, THEME_LIST } from "./themeRegistry";

interface IdCardPreviewProps {
  card: EnrichedStudentIdCard;
  customization: IdCardCustomization;
  onCustomizationChange?: (updated: Partial<IdCardCustomization>) => void;
  onOpenStatusModal?: (card: EnrichedStudentIdCard) => void;
  scale?: number;
}

export const IdCardPreview: React.FC<IdCardPreviewProps> = ({
  card,
  customization,
  onCustomizationChange,
  onOpenStatusModal,
  scale = 1.15,
}) => {
  // Default to side-by-side view to match reference designs
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [viewMode, setViewMode] = useState<"flip" | "both">("both");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [currentScale, setCurrentScale] = useState<number>(scale);

  // Generate QR code for this specific card's unique verification URL
  useEffect(() => {
    let isCurrent = true;
    if (card.verification_url) {
      generateQrCodeDataUrl(card.verification_url).then((url) => {
        if (isCurrent) setQrDataUrl(url);
      });
    }
    return () => {
      isCurrent = false;
    };
  }, [card.verification_url]);

  const themeDef = getThemeDefinition(customization.themeId);
  const ThemeComponent = themeDef.Component;

  const isRevoked = card.card_status === "revoked";
  const isInactive = card.card_status === "inactive";

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Preview Controls Bar */}
      <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80 gap-3 flex-wrap">
        {/* Interactive Theme Selector Tabs with Color Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {THEME_LIST.map((th) => {
              const isSelected = customization.themeId === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => onCustomizationChange?.({ themeId: th.id })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: th.defaultPrimaryColor }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: th.defaultSecondaryColor }}
                    />
                  </div>
                  <span>{th.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Side Selector Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("both")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "both"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3 h-3" />
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("flip");
                setActiveSide("front");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "flip" && activeSide === "front"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("flip");
                setActiveSide("back");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "flip" && activeSide === "back"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Back
            </button>
          </div>

          {/* Scale Buttons */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentScale((s) => Math.max(0.85, s - 0.15))}
              className="p-1 text-slate-500 hover:text-slate-800 rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-slate-600 font-medium">
              {Math.round(currentScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setCurrentScale((s) => Math.min(1.6, s + 0.15))}
              className="p-1 text-slate-500 hover:text-slate-800 rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card status trigger */}
          <button
            type="button"
            onClick={() => onOpenStatusModal?.(card)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
              isRevoked
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                : isInactive
                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            }`}
            title="Click to manage card status"
          >
            {isRevoked ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span className="capitalize">{card.card_status}</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container with CR80 Standard Proportions */}
      <div className="w-full flex items-center justify-center p-4 sm:p-8 min-h-[440px] bg-slate-100/70 rounded-2xl border border-dashed border-slate-200 overflow-x-auto">
        {viewMode === "both" ? (
          <div
            className="flex items-center gap-8 transition-transform duration-200 origin-center justify-center flex-wrap"
            style={{
              transform: `scale(${currentScale})`,
            }}
          >
            {/* Front Card */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-[5mm] shadow-2xl overflow-hidden bg-white hover:shadow-3xl transition-shadow"
                style={{
                  width: "54mm",
                  height: "86mm",
                  boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                }}
              >
                <ThemeComponent
                  card={card}
                  customization={customization}
                  side="front"
                  qrDataUrl={qrDataUrl}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-2 font-mono uppercase tracking-wider">
                CR80 Front • 54 × 86 mm
              </span>
            </div>

            {/* Back Card */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-[5mm] shadow-2xl overflow-hidden bg-white hover:shadow-3xl transition-shadow"
                style={{
                  width: "54mm",
                  height: "86mm",
                  boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                }}
              >
                <ThemeComponent
                  card={card}
                  customization={customization}
                  side="back"
                  qrDataUrl={qrDataUrl}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-2 font-mono uppercase tracking-wider">
                CR80 Back • 54 × 86 mm
              </span>
            </div>
          </div>
        ) : (
          <div
            className="transition-transform duration-200 origin-center flex flex-col items-center"
            style={{
              transform: `scale(${currentScale})`,
            }}
          >
            <div
              className="rounded-[5mm] shadow-2xl overflow-hidden bg-white hover:shadow-3xl transition-shadow"
              style={{
                width: "54mm",
                height: "86mm",
                boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              }}
            >
              <ThemeComponent
                card={card}
                customization={customization}
                side={activeSide}
                qrDataUrl={qrDataUrl}
              />
            </div>
            <p className="text-center text-[10px] font-bold text-slate-400 mt-2 font-mono uppercase tracking-wider">
              CR80 Standard • 54 × 86 mm • {activeSide}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
