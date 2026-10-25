# Fee Management — Canonical Financial Rules & Reconciliation Engine

## 1. Executive Accounting Principles

The MyZkool Fee Management engine follows standard double-entry institutional accounting standards tailored for educational ERPs:
1. **Exact Integer Arithmetic**: All monetary quantities are tracked in integer paise (100 paise = 1 INR). Division or percentage operations strictly floor or round to whole paise integers with remainder adjustment.
2. **Single Canonical Obligation**: Each assessed charge exists once in `student_dues`. Invoices and receipts reference these obligations; they never duplicate or act as secondary liabilities.
3. **Strict Invariant Equations**:
   - `Gross Billed = Net Billed + Concessions`
   - `Net Billed = Paid Amount + Balance Amount`
   - `Net Outstanding = Gross Outstanding - Advance Credits Applied`
   - `Overdue Dues ⊆ Net Outstanding` (Overdue is strictly a temporal subset of outstanding dues, never additive).

---

## 2. Canonical Metric Definitions

### 1. Total Assessed Fees (Gross Billed)
The sum of all base obligations generated for an academic year, before any scholarship, concession, or discount is applied.
$$\text{Gross Billed} = \sum_{d \in D_{\text{active}}} d.\text{gross\_paise}$$
*Excluded: Any due with `status = 'cancelled'` or `deleted_at IS NOT NULL`.*

### 2. Concessions & Waivers
Total monetary value of approved fee reductions, including:
- Merit scholarships
- Sibling discounts
- Staff child concessions
- Right to Education (RTE) statutory 100% tuition waivers
$$\text{Total Concessions} = \sum_{d \in D_{\text{active}}} d.\text{concession\_paise}$$

### 3. Net Assessed Fees (Net Billed)
The actual legal obligation owed by the student body to the institution for the academic year.
$$\text{Net Billed} = \text{Gross Billed} - \text{Total Concessions} = \sum_{d \in D_{\text{active}}} d.\text{net\_paise}$$

### 4. Amount Collected (Active Realized Revenue)
Total funds collected and cleared through active receipts during the academic year.
$$\text{Amount Collected} = \sum_{r \in R_{\text{active}}} r.\text{total\_paise}$$
*Strict Invalidation Rule: Any receipt marked `status = 'cancelled'` or `status = 'refunded'` is completely excluded from collected revenue.*

### 5. Outstanding Dues (Gross & Net Pending)
- **Gross Outstanding Dues**: The sum of all unpaid balances on active dues.
  $$\text{Gross Outstanding} = \sum_{d \in D_{\text{active}}} d.\text{balance\_paise}$$
- **Net Outstanding Dues**: Gross outstanding reduced by unallocated advance credits held in student fee wallets.
  $$\text{Net Outstanding} = \max(0, \text{Gross Outstanding} - \text{Total Advance Credits})$$

### 6. Overdue Dues (Temporal Subset)
Dues that remain unpaid where the due date is strictly in the past relative to the evaluation date ($\text{due\_date} < \text{asOfDate}$).
$$\text{Overdue Dues} = \sum_{d \in D_{\text{active}}, d.\text{due\_date} < \text{asOfDate}} d.\text{balance\_paise}$$
> **CRITICAL ARCHITECTURAL RULE**:  
> Overdue dues are **never** added to outstanding dues to form a total liability. Overdue dues represent the aging delinquency of the outstanding balance.  
> The dashboard UI explicitly decomposes outstanding dues into:  
> $\text{Outstanding Dues} = \text{Current Dues (Not yet due)} + \text{Overdue Dues}$.

### 7. Advance Credits (Wallet Balance)
Prepayments or surplus amounts paid by parents in excess of billed obligations.
$$\text{Total Advance Credits} = \sum_{c \in C_{\text{available}}} c.\text{amount\_paise}$$
Advance credits may be offset automatically or manually against future installment terms.

---

## 3. Donut Chart Mathematical Invariant

The Collection Status Donut chart on the Fee Dashboard provides executive breakdown of the total assessed net billing. To prevent rounding truncation anomalies (e.g. 33.3% + 33.3% + 33.3% = 99%), the engine computes rounded whole percentages and assigns the remainder to the largest component:

$$\text{cpct} = \text{round}\left(\frac{\text{Collected}}{\text{Net Billed}} \times 100\right)$$
$$\text{ppct} = \text{round}\left(\frac{\text{Current Pending}}{\text{Net Billed}} \times 100\right)$$
$$\text{opct} = 100 - (\text{cpct} + \text{ppct})$$

**Guaranteed Invariant:**
$$\text{cpct} + \text{ppct} + \text{opct} \equiv 100\%$$

---

## 4. Payment Allocation Strategy

When a student pays an arbitrary sum (e.g., ₹5,000 against multiple terms), payments are allocated using deterministic **FIFO (First In, First Out) by Due Date**:
1. Sort active obligations with `balance_paise > 0` ascending by `due_date`, then by `id`.
2. Allocate funds to the earliest due first until its balance is 0.
3. If funds remain, cascade to the next due in chronological sequence.
4. If all active dues reach a zero balance and funds remain, convert the residual amount into a new record in `fee_credits` with `status = 'available'`.

---

## 5. Cancellation & Reversal Protocol

- **Receipt Cancellation**:
  - Reverses payments allocated in `fee_receipt_items`.
  - Increments `balance_paise` and decrements `paid_paise` on the target `student_dues`.
  - Resets the due status from `'paid'` back to `'partial'` or `'pending'`.
  - Changes receipt status to `'cancelled'` with an immutable audit entry (`cancelled_by`, `cancelled_at`, `reason`).
- **Due Cancellation**:
  - Sets due status to `'cancelled'`.
  - Excluded from all outstanding balances and dashboard KPIs.
