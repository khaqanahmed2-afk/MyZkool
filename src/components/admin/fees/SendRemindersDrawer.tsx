import React from "react";
import type {
  DuesReminderRow,
  ReminderTemplate,
  SendRemindersResult,
} from "../../../types/duesReminders";
import { useSendRemindersState } from "./useSendRemindersState";
import {
  SendRemindersHeader,
  SendRemindersStepper,
  SendRemindersStep1SelectStudents,
  SendRemindersStep2Message,
  SendRemindersStep3Review,
  SendRemindersStep4Complete,
  SendRemindersFooter,
  FilteredStudentsListModal,
} from "./SendRemindersDrawerComponents";

interface SendRemindersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rows: DuesReminderRow[];
  templates: ReminderTemplate[];
  schoolId: string;
  schoolName: string;
  onSuccess: (result: SendRemindersResult) => void;
  onOpenTemplates: () => void;
  preSelectedRowIds?: string[];
}

const SendRemindersDrawerContent: React.FC<SendRemindersDrawerProps> = (props) => {
  const {
    currentStep,
    setCurrentStep,
    showFilterListModal,
    setShowFilterListModal,
    filteredStudents,
    submitResult,
    step1Props,
    step2Props,
    step3Props,
    footerProps,
  } = useSendRemindersState(props);

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={props.onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <aside
          aria-label="Send Reminders Drawer"
          className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-[#E6EAF3] animate-in slide-in-from-right duration-300"
        >
          <SendRemindersHeader onClose={props.onClose} />
          <SendRemindersStepper currentStep={currentStep} onSelectStep={setCurrentStep} />

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {currentStep <= 2 && (
              <>
                <SendRemindersStep1SelectStudents {...step1Props} />
                <SendRemindersStep2Message {...step2Props} />
              </>
            )}

            {currentStep === 3 && <SendRemindersStep3Review {...step3Props} />}

            {currentStep === 4 && submitResult && (
              <SendRemindersStep4Complete submitResult={submitResult} />
            )}
          </div>

          <SendRemindersFooter {...footerProps} />
        </aside>
      </div>

      <FilteredStudentsListModal
        isOpen={showFilterListModal}
        onClose={() => setShowFilterListModal(false)}
        filteredStudents={filteredStudents}
      />
    </div>
  );
};

export function SendRemindersDrawer(props: SendRemindersDrawerProps) {
  if (!props.isOpen) return null;
  const key = props.preSelectedRowIds ? props.preSelectedRowIds.join(",") : "open";
  return <SendRemindersDrawerContent key={key} {...props} />;
}
