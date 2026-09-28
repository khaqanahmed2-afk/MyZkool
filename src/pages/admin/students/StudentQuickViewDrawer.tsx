import React, { useEffect, useState } from "react";
import { X, Phone, MessageSquare, ExternalLink, Calendar, Shield, Users, CreditCard, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { StudentListItem, StudentProfile } from "../../../types/students";
import { getStudentProfile } from "../../../services/studentService";

interface StudentQuickViewDrawerProps {
  student: StudentListItem | null;
  schoolId: string;
  onClose: () => void;
  onDelete?: (student: StudentListItem) => void;
}

export function StudentQuickViewDrawer({ student, schoolId, onClose, onDelete }: StudentQuickViewDrawerProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!student) {
      setProfile(null);
      return;
    }
    let isMounted = true;
    setLoading(true);
    getStudentProfile(schoolId, student.id)
      .then(res => {
        if (isMounted && res.profile) {
          setProfile(res.profile);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [student, schoolId]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!student) return null;

  const primaryParent = profile?.parents.find(p => p.is_primary_contact) || (student.primary_parent_name ? {
    full_name: student.primary_parent_name,
    phone: student.primary_parent_phone || "",
    relation: "father" as const,
  } : null);

  const initials = `${student.first_name[0] || ""}${student.last_name[0] || ""}`.toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity backdrop-blur-2xs"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col border-l border-[#E6EAF3] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#E6EAF3] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quick view
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#2158E0] font-medium border border-blue-200">
              {student.admission_no}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Identity Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-[#2158E0] flex items-center justify-center font-bold text-xl border-2 border-white shadow-xs shrink-0 overflow-hidden">
              {student.photo_path ? (
                <img src={student.photo_path} alt={student.first_name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                {student.first_name} {student.middle_name ? `${student.middle_name} ` : ""}{student.last_name}
              </h3>
              <div className="text-sm font-medium text-slate-600">
                {student.class_name || "Grade"} {student.section_name ? `- ${student.section_name}` : ""}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {student.status.replace("_", " ")}
                </span>
                {profile?.is_rte && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    RTE quota
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key Facts Card */}
          <div className="bg-slate-50 border border-[#E6EAF3] rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Key facts
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Date of birth</span>
                <span className="font-medium text-slate-800">{student.dob}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Gender</span>
                <span className="font-medium text-slate-800 capitalize">{student.gender}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Category</span>
                <span className="font-medium text-slate-800 uppercase">{profile?.category || "General"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Blood group</span>
                <span className="font-medium text-slate-800">{profile?.blood_group || "—"}</span>
              </div>
            </div>
          </div>

          {/* Parent / Guardian Card */}
          <div className="bg-white border border-[#E6EAF3] rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" /> Primary contact
            </div>
            {primaryParent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{primaryParent.full_name}</div>
                    <div className="text-xs text-slate-500 capitalize">{primaryParent.relation}</div>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-700">
                    {primaryParent.phone}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-[#E6EAF3]">
                  <a
                    href={`tel:${primaryParent.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" /> Call
                  </a>
                  <a
                    href={`https://wa.me/91${primaryParent.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No parent linked yet</div>
            )}
          </div>

          {/* Sibling Cards */}
          <div className="bg-white border border-[#E6EAF3] rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" /> Siblings
            </div>
            {profile?.siblings && profile.siblings.length > 0 ? (
              <div className="space-y-2">
                {profile.siblings.map(sib => (
                  <div
                    key={sib.sibling_id}
                    onClick={() => {
                      onClose();
                      navigate(`/admin/students/${sib.sibling_id}`);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {sib.sibling_first_name} {sib.sibling_last_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sib.sibling_admission_no} • {sib.sibling_class_name || "Grade"} {sib.sibling_section_name || ""}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No siblings detected in school</div>
            )}
          </div>

          {/* Fee Summary */}
          <div className="bg-white border border-[#E6EAF3] rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Fee status
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-600 block">Current balance</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                  ₹0 (Paid up)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/admin/fees/collect?student=${student.id}`);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2158E0] text-white hover:bg-[#1A46B8] transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" /> Collect fee
              </button>
            </div>
          </div>

        </div>

        {/* Footer with Open Profile and Delete CTA */}
        <div className="p-4 border-t border-[#E6EAF3] bg-white flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(student);
              }}
              className="px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Delete student and data"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/admin/students/${student.id}`);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2158E0] hover:bg-[#1A46B8] text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm"
          >
            <span>Open full profile</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

