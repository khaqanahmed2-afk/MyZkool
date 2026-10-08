/**
 * MyZkool Shared Types
 * Source of Truth: docs/SPEC.md
 */

// Integer paise for all money values - floats strictly prohibited
export type Paise = number;

export type UserRole =
  | 'owner'
  | 'admin'
  | 'accountant'
  | 'teacher'
  | 'driver'
  | 'parent';

export type PlanCode = 'basic' | 'pro';

export type PlanFeature =
  | 'students'
  | 'fees'
  | 'website'
  | 'transport'
  | 'notices';

export type SubscriptionState =
  | 'trial'
  | 'active'
  | 'grace'
  | 'read_only'
  | 'cancelled';

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  pricePaise: Paise;
  studentCap: number;
  features: Record<string, number | boolean>;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiErrorResponse;
}

export type PermissionKey =
  // Student permissions
  | 'students.read'
  | 'students.write'
  | 'students.archive'
  | 'students.import'
  | 'students.export'
  | 'students.promote'
  | 'students.reveal_sensitive'
  | 'students.medical'
  // Fee permissions
  | 'fees.read'
  | 'fees.collect'
  | 'fees.receipt_cancel'
  | 'fees.structure_manage'
  | 'fees.concessions_approve'
  | 'fees.reports_view'
  | 'fees.waive_fine'
  | 'fees.policy_manage'
  // Transport permissions
  | 'transport.read'
  | 'transport.manage'
  | 'transport.assign'
  | 'transport.driver_mode'
  // Website permissions
  | 'website.read'
  | 'website.edit'
  | 'website.publish'
  // Platform permissions
  | 'settings.manage'
  | 'users.invite'
  | 'users.manage'
  | 'audit.view'
  | 'integrations.manage';
