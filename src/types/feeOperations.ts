/**
 * Fee Operations Types (Phase 4)
 * Dashboard, Defaulters, Cheques, Refunds, Day Close, Reports, Late Fee, Year Close
 */

export interface FeeReminderRule {
  id: string;
  school_id: string;
  name: string;
  days_offset: number;       // e.g. -3, 0, 7, 15, 30
  channel: "whatsapp" | "sms";
  template_key: string;
  is_active: boolean;
  max_sends: number;
  min_balance_paise: number;
  created_at: string;
  updated_at: string;
}

export interface FeeFollowup {
  id: string;
  school_id: string;
  student_id: string;
  staff_id?: string;
  note: string;
  promise_date?: string | null;
  status: "pending" | "kept" | "broken";
  created_at: string;
  updated_at: string;
}

export interface FeeRefund {
  id: string;
  school_id: string;
  student_id: string;
  receipt_id?: string | null;
  academic_year_id: string;
  amount_paise: number;
  reason: string;
  status: "requested" | "approved" | "rejected" | "paid";
  payment_mode: "cash" | "bank_transfer" | "cheque" | "upi" | "other";
  reference_no?: string | null;
  requested_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  ledger_entry_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DenominationCount {
  notes_2000?: number;
  notes_500?: number;
  notes_200?: number;
  notes_100?: number;
  notes_50?: number;
  notes_20?: number;
  notes_10?: number;
  coins_10?: number;
  coins_5?: number;
  coins_2?: number;
  coins_1?: number;
}

export interface DayClosing {
  id: string;
  school_id: string;
  business_date: string;
  opening_cash_paise: number;
  system_cash_paise: number;
  refunds_cash_paise: number;
  expected_cash_paise: number;
  counted_cash_paise?: number | null;
  denominations?: DenominationCount | null;
  difference_paise?: number | null;
  notes?: string | null;
  totals_by_mode?: Record<string, number>;
  status: "closed" | "reopened";
  closed_by?: string | null;
  closed_at: string;
  reopened_by?: string | null;
  reopened_at?: string | null;
  reopen_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChequeItem {
  id: string;
  payment_id: string;
  receipt_id: string;
  receipt_no: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  amount_paise: number;
  bank_name: string;
  cheque_no: string;
  cheque_date: string;
  status: "received" | "deposited" | "cleared" | "bounced";
  deposited_at?: string | null;
  cleared_at?: string | null;
  bounced_at?: string | null;
  bounce_reason?: string | null;
  bounce_charge_paise?: number | null;
}

export interface YearCloseStudentPreview {
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  outstanding_paise: number;
  unpaid_dues_count: number;
}

export interface YearClosePreview {
  current_year_id: string;
  target_year_id: string;
  total_students_with_balance: number;
  total_outstanding_paise: number;
  students: YearCloseStudentPreview[];
}

export interface YearCloseResult {
  closed_year_id: string;
  target_year_id: string;
  students_carried_forward: number;
  total_paise_carried_forward: number;
  dues_created_count: number;
}

export interface OutstandingReportRow {
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  section_name?: string;
  primary_parent_name?: string;
  primary_parent_phone?: string;
  total_gross_paise: number;
  total_concession_paise: number;
  total_net_paise: number;
  total_paid_paise: number;
  total_balance_paise: number;
  oldest_due_date: string;
  days_overdue: number;
  aging_bucket: "0_30" | "31_60" | "61_90" | "90_plus";
  last_reminder_at?: string | null;
  followup_note?: string | null;
  promise_date?: string | null;
}

export interface DayBookReportRow {
  entry_id: string;
  business_date: string;
  entry_type: "receipt" | "refund" | "cancellation";
  reference_no: string;
  student_name: string;
  admission_no: string;
  payment_mode: string;
  amount_paise: number;
  collected_by?: string | null;
  status: string;
}
