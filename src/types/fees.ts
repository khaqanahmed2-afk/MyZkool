/**
 * Fee Module Domain Types (Phase 2)
 * All amounts in integer paise.
 */

// ─── Enums ─────────────────────────────────────────────────────────────────

export type FeeHeadKind = 'recurring' | 'one_time';

export type StructureAppliesTo = 'all' | 'new_admission' | 'existing';

export type StructureStatus = 'draft' | 'active' | 'archived';

export type FillPattern = 'equal_all_terms' | 'first_term_only' | 'custom';

export type DueSource =
  | 'structure'
  | 'transport'
  | 'manual'
  | 'late_fee'
  | 'carry_forward'
  | 'adjustment';

export type DueStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'cancelled'
  | 'carried_forward'
  | 'waived';

export type ConcessionBasis =
  | 'sibling'
  | 'staff_ward'
  | 'rte'
  | 'ews'
  | 'merit'
  | 'management'
  | 'other';

export type ConcessionType = 'percent' | 'fixed';

export type LateFeeMethod =
  | 'flat_once'
  | 'per_day'
  | 'per_week'
  | 'per_month'
  | 'percent_once';

export type LedgerEntryType =
  | 'due_created'
  | 'concession'
  | 'payment'
  | 'refund'
  | 'reversal'
  | 'waiver'
  | 'late_fee'
  | 'adjustment'
  | 'carry_forward'
  | 'cancel_due';

export type ApprovalKind =
  | 'discount'
  | 'receipt_cancel'
  | 'refund'
  | 'backdate'
  | 'late_fee_waiver'
  | 'tc_override'
  | 'structure_change';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type TermPreset = 'monthly' | 'quarterly' | 'three_term' | 'half_yearly' | 'yearly' | 'custom';

// ─── Entities ───────────────────────────────────────────────────────────────

export interface FeeHead {
  id: string;
  school_id: string;
  name: string;
  code: string;
  kind: FeeHeadKind;
  is_refundable: boolean;
  rte_waivable: boolean;
  is_system: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeTerm {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  period_start?: string | null;
  period_end?: string | null;
  due_date: string;
  late_grace_days: number;
  sort_order: number;
  applicable_fee_head_ids?: string[];
  created_at: string;
  updated_at: string;
}

export type FeeCycleFrequency = 'monthly' | 'quarterly' | 'three_term' | 'half_yearly' | 'yearly' | 'annual' | 'custom';

export type StructureTargetType = 'all_classes' | 'specific_classes' | 'specific_sections' | 'specific_students';

export type FeeHeadFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_time' | 'custom';

export interface FeeCycleSchedule {
  academic_year_id: string;
  frequency: FeeCycleFrequency;
  terms: FeeTerm[];
  head_mapping: Record<string, string[]>; // head_id -> term_ids[]
  updated_at: string;
}

export interface FeeStructure {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_id?: string | null;
  name: string;
  applies_to: StructureAppliesTo;
  target_type?: StructureTargetType;
  class_ids?: string[];
  section_ids?: string[];
  student_ids?: string[];
  description?: string;
  version: number;
  status: StructureStatus;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FeeStructureItem {
  id: string;
  school_id: string;
  structure_id: string;
  fee_head_id: string;
  pattern: FillPattern;
  frequency?: FeeHeadFrequency;
  is_mandatory?: boolean;
  proration_rule?: 'full' | 'prorated' | 'none';
  start_date?: string | null;
  end_date?: string | null;
  amount_paise?: number;
}

export interface FeeStructureItemTerm {
  item_id: string;
  term_id: string;
  amount_paise: number;
}

export interface FeeStructureConfigItem {
  fee_head_id: string;
  frequency: FeeHeadFrequency;
  base_amount_rupees: number;
  is_mandatory: boolean;
  proration_rule: 'full' | 'prorated' | 'none';
  start_date?: string | null;
  end_date?: string | null;
  term_amounts: Record<string, number>; // term_id -> amount_rupees
}

export interface StudentFeeAssignment {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  structure_id: string;
  structure_version: number;
  assigned_at: string;
  assigned_by?: string | null;
  status: 'active' | 'replaced';
}

export interface StudentDue {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  fee_head_id: string;
  term_id?: string | null;
  source: DueSource;
  source_ref?: string | null;
  description?: string | null;
  gross_paise: number;
  concession_paise: number;
  net_paise: number;
  paid_paise: number;
  balance_paise: number;
  due_date: string;
  status: DueStatus;
  invoice_no?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Joined fields
  fee_head_name?: string;
  term_name?: string;
}

export type StudentConcessionStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'revoked'
  | 'rejected';

export type ConcessionCategory =
  | 'sibling'
  | 'merit'
  | 'financial_aid'
  | 'staff_ward'
  | 'management'
  | 'other';

export interface ConcessionRule {
  id: string;
  school_id: string;
  name: string;
  basis: ConcessionBasis;
  type: ConcessionType;
  value: number;
  fee_head_ids: string[];
  sibling_from_rank?: number | null;
  auto_apply: boolean;
  needs_approval: boolean;
  is_active: boolean;
  description?: string | null;
  max_cap_paise?: number | null;
  academic_year_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentConcession {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  rule_id?: string | null;
  type: ConcessionType;
  value: number;
  fee_head_ids: string[];
  reason: string;
  document_id?: string | null;
  from_term_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  status: StudentConcessionStatus;
  created_at: string;
  updated_at: string;
  // Enhanced fields
  valid_from?: string | null;
  valid_to?: string | null;
  concession_type?: string;
  billing_period?: string;
  document_url?: string | null;
  document_name?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  created_by?: string | null;
  // Joined fields for display
  student_name?: string;
  admission_no?: string;
  class_name?: string;
  section_name?: string;
  rule_name?: string;
}

export interface ConcessionSummaryMetrics {
  activeCount: number;
  discountThisMonthPaise: number;
  pendingCount: number;
  scheduledCount: number;
  totalCount: number;
}

export interface ConcessionFilters {
  search?: string;
  academicYearId?: string;
  classId?: string;
  concessionType?: string;
  status?: string;
  chipFilter?: string;
}

export interface LateFeeRule {
  id: string;
  school_id: string;
  name: string;
  fee_head_ids?: string[] | null;
  method: LateFeeMethod;
  value: number;
  grace_days: number;
  max_cap_paise?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeSettings {
  school_id: string;
  receipt_prefix: string;
  receipt_paper: 'a5' | 'thermal80';
  receipt_language: 'en' | 'hi' | 'both';
  allow_partial: boolean;
  min_partial_paise: number;
  allow_advance: boolean;
  allocation_mode: 'auto_oldest_first' | 'manual';
  round_to_rupee: boolean;
  backdate_days_limit: number;
  discount_approval_threshold_percent: number;
  auto_assign_fee_on_admission: boolean;
  auto_late_fee: boolean;
  cheque_receipt_timing: 'on_receipt' | 'on_clearance';
  parent_pay_enabled: boolean;
  gateway_fee_bearer: 'school' | 'parent';
  auto_print_receipt: boolean;
  owner_pin_hash?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeLedgerEntry {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  due_id?: string | null;
  receipt_id?: string | null;
  entry_type: LedgerEntryType;
  amount_paise: number;
  note?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface FeeCredit {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  amount_paise: number;
  remaining_paise: number;
  source_receipt_id?: string | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  school_id: string;
  kind: ApprovalKind;
  entity_type?: string | null;
  entity_id?: string | null;
  payload: Record<string, unknown>;
  requested_by?: string | null;
  status: ApprovalStatus;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
  created_at: string;
  updated_at: string;
  // Joined display fields
  requester_name?: string;
  impact_summary?: string;
}

// ─── Input Types ────────────────────────────────────────────────────────────

export interface FeeHeadInput {
  name: string;
  code: string;
  kind: FeeHeadKind;
  is_refundable?: boolean;
  rte_waivable?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface FeeTermInput {
  id?: string;
  name: string;
  period_start?: string | null;
  period_end?: string | null;
  due_date: string;
  late_grace_days?: number;
  sort_order?: number;
  applicable_fee_head_ids?: string[];
}

export interface FeeStructureInput {
  name: string;
  academic_year_id: string;
  class_id?: string | null;
  applies_to?: StructureAppliesTo;
  target_type?: StructureTargetType;
  class_ids?: string[];
  section_ids?: string[];
  student_ids?: string[];
  description?: string;
  status?: StructureStatus;
  version?: number;
  metadata?: Record<string, any>;
}

export interface StructureGridUpdate {
  structure_id: string;
  fee_head_id: string;
  terms: { term_id: string; amount_paise: number }[];
  pattern: FillPattern;
  frequency?: FeeHeadFrequency;
  is_mandatory?: boolean;
  proration_rule?: 'full' | 'prorated' | 'none';
  start_date?: string | null;
  end_date?: string | null;
  amount_paise?: number;
}

export interface ManualDueInput {
  fee_head_id: string;
  gross_paise: number;
  due_date: string;
  description?: string;
  term_id?: string;
}

export interface ConcessionRuleInput {
  name: string;
  basis: ConcessionBasis;
  type: ConcessionType;
  value: number;
  fee_head_ids?: string[];
  description?: string;
  max_cap_paise?: number;
  academic_year_id?: string;
  auto_apply?: boolean;
  needs_approval?: boolean;
  sibling_from_rank?: number;
}

export interface StudentConcessionInput {
  student_id: string;
  academic_year_id: string;
  rule_id?: string | null;
  concession_type: string;
  type: ConcessionType;
  value: number;
  fee_head_ids: string[];
  valid_from: string;
  valid_to: string;
  billing_period: string;
  reason: string;
  document_url?: string | null;
  document_name?: string | null;
  notes?: string | null;
  status?: StudentConcessionStatus;
}


export interface LateFeeRuleInput {
  name: string;
  fee_head_ids?: string[];
  method: LateFeeMethod;
  value: number;
  grace_days?: number;
  max_cap_paise?: number;
}

export interface FeeSettingsInput {
  receipt_prefix?: string;
  receipt_paper?: 'a5' | 'thermal80';
  receipt_language?: 'en' | 'hi' | 'both';
  allow_partial?: boolean;
  min_partial_paise?: number;
  allow_advance?: boolean;
  allocation_mode?: 'auto_oldest_first' | 'manual';
  round_to_rupee?: boolean;
  backdate_days_limit?: number;
  discount_approval_threshold_percent?: number;
  auto_assign_fee_on_admission?: boolean;
  auto_late_fee?: boolean;
  cheque_receipt_timing?: 'on_receipt' | 'on_clearance';
  parent_pay_enabled?: boolean;
  gateway_fee_bearer?: 'school' | 'parent';
  auto_print_receipt?: boolean;
  new_pin?: string;           // plaintext; service hashes before storing
}

export interface ApprovalRequestInput {
  kind: ApprovalKind;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, unknown>;
  impact_summary?: string;
}

// ─── Generation types ────────────────────────────────────────────────────────

export interface DuesGenerationException {
  student_id: string;
  student_name: string;
  admission_no: string;
  reason: string;
}

export interface DuesGenerationPreview {
  student_count: number;
  due_line_count: number;
  total_demand_paise: number;
  already_generated_count: number;
  exceptions: DuesGenerationException[];
}

export interface DuesGenerationResult {
  created_count: number;
  skipped_count: number;
  exceptions: DuesGenerationException[];
}

export interface ProrateOption {
  mode: 'full_year' | 'from_current_term' | 'from_term';
  from_term_id?: string;
}

// ─── Suggested heads constant ────────────────────────────────────────────────

export const SUGGESTED_FEE_HEADS: { code: string; name: string; kind: FeeHeadKind; is_refundable: boolean; rte_waivable: boolean }[] = [
  { code: 'admission_fee',    name: 'Admission Fee',       kind: 'one_time',   is_refundable: false, rte_waivable: false },
  { code: 'registration_fee', name: 'Registration Fee',    kind: 'one_time',   is_refundable: false, rte_waivable: false },
  { code: 'tuition_fee',      name: 'Tuition Fee',         kind: 'recurring',  is_refundable: false, rte_waivable: true  },
  { code: 'annual_charges',   name: 'Annual Charges',      kind: 'one_time',   is_refundable: false, rte_waivable: true  },
  { code: 'development_fee',  name: 'Development Fee',     kind: 'recurring',  is_refundable: false, rte_waivable: false },
  { code: 'exam_fee',         name: 'Exam Fee',            kind: 'recurring',  is_refundable: false, rte_waivable: false },
  { code: 'computer_fee',     name: 'Computer Fee',        kind: 'recurring',  is_refundable: false, rte_waivable: false },
  { code: 'activity_fee',     name: 'Activity Fee',        kind: 'recurring',  is_refundable: false, rte_waivable: false },
  { code: 'library_fee',      name: 'Library Fee',         kind: 'recurring',  is_refundable: false, rte_waivable: false },
  { code: 'lab_fee',          name: 'Lab Fee',             kind: 'recurring',  is_refundable: false, rte_waivable: false },
  { code: 'caution_deposit',  name: 'Caution Deposit',     kind: 'one_time',   is_refundable: true,  rte_waivable: false },
  { code: 'miscellaneous',    name: 'Miscellaneous',       kind: 'one_time',   is_refundable: false, rte_waivable: false },
];

export const SYSTEM_FEE_HEADS: { code: string; name: string; kind: FeeHeadKind }[] = [
  { code: 'transport_fee',    name: 'Transport Fee',       kind: 'recurring' },
  { code: 'late_fee',         name: 'Late Fee',            kind: 'one_time'  },
  { code: 'prev_year_dues',   name: 'Previous Year Dues',  kind: 'one_time'  },
];

// ─── Permission keys ─────────────────────────────────────────────────────────

export type FeePermission =
  | 'fees.read'
  | 'fees.setup'
  | 'fees.dues.manage'
  | 'fees.collect'
  | 'fees.concession.give'
  | 'fees.approve'
  | 'fees.waive_late'
  | 'fees.backdate'
  | 'fees.receipt.cancel'
  | 'fees.refund'
  | 'fees.day_close'
  | 'fees.reports'
  | 'fees.remind';

/** Permissions granted to 'owner' role by default */
export const OWNER_FEE_PERMISSIONS: FeePermission[] = [
  'fees.read', 'fees.setup', 'fees.dues.manage', 'fees.collect',
  'fees.concession.give', 'fees.approve', 'fees.waive_late', 'fees.backdate',
  'fees.receipt.cancel', 'fees.refund', 'fees.day_close', 'fees.reports', 'fees.remind',
];

/** Permissions granted to 'accountant' role by default */
export const ACCOUNTANT_FEE_PERMISSIONS: FeePermission[] = [
  'fees.read', 'fees.setup', 'fees.dues.manage', 'fees.collect',
  'fees.concession.give', 'fees.day_close', 'fees.reports', 'fees.remind',
];

// ─── Student Invoice Domain Types ───────────────────────────────────────────

export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'cancelled' | 'draft';

export interface InvoiceLineItem {
  due_id: string;
  fee_head_id: string;
  fee_head_name: string;
  fee_head_code?: string;
  source: DueSource;
  source_ref?: string | null;
  description?: string | null;
  gross_paise: number;
  concession_paise: number;
  net_paise: number;
  paid_paise: number;
  balance_paise: number;
  due_date: string;
  status: DueStatus;
  is_transport: boolean;
}

export interface InvoicePaymentRecord {
  receipt_id: string;
  receipt_no: string;
  receipt_date: string;
  amount_paise: number;
  payment_mode: string;
  collected_by_name?: string;
}

export interface StudentInvoice {
  id: string;
  invoice_no: string;
  school_id: string;
  academic_year_id: string;
  academic_year_name?: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  roll_no?: string;
  class_id?: string;
  class_name: string;
  section_id?: string;
  section_name?: string;
  guardian_name?: string;
  guardian_phone?: string;
  term_id: string;
  billing_period: string;
  invoice_date: string;
  due_date: string;
  total_paise: number;
  net_paise?: number;
  gross_paise: number;
  concession_paise: number;
  late_fee_paise: number;
  transport_paise: number;
  tuition_paise: number;
  paid_paise: number;
  balance_paise: number;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  payments: InvoicePaymentRecord[];
  whatsapp_sent_at?: string | null;
  notes?: string;
  created_at: string;
}

export interface InvoiceSummaryMetrics {
  totalInvoicedPaise: number;
  totalPaidPaise: number;
  outstandingPaise: number;
  overdueCount: number;
  overduePaise: number;
  invoiceCount: number;
  paidCount: number;
  pendingCount: number;
  draftCount?: number;
  cancelledCount?: number;
}

export interface InvoiceFilters {
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  term_id?: string;
  status?: 'all' | InvoiceStatus | string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'due_date' | 'amount' | 'student' | 'invoice_no';
  sortOrder?: 'asc' | 'desc';
}

