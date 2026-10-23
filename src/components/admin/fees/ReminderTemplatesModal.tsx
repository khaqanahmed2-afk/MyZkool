import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, FileText } from "lucide-react";
import type { ReminderTemplate } from "../../../types/duesReminders";
import type { FeeReminderRule } from "../../../types/feeOperations";
import {
  saveReminderTemplate,
  deleteReminderTemplate,
  interpolateTemplate,
} from "../../../services/duesRemindersService";
import { getReminderRules } from "../../../services/reminderJob";
import {
  TemplatesListView,
  TemplateEditorForm,
  AutomatedRulesView,
} from "./ReminderTemplatesModalComponents";

interface ReminderTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ReminderTemplate[];
  schoolId: string;
  schoolName: string;
  onTemplatesUpdated: () => void;
}

const AVAILABLE_VARIABLES = [
  { tag: "{student_name}", desc: "Student Name" },
  { tag: "{parent_name}", desc: "Parent Name" },
  { tag: "{class_section}", desc: "Class-Section" },
  { tag: "{amount}", desc: "Balance Due (₹)" },
  { tag: "{invoice_no}", desc: "Invoice Number" },
  { tag: "{due_date}", desc: "Due Date" },
  { tag: "{school_name}", desc: "School Name" },
];

export function ReminderTemplatesModal({
  isOpen,
  onClose,
  templates,
  schoolId,
  schoolName,
  onTemplatesUpdated,
}: ReminderTemplatesModalProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "rules">("templates");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplate | null>(null);

  // Form state
  const [formName, setFormName] = useState<string>("");
  const [formPurpose, setFormPurpose] = useState<ReminderTemplate["purpose"]>("general");
  const [formChannel, setFormChannel] = useState<ReminderTemplate["channel"]>("whatsapp");
  const [formBody, setFormBody] = useState<string>("");
  const formIsActiveRef = useRef<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Automated Rules state
  const [rules, setRules] = useState<FeeReminderRule[]>([]);
  const rulesLoadingRef = useRef<boolean>(false);

  const loadRules = useCallback(async () => {
    rulesLoadingRef.current = true;
    try {
      const data = await getReminderRules(schoolId);
      setRules(data);
    } finally {
      rulesLoadingRef.current = false;
    }
  }, [schoolId]);

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen, loadRules]);

  const handleStartCreate = () => {
    setSelectedTemplate(null);
    setFormName("");
    setFormPurpose("general");
    setFormChannel("whatsapp");
    setFormBody(
      "Dear Parent,\nThis is a reminder that fee amount of ₹{amount} for {student_name} (Class {class_section}) is pending against Invoice {invoice_no}.\nPlease pay before {due_date}.\n- {school_name}"
    );
    formIsActiveRef.current = true;
    setFormError(null);
    setIsEditing(true);
  };

  const handleStartEdit = (tpl: ReminderTemplate) => {
    setSelectedTemplate(tpl);
    setFormName(tpl.name);
    setFormPurpose(tpl.purpose);
    setFormChannel(tpl.channel);
    setFormBody(tpl.body);
    formIsActiveRef.current = tpl.isActive;
    setFormError(null);
    setIsEditing(true);
  };

  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      setFormError("Template name is required");
      return;
    }
    if (!formBody.trim()) {
      setFormError("Message body is required");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await saveReminderTemplate(schoolId, {
        id: selectedTemplate?.id,
        name: formName.trim(),
        purpose: formPurpose,
        channel: formChannel,
        body: formBody.trim(),
        isActive: formIsActiveRef.current,
      });

      setIsEditing(false);
      onTemplatesUpdated();
    } catch (err: any) {
      setFormError(err.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tplId: string) => {
    if (confirm("Are you sure you want to delete this reminder template?")) {
      await deleteReminderTemplate(schoolId, tplId);
      onTemplatesUpdated();
    }
  };

  const handleToggleRule = (ruleId: string) => {
    const updated = rules.map((r) =>
      r.id === ruleId ? { ...r, is_active: !r.is_active } : r
    );
    setRules(updated);
    localStorage.setItem(`myzkool_fee_reminder_rules_${schoolId}`, JSON.stringify(updated));
  };

  const samplePreview = interpolateTemplate(formBody, {
    student_name: "Aarav Sharma",
    parent_name: "Ramesh Sharma",
    class_section: "10-A",
    amount: "15,000",
    invoice_no: "INV-2026-001",
    due_date: "10 Apr 2025",
    school_name: schoolName,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF3] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#141A2E]">Reminder Templates & Rules</h2>
              <p className="text-[11px] text-[#5B6478]">Manage parent notification templates and dispatch rules</p>
            </div>
          </div>
          <button
            aria-label="Close"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 border-b border-[#E6EAF3] flex items-center gap-6 bg-slate-50/50 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("templates");
              setIsEditing(false);
            }}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "templates"
                ? "border-[#0B7B49] text-[#0B7B49]"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Message Templates ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "rules"
                ? "border-[#0B7B49] text-[#0B7B49]"
                : "border-transparent text-[#5B6478] hover:text-[#141A2E]"
            }`}
          >
            Automated Reminder Rules
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "templates" && (
            <>
              {!isEditing ? (
                <TemplatesListView
                  templates={templates}
                  onStartCreate={handleStartCreate}
                  onStartEdit={handleStartEdit}
                  onDelete={handleDelete}
                />
              ) : (
                <TemplateEditorForm
                  selectedTemplate={selectedTemplate}
                  formName={formName}
                  setFormName={setFormName}
                  formPurpose={formPurpose}
                  setFormPurpose={setFormPurpose}
                  formChannel={formChannel}
                  setFormChannel={setFormChannel}
                  formBody={formBody}
                  setFormBody={setFormBody}
                  formError={formError}
                  isSaving={isSaving}
                  onCancel={() => setIsEditing(false)}
                  onSave={handleSaveTemplate}
                  samplePreview={samplePreview}
                  availableVariables={AVAILABLE_VARIABLES}
                />
              )}
            </>
          )}

          {activeTab === "rules" && (
            <AutomatedRulesView
              rules={rules}
              schoolId={schoolId}
              onToggleRule={handleToggleRule}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E6EAF3] bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
