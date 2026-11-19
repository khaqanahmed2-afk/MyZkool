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
  scale,
}) => {
  // Default to side-by-side view to match reference designs
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [viewMode, setViewMode] = useState<"flip" | "both">("both");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  
  // Dynamic scale default: 1.55 for side-by-side, 1.75 for single card
  const defaultScale = scale ?? (viewMode === "both" ? 1.55 : 1.75);
  const [currentScale, setCurrentScale] = useState<number>(defaultScale);

  // When viewMode changes, adapt scale if not explicitly locked by parent
  useEffect(() => {
    if (!scale) {
      setCurrentScale(viewMode === "both" ? 1.55 : 1.75);
    }
  }, [viewMode, scale]);

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
              onClick={() => setCurrentScale((s) => Math.max(0.9, parseFloat((s - 0.15).toFixed(2))))}
              className="p-1 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-2 text-slate-700 font-bold min-w-[38px] text-center">
              {Math.round(currentScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setCurrentScale((s) => Math.min(2.2, parseFloat((s + 0.15).toFixed(2))))}
              className="p-1 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentScale(viewMode === "both" ? 1.55 : 1.75)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer border-l border-slate-200 ml-0.5"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
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
      <div
        id="id-card-preview-viewport"
        className="w-full flex items-center justify-center p-6 sm:p-8 bg-slate-100/80 rounded-2xl border border-dashed border-slate-300/80 overflow-x-auto shadow-inner"
        style={{
          minHeight: `${Math.max(540, Math.round(365 * currentScale + 40))}px`,
        }}
      >
        {viewMode === "both" ? (
          <div
            className="flex items-center gap-10 sm:gap-14 transition-transform duration-200 origin-center justify-center flex-wrap py-2"
            style={{
              transform: `scale(${currentScale})`,
              transformOrigin: "center center",
            }}
          >
            {/* Front Card */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-[5mm] shadow-2xl overflow-hidden bg-white hover:shadow-3xl transition-shadow"
                style={{
                  width: "54mm",
                  height: "86mm",
                  boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)",
                }}
              >
                <ThemeComponent
                  card={card}
                  customization={customization}
                  side="front"
                  qrDataUrl={qrDataUrl}
                />
              </div>
              <span className="text-[10px] font-black text-slate-500 mt-3 font-mono uppercase tracking-[0.2em]">
                CR80 FRONT • 54 × 86 MM
              </span>
            </div>

            {/* Back Card */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-[5mm] shadow-2xl overflow-hidden bg-white hover:shadow-3xl transition-shadow"
                style={{
                  width: "54mm",
                  height: "86mm",
                  boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)",
                }}
              >
                <ThemeComponent
                  card={card}
                  customization={customization}
                  side="back"
                  qrDataUrl={qrDataUrl}
                />
              </div>
              <span className="text-[10px] font-black text-slate-500 mt-3 font-mono uppercase tracking-[0.2em]">
                CR80 BACK • 54 × 86 MM
              </span>
            </div>
          </div>
        ) : (
          <div
            className="transition-transform duration-200 origin-center flex flex-col items-center py-6"
            style={{
              transform: `scale(${currentScale})`,
            }}
          >
            <div
              className="rounded-[5mm] shadow-2xl overflow-hidden bg-white hover:shadow-3xl transition-shadow"
              style={{
                width: "54mm",
                height: "86mm",
                boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)",
              }}
            >
              <ThemeComponent
                card={card}
                customization={customization}
                side={activeSide}
                qrDataUrl={qrDataUrl}
              />
            </div>
            <p className="text-center text-[10px] font-black text-slate-500 mt-3 font-mono uppercase tracking-[0.2em]">
              CR80 {activeSide.toUpperCase()} • 54 × 86 MM
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
