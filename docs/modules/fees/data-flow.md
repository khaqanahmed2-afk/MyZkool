# Fee Management — Data Flow & Sequence Diagrams

## 1. Overview

This document details the lifecycle and transaction flow for financial data across the MyZkool platform. Every financial interaction is strictly scoped to `school_id`, executed in integer paise, and guarded against race conditions and double-entry discrepancies.

---

## 2. Dashboard Loading & Metric Computation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as School Admin / Accountant
    participant Dash as FeeDashboard.tsx
    participant Supa as Supabase (PostgreSQL)
    participant Calc as feeCalculationEngine.ts
    participant Cache as Local Storage Cache

    Admin->>Dash: Navigates to /admin/fees
    Dash->>Dash: Resolve activeSchoolId & academicYearId
    
    par Fetch Financial Entities
        Dash->>Supa: SELECT from student_dues WHERE school_id = X AND academic_year_id = Y
        Dash->>Supa: SELECT from fee_receipts WHERE school_id = X AND status = 'active'
        Dash->>Supa: SELECT from fee_credits WHERE school_id = X
    and Fetch Student & Academic Meta
        Dash->>Supa: SELECT id, first_name, last_name, admission_no, admission_class_id FROM students
        Dash->>Supa: SELECT student_id, class_id FROM student_enrollments
        Dash->>Supa: SELECT id, name FROM classes
    end

    alt Database Online
        Supa-->>Dash: Return SQL datasets
        Dash->>Cache: Update backup local cache
    else Database Connection Degraded / Offline
        Cache-->>Dash: Load cached datasets for school
    end

    Dash->>Calc: computeAuthoritativeFinancialSummary(dues, credits, receipts, students, ayId, today)
    Calc->>Calc: Filter out cancelled dues & receipts
    Calc->>Calc: Sum gross, concessions, net, paid, balance
    Calc->>Calc: Segment current pending vs overdue dues (due_date < today)
    Calc->>Calc: Deduct advance credits single time
    Calc-->>Dash: Return AuthoritativeFinancialSummary

    Dash->>Dash: Reconcile Donut Chart (cpct + ppct + opct === 100%)
    Dash->>Dash: Resolve Student & Class names for TopPendingDues
    Dash-->>Admin: Render KPI cards, charts, and tables
```

---

## 3. Counter Payment Collection Flow

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as School Cashier
    participant Drawer as CollectFeeDrawer.tsx
    participant Service as collectionService.ts
    participant Supa as Supabase (PostgreSQL)
    participant Ledger as studentLedgerService.ts

    Cashier->>Drawer: Opens payment drawer & selects Student
    Drawer->>Ledger: getStudentLedgerDetails(schoolId, studentId, ayId)
    Ledger-->>Drawer: Unpaid obligations list & available credit balance

    Cashier->>Drawer: Enters payment amount, mode (UPI/Cash), notes
    Cashier->>Drawer: Clicks "Confirm & Issue Receipt"
    Drawer->>Drawer: Validate: amount > 0, idempotency lock engaged

    Drawer->>Service: recordCounterPayment({ studentId, amountPaise, mode, allocations })
    Service->>Supa: BEGIN TRANSACTION
    
    Service->>Supa: INSERT INTO fee_receipts (receipt_no, total_paise, mode, status='active')
    loop For each allocated obligation
        Service->>Supa: UPDATE student_dues SET paid_paise = paid_paise + alloc, balance_paise = balance_paise - alloc, status = CASE WHEN balance <= 0 THEN 'paid' ELSE 'partial' END
        Service->>Supa: INSERT INTO fee_receipt_items (receipt_id, due_id, allocated_paise)
    end
    
    opt If payment exceeds total due
        Service->>Supa: INSERT INTO fee_credits (student_id, amount_paise, reason='surplus_payment')
    end

    Service->>Supa: COMMIT TRANSACTION
    Supa-->>Service: Return receipt confirmation
    Service-->>Drawer: Success callback with Receipt DTO
    Drawer->>Drawer: Trigger browser print dialog for Official 80mm/A4 Receipt
    Drawer-->>Cashier: Display success toast & close drawer
```

---

## 4. Invoice Generation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Finance Admin
    participant InvPage as InvoicesPage.tsx
    participant DuesService as feeDuesService.ts
    participant Supa as Supabase (PostgreSQL)

    Admin->>InvPage: Selects Class, Term, and Due Date
    Admin->>InvPage: Clicks "Generate Invoices"
    InvPage->>DuesService: generateInvoicesForTerm({ classId, termId, dueDate })
    
    DuesService->>Supa: SELECT students FROM student_enrollments WHERE class_id = X
    DuesService->>Supa: SELECT fee_structure_items WHERE term_id = Y
    
    loop For each enrolled student
        DuesService->>DuesService: Check existing dues for idempotency
        alt Due already exists
            DuesService->>DuesService: Skip duplicate creation
        else New obligation
            DuesService->>DuesService: Calculate concessions (merit, sibling, RTE)
            DuesService->>Supa: INSERT INTO student_dues (gross_paise, concession_paise, net_paise, balance_paise)
            DuesService->>Supa: INSERT INTO invoices (invoice_no, student_id, total_paise)
            DuesService->>Supa: INSERT INTO invoice_items (...)
        end
    end

    DuesService-->>InvPage: Generation completed summary (Created: N, Skipped: M)
    InvPage-->>Admin: Display batch completion report
```

---

## 5. Student Fee Ledger Retrieval Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Admin / Teacher / Parent
    participant Drawer as StudentFeeLedgerDrawer.tsx
    participant View as StudentFeeLedgerView.tsx
    participant Service as studentLedgerService.ts
    participant Supa as Supabase (PostgreSQL)

    User->>Drawer: Selects student row in UI
    Drawer->>View: Mounts with studentId & academicYearId
    View->>Service: getStudentLedgerDetails(schoolId, studentId, academicYearId)

    par Fetch Student Ledger Data
        Service->>Supa: SELECT * FROM student_dues WHERE student_id = X
        Service->>Supa: SELECT * FROM fee_receipts WHERE student_id = X
        Service->>Supa: SELECT * FROM invoices WHERE student_id = X
        Service->>Supa: SELECT * FROM fee_credits WHERE student_id = X
        Service->>Supa: SELECT * FROM student_concessions WHERE student_id = X
        Service->>Supa: SELECT * FROM transport_assignments WHERE student_id = X
    end

    Supa-->>Service: Return raw records
    Service->>Service: Compute running ledger balance (chronological sort)
    Service->>Service: Map invoice line items to obligations
    Service->>Service: Aggregate total billed, paid, concessions, and wallet credit
    Service-->>View: Return StudentLedgerDetails DTO

    View->>View: Render selected tab (Overview, Breakdown, History, etc.)
    View-->>User: Display rich interactive ledger drawer
```
