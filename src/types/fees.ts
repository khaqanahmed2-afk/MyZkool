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
  created_at: string;
  updated_at: string;
}

export interface FeeStructure {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_id: string;
  name: string;
  applies_to: StructureAppliesTo;
  version: number;
  status: StructureStatus;
  created_at: string;
  updated_at: string;
}

export interface FeeStructureItem {
  id: string;
  school_id: string;
  structure_id: string;
  fee_head_id: string;
  pattern: FillPattern;
}

export interface FeeStructureItemTerm {
  item_id: string;
  term_id: string;
  amount_paise: number;
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
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Joined fields
  fee_head_name?: string;
  term_name?: string;
}

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
  status: 'active' | 'revoked';
  created_at: string;
  updated_at: string;
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
}

export interface FeeTermInput {
  name: string;
  period_start?: string;
  period_end?: string;
  due_date: string;
  late_grace_days?: number;
  sort_order?: number;
}

export interface FeeStructureInput {
  class_id: string;
  name: string;
  applies_to: StructureAppliesTo;
  academic_year_id: string;
}

export interface StructureGridUpdate {
  structure_id: string;
  fee_head_id: string;
  terms: { term_id: string; amount_paise: number }[];
  pattern: FillPattern;
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
  sibling_from_rank?: number;
  auto_apply?: boolean;
  needs_approval?: boolean;
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

