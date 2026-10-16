/**
 * Student Fee Ledger & Dues Management Types
 * All amounts in integer paise.
 */

import type { PaymentMode } from './collection';
import type { StudentInvoice, StudentDue, StudentConcession } from './fees';

export type StudentFeeStatus =
  | 'overdue'
  | 'pending'
  | 'partially_paid'
  | 'fully_paid'
  | 'upcoming'
  | 'no_dues';

export interface StudentFeeSummary {
  student_id: string;
  student_name: string;
  admission_no: string;
  avatar_url?: string;
  gender?: string;
  student_status?: string;

  // Academic placement
  class_id?: string;
  class_name: string;
  section_id?: string;
  section_name: string;
  academic_year_id: string;
  academic_year_name?: string;

  // Guardian details
  parent_name: string;
  parent_phone: string;
  parent_relation: string;

  // Transport details
  has_transport: boolean;
  transport_route?: string;
  transport_stop?: string;

  // Financial figures (in integer paise)
  total_applicable_paise: number;
  total_paid_paise: number;
  total_pending_paise: number;
  total_overdue_paise: number;

  // Due date & status
  next_due_date: string | null;
  overdue_days: number;
  fee_status: StudentFeeStatus;

  // Internal counts
  total_invoices_count: number;
  unpaid_invoices_count: number;
}

export interface StudentFeeSummaryMetrics {
  total_students_with_records: number;
  total_fees_paise: number;
  total_collected_paise: number;
  total_pending_paise: number;
  total_overdue_paise: number;
  fully_paid_count: number;
  with_dues_count: number;
  partially_paid_count: number;
  upcoming_count: number;
  overdue_count: number;
  total_students_count: number;
  collection_percentage: number;
  pending_percentage: number;
  overdue_percentage: number;
  fully_paid_percentage: number;
  with_dues_percentage: number;
}

export interface StudentFeeFilterOptions {
  search?: string;
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  fee_status?: string; // 'all' | StudentFeeStatus | 'with_dues'
  transport_filter?: 'all' | 'transport_only' | 'non_transport';
  quick_pill?: 'all' | 'with_dues' | 'overdue' | 'fully_paid' | 'partially_paid' | 'upcoming';
  due_date_from?: string;
  due_date_to?: string;
  page?: number;
  pageSize?: number;
  sort_by?: 'student_name' | 'admission_no' | 'total_fee' | 'paid' | 'pending' | 'overdue' | 'next_due_date' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface LedgerTransactionItem {
  id: string;
  date: string;
  ref_no: string; // Invoice number (e.g. INV-2026-089) or Receipt number (e.g. RCPT-2026-145)
  period: string; // e.g. "Aug 2026", "Term 1 (Apr - Jun)"
  type: 'charge' | 'payment' | 'concession' | 'waiver' | 'refund' | 'adjustment';
  description: string;
  category?: string; // Tuition, Transport, Exam, Activity, Admission
  debit_paise: number; // Fees Charged
  credit_paise: number; // Payments and Approved Adjustments
  running_balance_paise: number;
  due_date?: string;
  payment_status: 'Paid' | 'Unpaid' | 'Partial' | 'Overdue' | 'Received' | 'Waived';
  payment_mode?: PaymentMode;
  receipt_id?: string;
  invoice_id?: string;
  raw_due_id?: string;
}

export interface StudentLedgerDetails {
  student: StudentFeeSummary;
  metrics: {
    opening_balance_paise: number;
    total_charges_paise: number;
    total_concessions_paise: number;
    total_payments_paise: number;
    total_refunds_paise: number;
    closing_balance_paise: number;
    overdue_balance_paise: number;
  };
  transactions: LedgerTransactionItem[];
  invoices: StudentInvoice[];
  payments: Array<{
    id: string;
    receipt_no: string;
    receipt_date: string;
    total_paise: number;
    payment_mode: PaymentMode;
    collected_by_name?: string;
    remarks?: string;
  }>;
  concessions: Array<{
    id: string;
    rule_name: string;
    basis: string;
    type: 'percent' | 'fixed';
    value: number;
    reason: string;
    status: string;
    applied_amount_paise: number;
  }>;
}

export interface StudentFeeListResponse {
  students: StudentFeeSummary[];
  allFilteredStudents: StudentFeeSummary[];
  metrics: StudentFeeSummaryMetrics;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  classes: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; class_id: string }>;
  academic_years: Array<{ id: string; name: string; is_current: boolean }>;
}
