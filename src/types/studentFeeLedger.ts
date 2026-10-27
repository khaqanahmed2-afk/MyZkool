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
  is_rte?: boolean;

  // Academic placement
  class_id?: string;
  class_name: string;
  section_id?: string;
  section_name: string;
  academic_year_id: string;
  academic_year_name?: string;

  // Applicable fee structure
  applicable_fee_structure?: string;
  applicable_fee_structure_name?: string;

  // Guardian details
  parent_name: string;
  parent_phone: string;
  parent_relation: string;

  // Transport details
  has_transport: boolean;
  transport_opted?: boolean;
  transport_route?: string;
  transport_zone_route?: string;
  transport_stop?: string;

  // Financial figures (in integer paise)
  total_billed_paise?: number; // Gross fees billed
  total_charges_paise?: number; // Total assessed charges
  total_applicable_paise: number; // Net applicable fees
  net_applicable_paise?: number; // Alias for total_applicable_paise
  total_concession_paise?: number; // Valid discounts & concessions
  total_concessions_paise?: number; // Alias for total_concession_paise
  total_paid_paise: number;
  paid_amount_paise?: number; // Alias for total_paid_paise
  total_pending_paise: number; // Outstanding balance
  pending_amount_paise?: number; // Alias for total_pending_paise
  total_overdue_paise: number; // Overdue balance
  overdue_amount_paise?: number; // Alias for total_overdue_paise
  advance_credit_paise?: number;
  net_pending_paise?: number;

  // Due date & status
  next_due_date: string | null;
  overdue_days: number;
  fee_status: StudentFeeStatus;

  // Internal counts & classification
  total_invoices_count?: number;
  unpaid_invoices_count?: number;
  has_fee_structure?: boolean;
  is_transport_only?: boolean;
}

export interface StudentFeeSummaryMetrics {
  total_students_with_records: number;
  total_enrolled_count?: number;
  structure_assigned_count?: number;
  students_with_invoices_count?: number;
  transport_only_count?: number;
  total_gross_paise?: number;
  total_concessions_paise?: number;
  total_fees_paise: number;
  total_collected_paise: number;
  total_pending_paise: number;
  total_advance_credit_paise?: number;
  net_pending_paise?: number;
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
  quick_pill?: 'all' | 'structure_assigned' | 'with_invoices' | 'with_dues' | 'overdue' | 'fully_paid' | 'partially_paid' | 'upcoming' | 'transport_only';
  due_date_from?: string;
  due_date_to?: string;
  page?: number;
  pageSize?: number;
  sort_by?: 'student_name' | 'admission_no' | 'total_fee' | 'paid' | 'pending' | 'overdue' | 'next_due_date' | 'status' | 'class';
  sort_order?: 'asc' | 'desc';
}

export interface LedgerTransactionItem {
  id: string;
  date: string;
  ref_no: string; // Invoice number (e.g. INV-2026-089) or Receipt number (e.g. RCPT-2026-145)
  period: string; // e.g. "April 2026", "2026–2027 Session"
  billing_period?: string; // Canonical billing period identifier
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
  internal_note?: string; // Audit trail and synchronization details for secondary view
  audit_ref?: string; // Internal database reference (e.g. DUE-c3c9812f)
  is_unclassified?: boolean; // Flagged when charge period cannot be verified
  academic_year?: string;
  allocations?: Array<{
    due_id?: string;
    due_description?: string;
    amount_paise: number;
    billing_period?: string;
  }>;
}

export interface FeeObligationBreakdownItem {
  id: string; // due_id
  description: string; // e.g. "April 2026 Development Fee"
  category: string; // "Tuition", "Transport", "Exam", "Development", "Admission", "Annual"
  billing_period: string; // "April 2026", "2026–2027"
  academic_year: string;
  original_amount_paise: number; // gross_paise
  paid_paise: number;
  waived_paise: number; // concession_paise
  pending_paise: number; // balance_paise
  due_date: string;
  status: 'Paid' | 'Unpaid' | 'Partial' | 'Overdue' | 'Waived';
  allocations: Array<{
    receipt_no: string;
    receipt_date: string;
    amount_paise: number;
    payment_mode?: string;
  }>;
}

export interface StudentLedgerDetails {
  student: StudentFeeSummary;
  metrics: {
    opening_balance_paise: number;
    total_charges_paise: number; // Gross assessed charges before concessions
    total_concessions_paise: number; // Approved concessions / waivers
    net_assessed_paise?: number; // Net applicable obligations (gross - concessions)
    total_payments_paise: number;
    total_refunds_paise: number;
    closing_balance_paise: number;
    overdue_balance_paise: number;
    advance_credits_paise?: number;
  };
  transactions: LedgerTransactionItem[];
  fee_breakdown?: FeeObligationBreakdownItem[];
  dues?: StudentDue[];
  receipts?: import('./collection').FeeReceipt[];
  invoices: StudentInvoice[];
  payments: Array<{
    id: string;
    receipt_no: string;
    receipt_date: string;
    total_paise: number;
    payment_mode: PaymentMode;
    collected_by_name?: string;
    remarks?: string;
    allocations?: Array<{
      due_id: string;
      due_description: string;
      amount_paise: number;
      billing_period: string;
    }>;
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
  transport_details?: {
    has_transport: boolean;
    route_name?: string;
    stop_name?: string;
    monthly_fee_paise?: number;
    total_billed_paise?: number;
    total_paid_paise?: number;
    total_pending_paise?: number;
  };
  advance_credits?: Array<{
    id: string;
    amount_paise: number;
    remaining_paise: number;
    receipt_no?: string;
    date?: string;
    note?: string;
  }>;
  advanceCredits?: Array<{
    id: string;
    amount_paise: number;
    remaining_paise: number;
    receipt_no?: string;
    date?: string;
    note?: string;
  }>;
  unreceipted_settlement?: {
    total_settled_paise: number;
    status: 'legacy_settlement' | 'unbacked_allocations';
    description: string;
    settled_dues: Array<{
      due_id: string;
      due_description: string;
      paid_paise: number;
      billing_period: string;
    }>;
  };
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
