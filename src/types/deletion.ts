/**
 * Type Definitions for Data Purge, Account Deletion, and School Decommissioning
 */

export interface AccountDeletionPreflight {
  can_delete: boolean;
  blocking_reason?: string | null;
  owned_schools: Array<{
    id: string;
    name: string;
    subdomain: string;
    created_at: string;
  }>;
  memberships: Array<{
    school_id: string;
    role: string;
  }>;
  profile: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  exclusively_owned_records: {
    drafts: number;
    import_batches: number;
    device_tokens: number;
    notifications: number;
  };
}

export interface SchoolDeletionPreflight {
  can_delete: boolean;
  is_owner: boolean;
  school_id: string;
  school_name: string;
  subdomain: string;
  official_email?: string;
  created_at?: string;
  error?: string;
  itemized_summary: {
    students: number;
    staff: number;
    classes: number;
    sections: number;
    dues: number;
    receipts: number;
    routes: number;
    vehicles: number;
    website_pages: number;
    storage_files: number;
  };
}

export interface PurgedCounts {
  students: number;
  fee_receipts: number;
  student_dues: number;
  fee_ledger: number;
  transport_routes: number;
  transport_vehicles: number;
  classes: number;
  storage_files: number;
  [key: string]: number;
}

export interface DeletionAuditReport {
  school_id: string;
  school_name: string;
  subdomain: string;
  deleted_by: string;
  deleted_at: string;
  status: "COMPLETED_VERIFIED" | "FAILED" | "IN_PROGRESS";
  purged_counts: PurgedCounts;
  retained_records: {
    retained_count: number;
    reason: string;
  };
  verification?: {
    verified_clean: boolean;
    remaining_counts: Record<string, number>;
  };
}

export interface AccountDeletionResult {
  success: boolean;
  message: string;
  summary?: {
    storage_files_purged: number;
    auth_deleted: boolean;
    profile_deleted: boolean;
  };
  error?: string;
}

export interface SchoolDeletionResult {
  success: boolean;
  message: string;
  audit_report?: DeletionAuditReport;
  error?: string;
}

export interface TransferOwnershipResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface SchoolVerificationResult {
  school_id: string;
  verified_clean: boolean;
  remaining_counts: Record<string, number>;
}
