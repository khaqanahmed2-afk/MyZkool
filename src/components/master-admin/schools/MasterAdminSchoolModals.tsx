import React from "react";
import type { MasterAdminSchoolSummary } from "../../../types/masterAdmin";
import { ChangePlanModal } from "./ChangePlanModal";
import { ExtendTrialModal } from "./ExtendTrialModal";
import { ExtendSubscriptionModal } from "./ExtendSubscriptionModal";
import { SuspendReactivateModal } from "./SuspendReactivateModal";
import { ManageModulesModal } from "./ManageModulesModal";
import { SubscriptionHistoryModal } from "./SubscriptionHistoryModal";
import { BulkActionModal } from "./BulkActionModal";
import { OnboardingReviewModal } from "./OnboardingReviewModal";

export type SchoolActiveModalType =
  | "change_plan"
  | "extend_trial"
  | "extend_subscription"
  | "suspend"
  | "reactivate"
  | "manage_modules"
  | "subscription_history"
  | "bulk_action"
  | "onboarding_review"
  | null;

interface MasterAdminSchoolModalsProps {
  activeModal: SchoolActiveModalType;
  modalSchool: MasterAdminSchoolSummary | null;
  bulkTargetSchools: MasterAdminSchoolSummary[];
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const MasterAdminSchoolModals: React.FC<MasterAdminSchoolModalsProps> = ({
  activeModal,
  modalSchool,
  bulkTargetSchools,
  token,
  onClose,
  onSuccess,
}) => {
  if (!activeModal) return null;

  return (
    <>
      {activeModal === "change_plan" && modalSchool && (
        <ChangePlanModal
          school={modalSchool}
          onClose={onClose}
          onSuccess={onSuccess}
          token={token}
        />
      )}

      {activeModal === "extend_trial" && modalSchool && (
        <ExtendTrialModal
          school={modalSchool}
          onClose={onClose}
          onSuccess={onSuccess}
          token={token}
        />
      )}

      {activeModal === "extend_subscription" && modalSchool && (
        <ExtendSubscriptionModal
          school={modalSchool}
          onClose={onClose}
          onSuccess={onSuccess}
          token={token}
        />
      )}

      {activeModal === "suspend" && modalSchool && (
        <SuspendReactivateModal
          school={modalSchool}
          targetAction="suspend"
          onClose={onClose}
          onSuccess={onSuccess}
          token={token}
        />
      )}

      {activeModal === "reactivate" && modalSchool && (
        <SuspendReactivateModal
          school={modalSchool}
          targetAction="reactivate"
          onClose={onClose}
          onSuccess={onSuccess}
          token={token}
        />
      )}

      {activeModal === "manage_modules" && modalSchool && (
        <ManageModulesModal
          school={modalSchool}
          onClose={onClose}
          onSuccess={onSuccess}
          token={token}
        />
      )}

      {activeModal === "subscription_history" && modalSchool && (
        <SubscriptionHistoryModal
          school={modalSchool}
          onClose={onClose}
          token={token}
        />
      )}

      {activeModal === "bulk_action" && bulkTargetSchools.length > 0 && (
        <BulkActionModal
          selectedSchools={bulkTargetSchools}
          onClose={onClose}
          onSuccess={onSuccess}
          token={token}
        />
      )}

      {activeModal === "onboarding_review" && modalSchool && (
        <OnboardingReviewModal
          school={modalSchool}
          onClose={onClose}
          onSuccess={onSuccess}
          token={token}
        />
      )}
    </>
  );
};
