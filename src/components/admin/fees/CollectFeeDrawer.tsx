import React from "react";
import { X, Check, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
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
    invoiceLoadError,
    handleRetryLoadInvoices,
    selectedInvoicesTotalPaise,
    toggleInvoice,
    selectAllInvoices,
    deselectAllInvoices,
    amountRupees,
    setAmountRupees,
    enteredPaise,
    isAdvancePayment,
    setIsAdvancePayment,
    handleToggleAdvancePayment,
    paymentMethod,
    setPaymentMethod,
    referenceNo,
    setReferenceNo,
    chequeNo,
    setChequeNo,
    bankName,
    setBankName,
    chequeDate,
    setChequeDate,
    branchName,
    setBranchName,
    paymentDate,
    setPaymentDate,
    notes,
    setNotes,
    invoiceAllocations,
    isReviewOpen,
    setIsReviewOpen,
    isSubmitting,
    errorMessage,
    generatedReceipt,
    notificationToast,
    handleProceedToInvoices,
    handleProceedToPayment,
    handleBackToStudent,
    handleBackToInvoices,
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
          <div className="px-6 py-4.5 border-b border-[#E6EAF3] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EBF2FE] text-[#2563EB] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#141A2E]">Fee Collection Counter</h2>
                <p className="text-[11px] text-gray-500">Record payments and issue official school receipts</p>
              </div>
            </div>
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

          {/* Drawer Body - One Step at a Time */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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

            {/* STEP 1: SELECT STUDENT */}
            {step === 1 && (
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
            )}

            {/* STEP 2: SELECT INVOICES */}
            {step === 2 && selectedStudent && (
              <InvoicesStep
                student={selectedStudent}
                invoices={invoices}
                selectedInvoiceIds={selectedInvoiceIds}
                invoicesLoading={invoicesLoading}
                invoiceLoadError={invoiceLoadError}
                onRetry={handleRetryLoadInvoices}
                selectedInvoicesTotalPaise={selectedInvoicesTotalPaise}
                amountRupees={amountRupees}
                onAmountChange={setAmountRupees}
                isAdvancePayment={isAdvancePayment}
                onToggleAdvancePayment={handleToggleAdvancePayment}
                onToggleInvoice={toggleInvoice}
                onSelectAll={selectAllInvoices}
                onDeselectAll={deselectAllInvoices}
                onChangeStudent={handleChangeStudent}
              />
            )}

            {/* STEP 3: PAYMENT DETAILS */}
            {step === 3 && selectedStudent && (
              <PaymentDetailsStep
                student={selectedStudent}
                amountRupees={amountRupees}
                onAmountChange={setAmountRupees}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                referenceNo={referenceNo}
                onReferenceNoChange={setReferenceNo}
                chequeNo={chequeNo}
                onChequeNoChange={setChequeNo}
                bankName={bankName}
                onBankNameChange={setBankName}
                chequeDate={chequeDate}
                onChequeDateChange={setChequeDate}
                branchName={branchName}
                onBranchNameChange={setBranchName}
                paymentDate={paymentDate}
                onPaymentDateChange={setPaymentDate}
                notes={notes}
                onNotesChange={setNotes}
                invoiceAllocations={invoiceAllocations}
              />
            )}

            {/* STEP 4: RECEIPT CONFIRMATION */}
            {step === 4 && generatedReceipt && (
              <ReceiptSuccessStep
                receiptNo={generatedReceipt.receipt_no}
                totalPaise={generatedReceipt.total_paise}
                studentName={selectedStudent?.name}
                admissionNo={selectedStudent?.admission_no}
                className={selectedStudent?.class_name}
                paymentMethod={paymentMethod}
                allocatedInvoices={generatedReceipt.allocated_invoices}
                paymentDate={paymentDate}
                onPrint={handlePrintReceipt}
                onDownload={handleDownloadReceipt}
                onSendToParent={handleSendToParent}
                onCollectAnother={handleCollectAnother}
                onClose={onClose}
              />
            )}
          </div>

          {/* Sticky Drawer Footer for Steps 1, 2, and 3 */}
          {step === 1 && (
            <div className="p-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!selectedStudent}
                onClick={handleProceedToInvoices}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2158E0] hover:bg-[#1a46b3] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Continue to Invoices</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="p-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 font-medium">Selected Amount</p>
                <p className="text-xl font-black text-[#2563EB]">
                  ₹{Number(amountRupees || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBackToStudent}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Student</span>
                </button>

                <button
                  type="button"
                  disabled={
                    (selectedInvoiceIds.size === 0 && !isAdvancePayment) ||
                    enteredPaise <= 0
                  }
                  onClick={handleProceedToPayment}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-4 border-t border-[#E6EAF3] bg-white flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 font-medium">Total Collection</p>
                <p className="text-2xl font-black text-[#2563EB]">
                  ₹{Number(amountRupees || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleBackToInvoices}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={enteredPaise <= 0 || isSubmitting}
                  onClick={() => setIsReviewOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Record Payment & Issue Receipt
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
            chequeNo={chequeNo}
            bankName={bankName}
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
