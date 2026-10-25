# Fee Management — API & Services Reference

## 1. Overview

The Fee Management frontend interacts with backend data via strongly typed TypeScript services located in `src/services/`.

---

## 2. Core Services Reference

### 1. `feeCalculationEngine.ts`
The authoritative mathematical engine responsible for all financial equations, invariants, and rounding rules.

#### `computeAuthoritativeFinancialSummary(params: FinancialSummaryParams): AuthoritativeFinancialSummary`
Computes executive-level totals across the school for an academic year.
- **Inputs**:
  - `dues: StudentDue[]`
  - `credits: FeeCredit[]`
  - `receipts: FeeReceipt[]`
  - `students: { id: string }[]`
  - `academicYearId: string`
  - `asOfDateStr: string` (YYYY-MM-DD)
- **Outputs (`AuthoritativeFinancialSummary`)**:
  - `gross_assessed_paise: number`
  - `concessions_paise: number`
  - `net_assessed_paise: number`
  - `total_collected_paise: number`
  - `gross_outstanding_paise: number`
  - `advance_credits_paise: number`
  - `net_outstanding_paise: number`
  - `overdue_dues_paise: number`
  - `current_pending_paise: number`
  - `students_with_dues_count: number`
  - `students_overdue_count: number`
  - `collection_percentage: number`

#### `calculateInstallmentPlan(components, terms, studentAdmissionDate): InstallmentPlan`
Generates installment schedules with exact integer paise distribution across quarterly, monthly, or annual terms, adjusting for mid-year admissions.

---

### 2. `studentLedgerService.ts`
Aggregates and formats all student-level financial transactions for the Student Fee Ledger Drawer.

#### `getStudentLedgerDetails(schoolId: string, studentId: string, academicYearId?: string): Promise<StudentLedgerDetails | null>`
Retrieves the comprehensive 8-tab ledger data for a single student.
- **Returns (`StudentLedgerDetails`)**:
  - `student`: Profile details, admission number, guardian contact.
  - `enrolled_class`: Name of active enrolled class and section.
  - `metrics`:
    - `net_assessed_paise: number`
    - `total_payments_paise: number`
    - `concessions_paise: number`
    - `closing_balance_paise: number`
    - `advance_credits_paise: number`
  - `obligations: StudentObligationRow[]`: Detailed breakdown per fee head and term.
  - `transactions: LedgerTransactionItem[]`: Double-entry chronological history with running balance.
  - `invoices: StudentInvoiceRow[]`
  - `payments: StudentPaymentRow[]`
  - `concessions: StudentConcessionRow[]`
  - `transport: StudentTransportDetail | null`
  - `credits: StudentCreditRow[]`

---

### 3. `feeDuesService.ts`
Manages fee obligation creation, query filtering, and status updates.

#### `getStudentDues(schoolId: string, filters: FeeDuesFilters): Promise<StudentDue[]>`
Fetches dues filtered by `academic_year_id`, `class_id`, `status`, or `due_date`.

#### `generateInvoicesForTerm(params: GenerateInvoicesDTO): Promise<GenerationResult>`
Generates dues and invoices in bulk for an entire class or cohort. Includes idempotency check to avoid duplicate billing.

---

### 4. `collectionService.ts`
Handles payment recording, receipting, and transaction allocation.

#### `recordCounterPayment(dto: CounterPaymentDTO): Promise<FeeReceipt>`
Records an in-person or digital payment collected at the fee counter.
- **Payload (`CounterPaymentDTO`)**:
  - `schoolId: string`
  - `studentId: string`
  - `academicYearId: string`
  - `totalPaise: number`
  - `paymentMode: PaymentMode`
  - `transactionRef?: string`
  - `remarks?: string`
  - `allocations: { dueId: string; amountPaise: number }[]`
- **Side Effects**:
  - Decrements `balance_paise` on target dues.
  - Generates official receipt series number.
  - Emits local cache update event.

---

### 5. `feeReportsService.ts`
Computes reconcilable reporting structures for exports, class-wise summaries, and defaulter registers.

#### `getClassWiseFeeSummary(schoolId: string, academicYearId: string): Promise<ClassFeeSummary[]>`
Returns class-by-class rollups of billed, collected, and outstanding amounts.

#### `getDefaultersRegister(schoolId: string, academicYearId: string, minDaysOverdue: number): Promise<DefaulterRecord[]>`
Returns comprehensive list of overdue students sorted by age of debt.

---

### 6. `invoiceService.ts`
Provides complete invoice lifecycle management and register aggregation.

#### `getSchoolInvoices(schoolId: string, filters: InvoiceFilters): Promise<InvoicesResponse>`
Aggregates and compiles individual student invoices grouped by `(student_id + academic_year_id + term_id)`.
- **Inputs (`InvoiceFilters`)**:
  - `academic_year_id?: string`
  - `class_id?: string`
  - `section_id?: string`
  - `status?: 'all' | InvoiceStatus | string`
  - `search?: string`
  - `due_date_from?: string`
  - `due_date_to?: string`
  - `page?: number`
  - `pageSize?: number`
- **Returns**:
  - `invoices: StudentInvoice[]`
  - `metrics: InvoiceSummaryMetrics` (total invoiced, paid, outstanding, overdue count, etc.)
  - `totalCount: number`, `totalPages: number`, `currentPage: number`

#### `generateInvoiceHTML(invoice: StudentInvoice, school: SchoolInvoiceBranding): string`
Generates print-ready HTML for official A4 tax invoices with watermarks (PAID, OVERDUE, VOID), itemized academic and transport breakdown, and amount in words in the Indian numbering system.
