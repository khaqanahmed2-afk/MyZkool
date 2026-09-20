/**
 * Collection types for Phase 3a
 * All amounts in integer paise.
 */

// ─── Payment modes ────────────────────────────────────────────────────────────
export type PaymentMode =
  | "cash" | "upi" | "card" | "cheque"
  | "bank_transfer" | "dd" | "online" | "other";

export type ReceiptStatus = "active" | "cancelled" | "bounced";
export type ReceiptSource = "counter" | "online" | "import";
export type ChequeStatus = "received" | "deposited" | "cleared" | "bounced";

// ─── Database rows ────────────────────────────────────────────────────────────

export interface FeeReceipt {
  id: string;
  school_id: string;
  receipt_no: string;
  student_id: string;
  academic_year_id: string;
  receipt_date: string;           // ISO date string YYYY-MM-DD
  total_paise: number;
  status: ReceiptStatus;
  source: ReceiptSource;
  payment_group_id: string | null;
  collected_by: string | null;
  remarks: string | null;
  idempotency_key: string | null;
  print_count: number;
  whatsapp_sent_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeReceiptItem {
  id: string;
  receipt_id: string;
  due_id: string;
  fee_head_id: string;
  amount_paise: number;
  concession_paise: number;
}

export interface FeePayment {
  id: string;
  school_id: string;
  receipt_id: string;
  mode: PaymentMode;
  amount_paise: number;
  reference_no: string | null;
  bank_name: string | null;
  instrument_no: string | null;
  instrument_date: string | null;
  cheque_status: ChequeStatus | null;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  created_at: string;
}

export interface DayClosing {
  id: string;
  school_id: string;
  business_date: string;
  opening_cash_paise: number;
  system_cash_paise: number;
  refunds_cash_paise: number;
  expected_cash_paise: number;
  counted_cash_paise: number | null;
  denominations: Record<string, number> | null;
  difference_paise: number | null;
  notes: string | null;
  status: "closed" | "reopened";
  closed_by: string | null;
  closed_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Allocation ───────────────────────────────────────────────────────────────

export interface AllocationLine {
  due_id: string;
  fee_head_id: string;
  fee_head_name?: string;
  due_date: string;
  gross_paise: number;
  net_paise: number;
  prior_paid_paise: number;
  balance_before: number;
  allocated_paise: number;     // amount this line gets from the payment
  balance_after: number;
}

export interface AllocationResult {
  lines: AllocationLine[];
  advance_paise: number;        // excess → credit
  total_allocated: number;
  total_paid: number;
}

// ─── Collect input / output ───────────────────────────────────────────────────

export interface CollectPaymentLine {
  mode: PaymentMode;
  amount_paise: number;
  reference_no?: string;
  bank_name?: string;
  instrument_no?: string;
  instrument_date?: string;
}

/** Input for POST /fee/collect */
export interface CollectInput {
  student_id: string;
  academic_year_id: string;
  receipt_date?: string;             // defaults to today Asia/Kolkata
  /** Which dues to pay (if empty and mode=auto, all pending sorted oldest-first) */
  selected_due_ids?: string[];
  /** Total cash/UPI/card handed over */
  payments: CollectPaymentLine[];
  remarks?: string;
  payment_group_id?: string;         // for family payment
  source?: ReceiptSource;
}

export interface CollectResult {
  receipt_id: string;
  receipt_no: string;
  idempotent: boolean;              // true if idempotency key returned existing receipt
  lines: AllocationLine[];
  advance_paise: number;
  total_paise: number;
}

// ─── Cancel input / output ────────────────────────────────────────────────────

export interface CancelReceiptInput {
  reason: string;                   // min 10 chars
  pin?: string;                     // owner PIN override
  approved_by?: string;             // approval request id
}

export interface CancelReceiptResult {
  cancelled: boolean;
  receipt_no: string;
  reversed_lines: number;
}

// ─── Collect context (for counter UI) ────────────────────────────────────────

export interface CollectContext {
  student: {
    id: string;
    name: string;
    admission_no: string;
    class_name?: string;
  };
  dues: import("./fees").StudentDue[];
  credits: import("./fees").FeeCredit[];
  siblings: Array<{
    student_id: string;
    name: string;
    admission_no: string;
    balance_paise: number;
  }>;
  has_structure: boolean;
}

// ─── Day closing ──────────────────────────────────────────────────────────────

export interface DayCloseInput {
  business_date: string;
  counted_cash_paise?: number;
  denominations?: Record<string, number>;
  notes?: string;
}

