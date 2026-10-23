import React from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { useCollectFeeDrawer } from "./useCollectFeeDrawer";
import {
  StepProgress,
  ReceiptSuccessStep,
  StudentSearchSection,
  InvoicesStep,
  PaymentDetailsStep,
  PaymentReviewModal,
} from "./CollectFeeDrawerComponents";

interface CollectFeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receiptNo: string) => void;
  initialStudentId?: string;
  academicYearId?: string;
}

const CollectFeeDrawerContent: React.FC<CollectFeeDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialStudentId,
  academicYearId,
}) => {
  const {
    step,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    selectedStudent,
    classesList,
    selectedClassId,
    selectedSectionId,
    availableSections,
    isLoadingClasses,
    handleClassChange,
    setSelectedSectionId,
    handleSelectStudent,
    handleResetFilters,
    handleChangeStudent,
    invoices,
    selectedInvoiceIds,
    invoicesLoading,
    selectedInvoicesTotalPaise,
    toggleInvoice,
    amountRupees,
    setAmountRupees,
    enteredPaise,
    paymentMethod,
    setPaymentMethod,
    referenceNo,
    setReferenceNo,
    paymentDate,
    setPaymentDate,
    notes,
    setNotes,
    isReviewOpen,
    setIsReviewOpen,
    isSubmitting,
    errorMessage,
    generatedReceipt,
    notificationToast,
    handleSubmitPayment,
    handlePrintReceipt,
    handleDownloadReceipt,
    handleSendToParent,
    handleCollectAnother,
  } = useCollectFeeDrawer({
    isOpen,
    initialStudentId,
    academicYearId,
    onSuccess,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E6EAF3] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#141A2E]">Collect Fee</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Indicator */}
          <StepProgress step={step} />

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {notificationToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{notificationToast}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 4: RECEIPT CONFIRMATION VIEW */}
            {step === 4 && generatedReceipt && (
              <ReceiptSuccessStep
                receiptNo={generatedReceipt.receipt_no}
                totalPaise={generatedReceipt.total_paise}
                studentName={selectedStudent?.name}
                admissionNo={selectedStudent?.admission_no}
                paymentMethod={paymentMethod}
                onPrint={handlePrintReceipt}
                onDownload={handleDownloadReceipt}
                onSendToParent={handleSendToParent}
                onCollectAnother={handleCollectAnother}
                onClose={onClose}
              />
            )}

            {/* STEPS 1-3 WORKFLOW */}
            {step < 4 && (
              <>
                {/* 1. SEARCH & FILTERS / SELECTED STUDENT */}
                <StudentSearchSection
                  selectedStudent={selectedStudent}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  selectedClassId={selectedClassId}
                  onClassChange={handleClassChange}
                  selectedSectionId={selectedSectionId}
                  onSectionChange={setSelectedSectionId}
                  classesList={classesList}
                  availableSections={availableSections}
                  isLoadingClasses={isLoadingClasses}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  onSelectStudent={handleSelectStudent}
                  onResetFilters={handleResetFilters}
                  onChangeStudent={handleChangeStudent}
                />

                {/* 2. OUTSTANDING INVOICES SECTION */}
                {selectedStudent && (
                  <InvoicesStep
                    invoices={invoices}
                    selectedInvoiceIds={selectedInvoiceIds}
                    invoicesLoading={invoicesLoading}
                    selectedInvoicesTotalPaise={selectedInvoicesTotalPaise}
                    onToggleInvoice={toggleInvoice}
                  />
                )}

                {/* 3. PAYMENT DETAILS FORM */}
                {selectedStudent && (
                  <PaymentDetailsStep
                    amountRupees={amountRupees}
                    onAmountChange={setAmountRupees}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    referenceNo={referenceNo}
                    onReferenceNoChange={setReferenceNo}
                    paymentDate={paymentDate}
                    onPaymentDateChange={setPaymentDate}
                    notes={notes}
                    onNotesChange={setNotes}
                  />
                )}
              </>
            )}
          </div>

          {/* Sticky Drawer Footer */}
          {step < 4 && (
            <div className="p-5 border-t border-[#E6EAF3] bg-white flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 font-medium">Total Amount</p>
                <p className="text-2xl font-black text-[#0B7B49]">
                  ₹{Number(amountRupees || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!selectedStudent || enteredPaise <= 0 || isSubmitting}
                  onClick={() => setIsReviewOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#0B7B49] hover:bg-[#09663c] text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Collect Fee
                </button>
              </div>
            </div>
          )}

          {/* REVIEW & CONFIRMATION MODAL */}
          <PaymentReviewModal
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            onConfirm={handleSubmitPayment}
            isSubmitting={isSubmitting}
            studentName={selectedStudent?.name}
            admissionNo={selectedStudent?.admission_no}
            invoicesCount={
              invoices.filter((inv) => selectedInvoiceIds.has(inv.id)).length
            }
            paymentMethod={paymentMethod}
            referenceNo={referenceNo}
            paymentDate={paymentDate}
            amountRupees={amountRupees}
          />
        </div>
      </div>
    </div>
  );
};

export function CollectFeeDrawer(props: CollectFeeDrawerProps) {
  if (!props.isOpen) return null;
  return <CollectFeeDrawerContent key={props.initialStudentId || "open"} {...props} />;
}
