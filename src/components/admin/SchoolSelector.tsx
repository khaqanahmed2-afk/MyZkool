import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  School as SchoolIcon,
  ChevronDown,
  Check,
  Plus,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import type { School } from "../../types/school";

interface SchoolSelectorProps {
  variant?: "sidebar" | "header";
  className?: string;
}

interface SchoolAvatarProps {
  logoUrl?: string;
  name: string;
  size?: "sm" | "md";
}

function SchoolAvatar({ logoUrl, name, size = "md" }: SchoolAvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const sizeClasses = size === "sm" ? "w-6 h-6 rounded-md" : "w-8 h-8 rounded-lg";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${sizeClasses} object-contain bg-white border border-slate-200 shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClasses} bg-[#EBF2FE] text-[#2158E0] flex items-center justify-center shrink-0 border border-blue-100`}>
      <SchoolIcon className={iconSize} />
    </div>
  );
}

interface SchoolDropdownMenuProps {
  schools: School[];
  currentSchoolId?: string;
  switchingId: string | null;
  onSelectSchool: (school: School) => void;
  onClose: () => void;
  positionClassName: string;
}

function SchoolDropdownMenu({
  schools,
  currentSchoolId,
  switchingId,
  onSelectSchool,
  onClose,
  positionClassName,
}: SchoolDropdownMenuProps) {
  return (
    <div className={`absolute bg-white border border-[#E6EAF3] rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 ${positionClassName}`}>
      <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
        <span>Authorized Schools</span>
        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-semibold">
          {schools.length}
        </span>
      </div>

      <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
        {schools.map((s) => {
          const isSelected = s.id === currentSchoolId;
          const isSwitching = switchingId === s.id;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSchool(s)}
              disabled={isSwitching}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                isSelected
                  ? "bg-blue-50 text-[#2158E0] font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt=""
                  className="w-7 h-7 rounded-md object-contain bg-white border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-[#EBF2FE] text-[#2158E0] flex items-center justify-center shrink-0 border border-blue-100">
                  <SchoolIcon className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate text-[#141A2E]">{s.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {s.city ? `${s.city}, ${s.state}` : s.subdomain ? `${s.subdomain}.myzkool.com` : "Campus"}
                </p>
              </div>

              {isSelected && (
                <Check className="w-4 h-4 text-[#2158E0] shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-1 border-t border-slate-100">
        <Link
          to="/onboarding/new-school"
          onClick={onClose}
          className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-[#2158E0] hover:bg-blue-50/60 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register New School</span>
        </Link>
      </div>
    </div>
  );
}

export function SchoolSelector({
  variant = "sidebar",
  className = "",
}: SchoolSelectorProps) {
  const { school, availableSchools, currentAcademicYear, switchSchool } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelectSchool = async (targetSchool: School) => {
    if (targetSchool.id === school?.id) {
      setIsOpen(false);
      return;
    }

    setSwitchingId(targetSchool.id);
    await switchSchool(targetSchool.id);
    setSwitchingId(null);
    setIsOpen(false);
  };

  const schoolsList: School[] = availableSchools && availableSchools.length > 0
    ? availableSchools
    : school
    ? [school]
    : [];

  const activeAcademicYearLabel = currentAcademicYear?.label || "2025–2026";
  const schoolDisplayName = school?.name || "Sunrise International School";

  if (variant === "header") {
    return (
      <div className={`relative ${className}`} ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-white border border-[#E6EAF3] rounded-xl hover:border-gray-300 transition-colors cursor-pointer text-left shadow-2xs"
          title="Switch School"
        >
          <SchoolAvatar logoUrl={school?.logo_url} name={schoolDisplayName} size="sm" />

          <div className="hidden sm:flex flex-col min-w-0">
            <span className="text-xs font-bold text-[#141A2E] truncate max-w-[140px] md:max-w-[180px]">
              {schoolDisplayName}
            </span>
            <span className="text-[10px] text-[#5B6478] leading-none">
              {activeAcademicYearLabel}
            </span>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <SchoolDropdownMenu
            schools={schoolsList}
            currentSchoolId={school?.id}
            switchingId={switchingId}
            onSelectSchool={handleSelectSchool}
            onClose={() => setIsOpen(false)}
            positionClassName="left-0 mt-1.5 w-72"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative px-3.5 py-3 border-b border-[#E6EAF3] shrink-0 ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 bg-white border border-[#E6EAF3] rounded-xl flex items-center justify-between shadow-2xs hover:border-gray-300 transition-colors cursor-pointer text-left"
        title="Click to switch school"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <SchoolAvatar logoUrl={school?.logo_url} name={schoolDisplayName} size="md" />

          <div className="min-w-0">
            <p
              className="text-xs font-bold text-[#141A2E] truncate"
              title={schoolDisplayName}
            >
              {schoolDisplayName}
            </p>
            <p className="text-[11px] text-[#5B6478] flex items-center gap-1 font-medium">
              <span>{activeAcademicYearLabel}</span>
            </p>
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <SchoolDropdownMenu
          schools={schoolsList}
          currentSchoolId={school?.id}
          switchingId={switchingId}
          onSelectSchool={handleSelectSchool}
          onClose={() => setIsOpen(false)}
          positionClassName="left-3.5 right-3.5 top-full mt-1"
        />
      )}
    </div>
  );
}
