import React from "react";
import { EnrichedStudentIdCard, IdCardCustomization } from "../../../../services/idCardService";
import { getThemeDefinition } from "./themeRegistry";

export type PrintLayoutMode = "side_by_side" | "front_only" | "back_only" | "duplex";

interface IdCardPrintSheetProps {
  cards: EnrichedStudentIdCard[];
  customization: IdCardCustomization;
  qrMap: Record<string, string>;
  printLayout?: PrintLayoutMode;
  showCutGuides?: boolean;
}

export const IdCardPrintSheet: React.FC<IdCardPrintSheetProps> = ({
  cards,
  customization,
  qrMap,
  printLayout = "side_by_side",
  showCutGuides = true,
}) => {
  const themeDef = getThemeDefinition(customization.themeId);
  const ThemeComponent = themeDef.Component;

  // Split into pages for clean A4 printing
  // In side-by-side mode (Front + Back pair): 2 pairs (4 cards) or 3 pairs (6 cards) per A4 page.
  // In single-side mode: up to 8 or 9 cards per A4 page.
  const cardsPerPage = printLayout === "side_by_side" ? 6 : 8;

  const chunks: EnrichedStudentIdCard[][] = [];
  for (let i = 0; i < cards.length; i += cardsPerPage) {
    chunks.push(cards.slice(i, i + cardsPerPage));
  }

  return (
    <div className="id-card-print-container">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-page {
            page-break-after: always !important;
            break-after: page !important;
            width: 198mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-card-box {
            width: 54mm !important;
            height: 86mm !important;
            min-width: 54mm !important;
            min-height: 86mm !important;
            max-width: 54mm !important;
            max-height: 86mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {chunks.map((pageCards, pageIndex) => (
        <div
          key={pageIndex}
          className="print-page bg-white p-4 sm:p-6 mb-8 rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto"
        >
          {/* Faint header info for the printing operator */}
          <div className="no-print pb-3 mb-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>
              A4 Print Sheet Page {pageIndex + 1} of {chunks.length} ({pageCards.length} Cards)
            </span>
            <span className="font-mono text-[11px]">
              CR80 Standard (54 × 86 mm) • Layout: {printLayout.replace(/_/g, " ")}
            </span>
          </div>

          {printLayout === "side_by_side" ? (
            /* Side-by-Side: Front and Back placed next to each other for easy folding & laminating */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 justify-items-center">
              {pageCards.map((card) => (
                <div
                  key={card.student_id}
                  className="flex items-center gap-2 p-1 rounded-xl bg-slate-50/50 border border-slate-200/60 print:bg-transparent print:border-none print:p-0"
                >
                  {/* Front */}
                  <div
                    className={`print-card-box rounded-xl overflow-hidden bg-white ${
                      showCutGuides ? "border border-dashed border-slate-300" : "border border-slate-200"
                    }`}
                    style={{
                      width: "54mm",
                      height: "86mm",
                    }}
                  >
                    <ThemeComponent
                      card={card}
                      customization={customization}
                      side="front"
                      qrDataUrl={qrMap[card.student_id] || ""}
                      isPrint={true}
                    />
                  </div>

                  {/* Back */}
                  <div
                    className={`print-card-box rounded-xl overflow-hidden bg-white ${
                      showCutGuides ? "border border-dashed border-slate-300" : "border border-slate-200"
                    }`}
                    style={{
                      width: "54mm",
                      height: "86mm",
                    }}
                  >
                    <ThemeComponent
                      card={card}
                      customization={customization}
                      side="back"
                      qrDataUrl={qrMap[card.student_id] || ""}
                      isPrint={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : printLayout === "front_only" ? (
            /* Front Cards Grid: 3 or 4 columns */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
              {pageCards.map((card) => (
                <div
                  key={card.student_id}
                  className={`print-card-box rounded-xl overflow-hidden bg-white ${
                    showCutGuides ? "border border-dashed border-slate-300" : "border border-slate-200"
                  }`}
                  style={{
                    width: "54mm",
                    height: "86mm",
                  }}
                >
                  <ThemeComponent
                    card={card}
                    customization={customization}
                    side="front"
                    qrDataUrl={qrMap[card.student_id] || ""}
                    isPrint={true}
                  />
                </div>
              ))}
            </div>
          ) : printLayout === "back_only" ? (
            /* Back Cards Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
              {pageCards.map((card) => (
                <div
                  key={card.student_id}
                  className={`print-card-box rounded-xl overflow-hidden bg-white ${
                    showCutGuides ? "border border-dashed border-slate-300" : "border border-slate-200"
                  }`}
                  style={{
                    width: "54mm",
                    height: "86mm",
                  }}
                >
                  <ThemeComponent
                    card={card}
                    customization={customization}
                    side="back"
                    qrDataUrl={qrMap[card.student_id] || ""}
                    isPrint={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Duplex Mode: Prints Front Page followed by matching Back Page */
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                {pageCards.map((card) => (
                  <div
                    key={`front-${card.student_id}`}
                    className={`print-card-box rounded-xl overflow-hidden bg-white ${
                      showCutGuides ? "border border-dashed border-slate-300" : "border border-slate-200"
                    }`}
                    style={{
                      width: "54mm",
                      height: "86mm",
                    }}
                  >
                    <ThemeComponent
                      card={card}
                      customization={customization}
                      side="front"
                      qrDataUrl={qrMap[card.student_id] || ""}
                      isPrint={true}
                    />
                  </div>
                ))}
              </div>

              <div className="print-page grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center pt-6 border-t border-slate-200">
                {pageCards.map((card) => (
                  <div
                    key={`back-${card.student_id}`}
                    className={`print-card-box rounded-xl overflow-hidden bg-white ${
                      showCutGuides ? "border border-dashed border-slate-300" : "border border-slate-200"
                    }`}
                    style={{
                      width: "54mm",
                      height: "86mm",
                    }}
                  >
                    <ThemeComponent
                      card={card}
                      customization={customization}
                      side="back"
                      qrDataUrl={qrMap[card.student_id] || ""}
                      isPrint={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
