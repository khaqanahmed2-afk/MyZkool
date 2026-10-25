# Fee Management — Testing & Quality Assurance

## 1. Testing Philosophy & Standards

Because the Fee Management module governs financial transactions and legal accounting records, all tests adhere to strict rules:
1. **Zero Discrepancy Tolerance**: Floating-point rounding tolerances are forbidden. Invariants must balance to the exact paise ($0\text{ paise}$ error).
2. **Deterministic Test Fixtures**: Tests use isolated, controlled fixtures. No live production mutations are permitted during test execution.
3. **Multi-Tenant Boundary Testing**: Tests explicitly verify that academic-year boundaries and school tenant boundaries never leak data.

---

## 2. Test Suites & Execution Commands

### 1. Authoritative Financial Calculation Engine (`test-financial-calculation-engine.ts`)
Validates exact integer paise math, billing frequencies, mid-year proration, concessions/RTE waivers, partial payments, advance credits single-deduction, and idempotent retries.
```bash
npx tsx tests/test-financial-calculation-engine.ts
```
**Results**: **37 Passed, 0 Failed**.

### 2. Cross-Page Mathematical Reconciliation (`test-financial-cross-page-reconciliation.ts`)
Validates that Overview KPIs, Fee Reports, Dues & Reminders, and the Student Ledger arrive at the exact same figures.
```bash
npx tsx tests/test-financial-cross-page-reconciliation.ts
```
**Results**: **All Passed (0 discrepancy across all 4 modules)**.

### 3. Student Fee Ledger Redesign Suite (`test-student-fee-ledger-redesign.ts`)
Validates the 8-tab ledger drawer data aggregation, chronological debit/credit ordering, and running balance accuracy.
```bash
npx tsx tests/test-student-fee-ledger-redesign.ts
```
**Results**: **28 Passed, 0 Failed**.

### 4. Fee Collections & Counter Hardening (`test-fee-collections-hardening.ts`)
Validates cashier counter payment workflows, FIFO allocation, payment receipt numbering, and surplus wallet credit conversion.
```bash
npx tsx tests/test-fee-collections-hardening.ts
```
**Results**: **57 Passed, 0 Failed**.

### 5. Module Resolution & Regression Suite (`test-fee-dashboard-and-ledger-regression.ts`)
Validates the fix for the Vite HMR / 404 issue, React component function exports, Donut chart 100% invariant, and student/class name resolution.
```bash
npx tsx tests/test-fee-dashboard-and-ledger-regression.ts
```
**Results**: **20 Passed, 0 Failed**.

### 6. Invoices Management & Dual-Views Suite (`test-invoices-management-and-dual-views.ts`)
Validates individual invoice compilation, line item aggregation, status precedence (overdue vs partial), date range filtering (`due_date_from`, `due_date_to`), printable HTML generation via `generateInvoiceHTML`, and cross-view reconciliation between student summaries and invoices register.
```bash
npx tsx tests/test-invoices-management-and-dual-views.ts
```
**Results**: **All Passed (100% Green)**.

### 7. TypeScript Compilation & Lint Check
```bash
npm run lint
```
Executes `tsc --noEmit`.  
**Result**: **0 errors across the entire codebase**.

### 8. Production Build Verification
```bash
npm run build
```
Executes Vite production bundler and Node.js server compilation.  
**Result**: **Built successfully in 9.81s**.

---

## 3. Comprehensive Reconciliation Matrix

| Test Domain | Target Invariant | Actual Result | Status |
| :--- | :--- | :--- | :---: |
| **Integer Math** | `Gross == Net + Concession` | Exact match (0 paise diff) | PASS |
| **Balance Math** | `Balance == Net - Paid` | Exact match (0 paise diff) | PASS |
| **Overdue Subset** | `Overdue <= Outstanding` | Strict subset verified | PASS |
| **Donut Percentage**| `cpct + ppct + opct === 100%` | Exact 100% guaranteed | PASS |
| **Receipts** | Exclude `status = 'cancelled'` | 100% excluded | PASS |
| **Cross-Page** | `Dashboard == Reports == Ledger`| 0 paise discrepancy (0%) | PASS |
| **Module Export** | `StudentFeeLedgerView` exists | Exported and mountable | PASS |
