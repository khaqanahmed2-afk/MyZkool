/**
 * Students Module Domain Types for MyZkool
 * Tenant-scoped student records, parents, documents, medical, and related entities
 */

export type StudentGender = 'male' | 'female' | 'other';
export type StudentCategory = 'general' | 'obc' | 'sc' | 'st' | 'ews';
export type StudentStatus = 'enrolled' | 'inactive' | 'transferred' | 'withdrawn' | 'passed_out';
export type AdmissionType = 'new' | 're_admission' | 'transfer_in';
export type AddressKind = 'current' | 'permanent';
export type ParentRelation = 'father' | 'mother' | 'guardian';
export type AchievementKind = 'academic' | 'sports' | 'arts' | 'olympiad' | 'other';
export type AchievementLevel = 'school' | 'district' | 'state' | 'national' | 'international';
export type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'rejected';
export type DocumentRequiredFor = 'all' | 'new' | 'category' | 'rte';
export type StudentEventKind = 'admitted' | 'class_changed' | 'status_changed' | 'document_verified' | 'promoted' | 'tc_issued' | 'readmitted' | 'note';
export type EnrollmentStatus = 'active' | 'promoted' | 'detained' | 'left' | 'passed_out';
export type ImportBatchStatus = 'validated' | 'committed' | 'rolled_back' | 'failed';
export type PromotionBatchStatus = 'draft' | 'running' | 'committed' | 'failed' | 'reverted';
export type CommunicationChannel = 'whatsapp' | 'sms' | 'email';
export type ConsentStatus = 'opted_in' | 'opted_out';
export type ConsentSource = 'admission_form' | 'parent_reply' | 'admin_entry';
export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
export type NotificationChannel = 'whatsapp' | 'sms' | 'email';

/**
 * Student entity
 */
export interface Student {
  id: string;
  school_id: string;
  admission_no: string;
  sr_no?: string | null;
  apaar_id?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  dob: string; // YYYY-MM-DD
  gender: StudentGender;
  blood_group?: string | null;
  nationality: string;
  religion?: string | null;
  category?: StudentCategory | null;
  mother_tongue?: string | null;
  is_rte: boolean;
  photo_path?: string | null;
  aadhaar_enc?: Uint8Array | null;
  aadhaar_last4?: string | null;
  aadhaar_hash?: string | null;
  admission_date: string; // YYYY-MM-DD
  admission_type: AdmissionType;
  admission_class_id?: string | null;
  status: StudentStatus;
  status_changed_on?: string | null; // YYYY-MM-DD
  status_reason?: string | null;
  house?: string | null;
  medium?: string | null;
  import_batch_id?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

/**
 * Student input for creation
 */
export interface StudentInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  dob: string; // YYYY-MM-DD
  gender: StudentGender;
  blood_group?: string;
  nationality?: string;
  religion?: string;
  category?: StudentCategory;
  mother_tongue?: string;
  is_rte?: boolean;
  photo_path?: string;
  admission_date: string; // YYYY-MM-DD
  admission_type: AdmissionType;
  admission_class_id?: string;
  house?: string;
  medium?: string;
  sr_no?: string;
  apaar_id?: string;
}

/**
 * Student update input (partial)
 */
export interface StudentUpdateInput {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  dob?: string;
  gender?: StudentGender;
  blood_group?: string;
  nationality?: string;
  religion?: string;
  category?: StudentCategory;
  mother_tongue?: string;
  is_rte?: boolean;
  house?: string;
  medium?: string;
  sr_no?: string;
  apaar_id?: string;
  status?: StudentStatus;
  status_changed_on?: string;
  status_reason?: string;
}

/**
 * Student address
 */
export interface StudentAddress {
  id: string;
  school_id: string;
  student_id: string;
  kind: AddressKind;
  line1: string;
  line2?: string | null;
  locality?: string | null;
  landmark?: string | null;
  city: string;
  district: string;
  state: string;
  pin: string; // 6 digits
  created_at: string;
  updated_at: string;
}

export interface StudentAddressInput {
  kind: AddressKind;
  line1: string;
  line2?: string;
  locality?: string;
  landmark?: string;
  city: string;
  district: string;
  state: string;
  pin: string;
}

/**
 * Parent entity (standalone)
 */
export interface Parent {
  id: string;
  school_id: string;
  full_name: string;
  phone: string; // 10 digits, normalized
  whatsapp_phone?: string | null;
  email?: string | null;
  occupation?: string | null;
  qualification?: string | null;
  annual_income_band?: string | null;
  photo_path?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParentInput {
  full_name: string;
  phone: string;
  whatsapp_phone?: string;
  email?: string;
  occupation?: string;
  qualification?: string;
  annual_income_band?: string;
}

export interface ParentUpdateInput {
  full_name?: string;
  phone?: string;
  whatsapp_phone?: string;
  email?: string;
  occupation?: string;
  qualification?: string;
  annual_income_band?: string;
}

/**
 * Student-Parent join table
 */
export interface StudentParent {
  id: string;
  school_id: string;
  student_id: string;
  parent_id: string;
  relation: ParentRelation;
  is_primary_contact: boolean;
  is_fee_payer: boolean;
  is_emergency_contact: boolean;
  can_pickup: boolean;
  lives_with: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentParentInput {
  student_id: string;
  parent_id: string;
  relation: ParentRelation;
  is_primary_contact?: boolean;
  is_fee_payer?: boolean;
  is_emergency_contact?: boolean;
  can_pickup?: boolean;
  lives_with?: boolean;
}

/**
 * Student previous school
 */
export interface StudentPreviousSchool {
  id: string;
  school_id: string;
  student_id: string;
  school_name: string;
  board?: string | null;
  last_class?: string | null;
  tc_no?: string | null;
  tc_date?: string | null; // YYYY-MM-DD
  result_percent?: number | null;
  reason_for_leaving?: string | null;
  medium?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentPreviousSchoolInput {
  school_name: string;
  board?: string;
  last_class?: string;
  tc_no?: string;
  tc_date?: string;
  result_percent?: number;
  reason_for_leaving?: string;
  medium?: string;
}

/**
 * Student achievement
 */
export interface StudentAchievement {
  id: string;
  school_id: string;
  student_id: string;
  kind: AchievementKind;
  title: string;
  level: AchievementLevel;
  year: number;
  position_or_award?: string | null;
  document_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentAchievementInput {
  kind: AchievementKind;
  title: string;
  level: AchievementLevel;
  year: number;
  position_or_award?: string;
  document_id?: string;
}

/**
 * Document type (school-level configuration)
 */
export interface DocumentType {
  id: string;
  school_id: string;
  key: string;
  label: string;
  required_for: DocumentRequiredFor;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentTypeInput {
  key: string;
  label: string;
  required_for: DocumentRequiredFor;
  is_required?: boolean;
  display_order?: number;
}

/**
 * Student document (Document Vault)
 */
export interface StudentDocument {
  id: string;
  school_id: string;
  student_id: string;
  doc_type: string; // references document_types.key
  storage_path?: string | null;
  status: DocumentStatus;
  expected_on?: string | null; // YYYY-MM-DD
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  file_name?: string | null;
  mime?: string | null;
  size_bytes?: number | null;
  uploaded_by?: string | null;
  uploaded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentDocumentInput {
  doc_type: string;
  status?: DocumentStatus;
  expected_on?: string;
  file_name?: string;
  mime?: string;
  size_bytes?: number;
}

/**
 * Student medical record (separate table for RLS gating)
 */
export interface StudentMedical {
  student_id: string;
  school_id: string;
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
  special_needs?: string | null;
  vision_hearing_aids?: string | null;
  immunisation_notes?: string | null;
  emergency_instructions?: string | null;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  preferred_hospital?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface StudentMedicalInput {
  allergies?: string;
  conditions?: string;
  medications?: string;
  special_needs?: string;
  vision_hearing_aids?: string;
  immunisation_notes?: string;
  emergency_instructions?: string;
  doctor_name?: string;
  doctor_phone?: string;
  preferred_hospital?: string;
}

/**
 * Student event (timeline)
 */
export interface StudentEvent {
  id: string;
  school_id: string;
  student_id: string;
  kind: StudentEventKind;
  summary: string;
  meta?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
}

export interface StudentEventInput {
  student_id: string;
  kind: StudentEventKind;
  summary: string;
  meta?: Record<string, unknown>;
}

/**
 * Student draft (wizard autosave)
 */
export interface StudentDraft {
  id: string;
  school_id: string;
  created_by: string;
  step: number;
  payload: Record<string, unknown>;
  updated_at: string;
}

export interface StudentDraftInput {
  step: number;
  payload: Record<string, unknown>;
}

/**
 * Student transfer certificate
 */
export type TCStatus = 'draft' | 'approved' | 'rejected';

export interface StudentTransferCertificate {
  id: string;
  school_id: string;
  student_id: string;
  tc_no: string;
  issued_on: string; // YYYY-MM-DD
  last_class_id?: string | null;
  last_academic_year_id?: string | null;
  reason: string;
  conduct?: string | null;
  remarks?: string | null;
  dues_cleared: boolean;
  dues_override_reason?: string | null;
  approved_by?: string | null;
  pdf_path?: string | null;
  is_duplicate_copy: boolean;
  original_tc_id?: string | null;
  status: TCStatus;
  qr_verification_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentTransferCertificateInput {
  student_id: string;
  issued_on: string;
  last_class_id?: string;
  last_academic_year_id?: string;
  reason: string;
  conduct?: string;
  remarks?: string;
  dues_cleared?: boolean;
  dues_override_reason?: string;
  approved_by?: string;
  is_duplicate_copy?: boolean;
  original_tc_id?: string;
  status?: TCStatus;
  qr_verification_code?: string;
}

/**
 * Import batch
 */
export interface ImportBatch {
  id: string;
  school_id: string;
  created_by: string;
  file_name: string;
  total_rows: number;
  created_rows: number;
  skipped_rows: number;
  status: ImportBatchStatus;
  error_report_path?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Promotion batch
 */
export interface PromotionBatch {
  id: string;
  school_id: string;
  from_year_id: string;
  to_year_id: string;
  status: PromotionBatchStatus;
  summary?: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Student enrollment (per academic year)
 */
export interface StudentEnrollment {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  class_id: string;
  section_id?: string | null;
  roll_no?: string | null;
  status: EnrollmentStatus;
  promotion_batch_id?: string | null;
  enrolled_on: string; // YYYY-MM-DD
  ended_on?: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface StudentEnrollmentInput {
  student_id: string;
  academic_year_id: string;
  class_id: string;
  section_id?: string;
  roll_no?: string;
  status?: EnrollmentStatus;
  enrolled_on?: string;
}

/**
 * Counter (gap-free sequences)
 */
export interface Counter {
  school_id: string;
  key: string;
  next_value: number;
  updated_at: string;
}

/**
 * Audit log (append-only)
 */
export interface AuditLog {
  id: string;
  school_id: string;
  actor_id?: string | null;
  actor_role?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at: string;
}

/**
 * Communication consent
 */
export interface CommunicationConsent {
  id: string;
  school_id: string;
  parent_id: string;
  channel: CommunicationChannel;
  status: ConsentStatus;
  captured_at: string;
  source: ConsentSource;
  captured_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationConsentInput {
  parent_id: string;
  channel: CommunicationChannel;
  status?: ConsentStatus;
  source: ConsentSource;
}

/**
 * Notification outbox
 */
export interface NotificationOutbox {
  id: string;
  school_id: string;
  channel: NotificationChannel;
  template_key: string;
  recipient_phone: string;
  recipient_parent_id?: string | null;
  params: Record<string, unknown>;
  related_type?: string | null;
  related_id?: string | null;
  dedupe_key?: string | null;
  status: NotificationStatus;
  provider_message_id?: string | null;
  error?: string | null;
  attempts: number;
  scheduled_at: string;
  sent_at?: string | null;
  created_at: string;
}

export interface NotificationOutboxInput {
  channel: NotificationChannel;
  template_key: string;
  recipient_phone: string;
  recipient_parent_id?: string;
  params: Record<string, unknown>;
  related_type?: string;
  related_id?: string;
  dedupe_key?: string;
  scheduled_at?: string;
}

/**
 * Student sibling (from view)
 */
export interface StudentSibling {
  student_id: string;
  sibling_id: string;
  sibling_first_name: string;
  sibling_last_name: string;
  sibling_admission_no: string;
  sibling_class_id?: string | null;
  sibling_section_id?: string | null;
  sibling_class_name?: string | null;
  sibling_section_name?: string | null;
}

/**
 * Student list query params
 */
export interface StudentListParams {
  search?: string;
  class_id?: string;
  section_id?: string;
  status?: StudentStatus;
  gender?: StudentGender;
  category?: StudentCategory;
  is_rte?: boolean;
  has_dues?: boolean;
  uses_transport?: boolean;
  documents_pending?: boolean;
  admission_year?: number;
  limit?: number;
  cursor?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  userRole?: string;
  teacherSectionIds?: string[];
  parentStudentIds?: string[];
}

/**
 * Student list response
 */
export interface StudentListResponse {
  data: StudentListItem[];
  next_cursor?: string | null;
  total_estimate?: number;
}

/**
 * Student list item (lightweight for list view)
 */
export interface StudentListItem {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  dob: string;
  gender: StudentGender;
  photo_path?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  primary_parent_name?: string | null;
  primary_parent_phone?: string | null;
  fee_status?: string | null;
  transport_route?: string | null;
  documents_pending_count?: number;
  status: StudentStatus;
}

/**
 * Student profile (detailed)
 */
export interface StudentProfile extends Student {
  addresses: StudentAddress[];
  parents: (Parent & { relation: ParentRelation; is_primary_contact: boolean; is_fee_payer: boolean; is_emergency_contact: boolean; can_pickup: boolean; lives_with: boolean })[];
  previous_schools: StudentPreviousSchool[];
  achievements: StudentAchievement[];
  documents: StudentDocument[];
  medical?: StudentMedical | null;
  events: StudentEvent[];
  enrollments: StudentEnrollment[];
  siblings: StudentSibling[];
}

/**
 * Student sensitive data (AES-256-GCM Aadhaar at rest)
 */
export interface StudentSensitive {
  student_id: string;
  school_id: string;
  aadhaar_enc?: Uint8Array | string | null;
  aadhaar_last4?: string | null;
  aadhaar_hash?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Duplicate check match
 */
export interface DuplicateCheckMatch {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  dob: string;
  class_name?: string;
  section_name?: string;
  status: StudentStatus;
  match_reason: string;
}

/**
 * Duplicate check result
 */
export interface DuplicateCheckResult {
  is_duplicate: boolean;
  match_score: number; // 0 - 100
  matches: DuplicateCheckMatch[];
}

/**
 * Parent lookup result
 */
export interface ParentLookupResult {
  found: boolean;
  parent?: Parent;
  linked_students?: { id: string; first_name: string; last_name: string; class_name?: string }[];
}

/**
 * Admission wizard payload (All 8 steps + skippables)
 */
export interface AdmissionWizardPayload {
  // Step 1: Basic info
  step1_basic: {
    photo_path?: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    dob: string;
    gender: StudentGender;
    blood_group?: string;
    nationality?: string;
    religion?: string;
    category?: StudentCategory;
    mother_tongue?: string;
    sr_no?: string;
    apaar_id?: string;
  };
  // Step 2: Guardian & Family
  step2_guardian: {
    father?: ParentInput & {
      relation: 'father';
      is_primary_contact?: boolean;
      is_fee_payer?: boolean;
      is_emergency_contact?: boolean;
      can_pickup?: boolean;
      lives_with?: boolean;
      whatsapp_consent?: boolean;
    };
    mother?: ParentInput & {
      relation: 'mother';
      is_primary_contact?: boolean;
      is_fee_payer?: boolean;
      is_emergency_contact?: boolean;
      can_pickup?: boolean;
      lives_with?: boolean;
      whatsapp_consent?: boolean;
    };
    guardian?: ParentInput & {
      relation: 'guardian';
      is_primary_contact?: boolean;
      is_fee_payer?: boolean;
      is_emergency_contact?: boolean;
      can_pickup?: boolean;
      lives_with?: boolean;
      whatsapp_consent?: boolean;
    };
    current_address: StudentAddressInput;
    permanent_address?: StudentAddressInput;
    same_as_current?: boolean;
  };
  // Step 3: Academic & Class
  step3_academic: {
    academic_year_id: string;
    admission_date: string;
    class_id: string;
    section_id?: string;
    roll_no?: string;
    admission_type: AdmissionType;
    is_rte: boolean;
    house?: string;
    medium?: string;
    previous_school?: StudentPreviousSchoolInput;
  };
  // Step 4: Documents Vault
  step4_documents: StudentDocumentInput[];
  // Step 5: Sensitive / Aadhaar
  step5_sensitive?: {
    aadhaar_number?: string;
  };
  // Step 6: Medical (permission gated)
  step6_medical?: StudentMedicalInput;
  // Step 7: Transport (optional / Pro plan)
  step7_transport?: {
    opt_in: boolean;
    route_id?: string;
    stop_id?: string;
    pickup?: boolean;
    dropoff?: boolean;
  };
  // Step 8: Fee Structure Assignment
  step8_fee?: {
    fee_structure_id?: string;
    discount_concession?: string;
  };
}

/**
 * Permission keys for students module
 */
export type StudentPermissionKey =
  | 'students.read'
  | 'students.write'
  | 'students.contacts.read'
  | 'students.reveal_sensitive'
  | 'students.medical.read'
  | 'students.medical.write'
  | 'students.documents.manage'
  | 'students.status.manage'
  | 'students.promote'
  | 'students.import'
  | 'students.export'
  | 'students.archive';

export const STUDENT_PERMISSIONS: StudentPermissionKey[] = [
  'students.read',
  'students.write',
  'students.contacts.read',
  'students.reveal_sensitive',
  'students.medical.read',
  'students.medical.write',
  'students.documents.manage',
  'students.status.manage',
  'students.promote',
  'students.import',
  'students.export',
  'students.archive',
];

/**
 * Default role permission sets for students module (from A2)
 */
export const STUDENT_ROLE_PERMISSIONS: Record<string, StudentPermissionKey[]> = {
  super_admin: [
    'students.read',
    'students.write',
    'students.contacts.read',
    'students.reveal_sensitive',
    'students.medical.read',
    'students.medical.write',
    'students.documents.manage',
    'students.status.manage',
    'students.promote',
    'students.import',
    'students.export',
    'students.archive',
  ],
  owner: [
    'students.read',
    'students.write',
    'students.contacts.read',
    'students.reveal_sensitive',
    'students.medical.read',
    'students.medical.write',
    'students.documents.manage',
    'students.status.manage',
    'students.promote',
    'students.import',
    'students.export',
    'students.archive',
  ],
  school_admin: [
    'students.read',
    'students.write',
    'students.contacts.read',
    'students.documents.manage',
    'students.status.manage', // prepare only, owner approves
    'students.promote',
    'students.import',
    'students.export',
  ],
  admin: [
    'students.read',
    'students.write',
    'students.contacts.read',
    'students.documents.manage',
    'students.status.manage', // prepare only, owner approves
    'students.promote',
    'students.import',
    'students.export',
  ],
  accountant: [
    'students.read',
    'students.contacts.read',
  ],
  teacher: [
    'students.read', // own class only
    'students.contacts.read', // own class only
  ],
  transport_manager: [
    'students.read', // riders only
    'students.contacts.read', // riders only
  ],
  driver: [
    'students.read', // route riders only, name, photo, stop
  ],
  parent: [
    'students.read', // own children only
    'students.contacts.read', // self
  ],
};

/**
 * Stage 4 Operations Types
 */

// Bulk Import
export interface ImportRowData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  dob: string;
  gender: StudentGender;
  class_name: string;
  section_name?: string;
  roll_no?: string;
  admission_no?: string;
  sr_no?: string;
  apaar_id?: string;
  admission_date?: string;
  parent_name: string;
  parent_phone: string;
  parent_relation?: ParentRelation;
  father_name?: string;
  father_phone?: string;
  mother_name?: string;
  mother_phone?: string;
  category?: StudentCategory;
  religion?: string;
  blood_group?: string;
  address_line1?: string;
  city?: string;
  district?: string;
  state?: string;
  pin?: string;
  is_rte?: boolean;
}

export interface ImportValidationRow {
  row_index: number;
  data: Partial<ImportRowData>;
  errors: string[];
  warnings?: string[];
  is_valid: boolean;
  is_duplicate_db?: boolean;
}

export interface ImportValidationResult {
  file_name: string;
  total_rows: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  warning_rows_count?: number;
  duplicate_rows_count?: number;
  rows: ImportValidationRow[];
  can_commit: boolean;
  column_mapping: Record<string, string>;
  raw_headers?: string[];
}

export interface ImportCommitResult {
  batch_id: string;
  total_rows: number;
  created_rows: number;
  skipped_rows: number;
  status: ImportBatchStatus;
  created_student_ids: string[];
}

// Promotion Pipeline
export type PromotionAction = 'promote' | 'detain' | 'leave' | 'pass_out';
export type SectionDistributionMode = 'keep_letter' | 'distribute_evenly' | 'unassigned';

export interface PromotionClassMapping {
  from_class_id: string;
  from_class_name: string;
  to_class_id?: string | null;
  to_class_name?: string | null;
  student_count: number;
}

export interface PromotionStudentItem {
  student_id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  current_class_id: string;
  current_class_name: string;
  current_section_id?: string | null;
  current_section_name?: string | null;
  action: PromotionAction;
  target_class_id?: string | null;
  target_class_name?: string | null;
  target_section_id?: string | null;
  target_section_name?: string | null;
  has_dues: boolean;
  dues_amount_paise: number;
}

export interface PromotionPreviewResult {
  from_year_id: string;
  to_year_id: string;
  total_eligible: number;
  promote_count: number;
  detain_count: number;
  leave_count: number;
  pass_out_count: number;
  dues_count: number;
  class_mappings: PromotionClassMapping[];
  students: PromotionStudentItem[];
}

export interface PromotionConfig {
  from_year_id: string;
  to_year_id: string;
  section_distribution: SectionDistributionMode;
  overrides?: Record<string, { action: PromotionAction; target_section_id?: string }>;
}

export interface PromotionExecuteResult {
  batch_id: string;
  from_year_id: string;
  to_year_id: string;
  total_processed: number;
  promoted_count: number;
  detained_count: number;
  passed_out_count: number;
  left_count: number;
  summary: Record<string, unknown>;
}

// Status Change & TC
export interface StatusChangeInput {
  new_status: StudentStatus;
  effective_date: string;
  reason: string;
  end_transport?: boolean;
}

export interface IssueTCInput {
  issued_on: string;
  last_class_id?: string;
  last_academic_year_id?: string;
  reason: string;
  conduct?: string;
  remarks?: string;
  dues_cleared?: boolean;
  dues_override_reason?: string;
  require_owner_approval?: boolean;
}

// Plan Limits
export interface PlanLimitsStatus {
  active_count: number;
  max_allowed: number;
  plan_tier: string;
  warning_threshold: number; // 90%
  is_warning: boolean;
  is_blocked: boolean;
  remaining_capacity: number;
}

// Parent Merge
export interface ParentMergePreview {
  surviving_parent: Parent;
  duplicate_parent: Parent;
  students_to_link: { id: string; first_name: string; last_name: string; admission_no: string }[];
  already_linked_students: { id: string; first_name: string; last_name: string }[];
  consents_to_transfer: CommunicationConsent[];
}

export interface ParentMergeResult {
  surviving_parent_id: string;
  duplicate_parent_id: string;
  moved_links_count: number;
  transferred_consents_count: number;
}

// Student Deletion & Purge
export interface DeleteStudentOptions {
  permanent?: boolean; // true = permanent hard purge of student and ALL related data, false = soft-delete (status: archived)
  reason?: string;
  actorId?: string;
  actorRole?: string;
  cleanOrphanParents?: boolean;
}

export interface DeleteStudentResult {
  success: boolean;
  studentId: string;
  admissionNo?: string;
  mode: "purged" | "soft_deleted";
  message: string;
  error?: string;
}

export interface BulkDeleteStudentsResult {
  success: boolean;
  totalRequested: number;
  deletedCount: number;
  mode: "purged" | "soft_deleted";
  errors: string[];
}

