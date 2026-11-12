import React, { useState } from "react";
import {
  Palette,
  Building,
  Image,
  Eye,
  QrCode,
  FileText,
  RotateCcw,
  Save,
  Check,
  ChevronDown,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { IdCardCustomization, DEFAULT_CUSTOMIZATION } from "../../../../services/idCardService";
import { THEME_LIST } from "./themeRegistry";

interface IdCardCustomizationPanelProps {
  customization: IdCardCustomization;
  onChange: (updated: Partial<IdCardCustomization>) => void;
  onReset: () => void;
  onSaveAsDefault: () => void;
  schoolNameDefault: string;
  sessionDefault: string;
}

export const IdCardCustomizationPanel: React.FC<IdCardCustomizationPanelProps> = ({
  customization,
  onChange,
  onReset,
  onSaveAsDefault,
  schoolNameDefault,
  sessionDefault,
}) => {
  const [openSection, setOpenSection] = useState<string>("themes");
  const [savedToast, setSavedToast] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? "" : id);
  };

  const handleSave = () => {
    onSaveAsDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="bg-white border border-[#E6EAF3] rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">Card Studio Customizer</h3>
            <p className="text-[11px] text-slate-500">Live design & field controls</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition text-xs font-semibold"
            title="Reset to default settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            {savedToast ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedToast ? "Saved!" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-280px)] text-xs">
        {/* 1. THEME SELECTION WITH VISUAL THUMBNAILS */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("themes")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Palette className="w-4 h-4 text-blue-600" />
              <span>Theme Selection</span>
            </div>
            {openSection === "themes" ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === "themes" && (
            <div className="p-4 pt-1 space-y-3 bg-slate-50/40">
              <div className="grid grid-cols-1 gap-2.5">
                {THEME_LIST.map((theme) => {
                  const isSelected = customization.themeId === theme.id;
                  const isModern = theme.id === "modern_blue_yellow";
                  return (
                    <div
                      key={theme.id}
                      onClick={() => onChange({ themeId: theme.id })}
                      className={`p-3 rounded-2xl border-2 transition cursor-pointer text-left flex gap-3 items-center ${
                        isSelected
                          ? "border-[#2158E0] bg-blue-50/60 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {/* Visual Mini Card Thumbnail */}
                      <div className="w-12 h-16 rounded-lg bg-white border border-slate-300 overflow-hidden shadow-2xs flex flex-col justify-between shrink-0 relative">
                        {/* Mini Header with scoop */}
                        <div
                          className="h-6 w-full relative"
                          style={{
                            backgroundColor: theme.defaultPrimaryColor,
                            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 0.8px, transparent 0.8px)",
                            backgroundSize: "3px 3px",
                          }}
                        >
                          {/* Mini circle */}
                          <div
                            className="absolute left-[-2px] bottom-[-2px] w-3 h-3 rounded-full"
                            style={{ backgroundColor: theme.defaultSecondaryColor }}
                          />
                        </div>
                        {/* Mini Center badge */}
                        <div className="flex flex-col items-center py-0.5">
                          <div className="w-3.5 h-4 rounded bg-slate-200 border border-white" />
                          <div
                            className="w-5 h-1 rounded-full mt-0.5"
                            style={{ backgroundColor: theme.defaultSecondaryColor }}
                          />
                        </div>
                        {/* Mini Bottom bar */}
                        <div
                          className="h-2.5 w-full flex items-center justify-between px-0.5"
                          style={{ backgroundColor: theme.defaultPrimaryColor }}
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-xs" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {theme.name}
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#2158E0]" />}
                          </span>
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {theme.previewBadge}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 leading-tight">
                          {theme.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Accent Colors if supported */}
              {customization.themeId === "modern_blue_yellow" && (
                <div className="pt-2 border-t border-slate-200/80">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Theme Color Accents
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={customization.primaryColor}
                        onChange={(e) => onChange({ primaryColor: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 p-0.5 cursor-pointer bg-white"
                        title="Primary Header Color"
                      />
                      <span className="text-[11px] text-slate-600 font-medium">Primary</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={customization.secondaryColor}
                        onChange={(e) => onChange({ secondaryColor: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 p-0.5 cursor-pointer bg-white"
                        title="Secondary Shape Color"
                      />
                      <span className="text-[11px] text-slate-600 font-medium">Accent</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. SCHOOL BRANDING */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("branding")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>School Identity & Header</span>
            </div>
            {openSection === "branding" ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === "branding" && (
            <div className="p-4 pt-1 space-y-3 bg-slate-50/40">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-700 font-medium">Display School Logo</span>
                <input
                  type="checkbox"
                  checked={customization.showSchoolLogo}
                  onChange={(e) => onChange({ showSchoolLogo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Card School Name (Override)
                </label>
                <input
                  type="text"
                  placeholder={schoolNameDefault || "Peace Convent School"}
                  value={customization.schoolNameOverride}
                  onChange={(e) => onChange({ schoolNameOverride: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Leave blank to use registered school name.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Academic Session
                </label>
                <input
                  type="text"
                  placeholder={sessionDefault || "2026–27"}
                  value={customization.sessionOverride}
                  onChange={(e) => onChange({ sessionOverride: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. STUDENT PHOTO */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("photo")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Image className="w-4 h-4 text-amber-600" />
              <span>Student Photograph</span>
            </div>
            {openSection === "photo" ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === "photo" && (
            <div className="p-4 pt-1 space-y-3 bg-slate-50/40">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-700 font-medium">Display Student Photo</span>
                <input
                  type="checkbox"
                  checked={customization.showStudentPhoto}
                  onChange={(e) => onChange({ showStudentPhoto: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. VISIBLE INFORMATION FIELDS */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("fields")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Information Fields</span>
            </div>
            {openSection === "fields" ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === "fields" && (
            <div className="p-4 pt-1 space-y-2 bg-slate-50/40">
              {[
                { key: "showAdmissionNo", label: "Admission Number" },
                { key: "showRollNo", label: "Roll Number" },
                { key: "showClassSection", label: "Class & Section" },
                { key: "showBloodGroup", label: "Blood Group" },
                { key: "showDob", label: "Date of Birth" },
                { key: "showAdmissionDate", label: "Admission Date" },
                { key: "showGuardianName", label: "Guardian / Father Name" },
                { key: "showEmergencyContact", label: "Emergency Phone" },
                { key: "showStudentAddress", label: "Student Home Address" },
                { key: "showSchoolAddress", label: "School Address & Contact" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-slate-700 font-medium text-[11px]">{label}</span>
                  <input
                    type="checkbox"
                    checked={(customization as any)[key]}
                    onChange={(e) => onChange({ [key]: e.target.checked } as any)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. VERIFICATION & CODES */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("verification")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <QrCode className="w-4 h-4 text-purple-600" />
              <span>QR & Barcode Verification</span>
            </div>
            {openSection === "verification" ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === "verification" && (
            <div className="p-4 pt-1 space-y-2 bg-slate-50/40">
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-slate-800 font-bold block text-[11px]">
                    Dynamic QR Code Verification
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    High error-correction QR pointing to secure public verification URL.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={customization.showQrCode}
                  onChange={(e) => onChange({ showQrCode: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-200/80 pt-2">
                <div>
                  <span className="text-slate-800 font-bold block text-[11px]">
                    Vector Barcode (Admission No)
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Displays crisp vector barcode on the back of card for gate scanners.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={customization.showBarcode}
                  onChange={(e) => onChange({ showBarcode: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer shrink-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* 6. SIGNATURES & LEGAL DISCLAIMER */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("signatures")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Signatures & Disclaimer</span>
            </div>
            {openSection === "signatures" ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === "signatures" && (
            <div className="p-4 pt-1 space-y-3 bg-slate-50/40">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Signatory Title
                </label>
                <input
                  type="text"
                  value={customization.principalTitle}
                  onChange={(e) => onChange({ principalTitle: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Card Disclaimer Text
                </label>
                <textarea
                  rows={2}
                  value={customization.disclaimerText}
                  onChange={(e) => onChange({ disclaimerText: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
