/**
 * MyZkool Permission Matrix
 * Source of Truth: docs/SPEC.md Section 4.4
 */

import { PermissionKey, UserRole } from './types';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  owner: [
    'students.read',
    'students.write',
    'students.archive',
    'students.import',
    'students.export',
    'students.promote',
    'students.reveal_sensitive',
    'students.medical',
    'fees.read',
    'fees.collect',
    'fees.receipt_cancel',
    'fees.structure_manage',
    'fees.concessions_approve',
    'fees.reports_view',
    'fees.waive_fine',
    'fees.policy_manage',
    'transport.read',
    'transport.manage',
    'transport.assign',
    'transport.driver_mode',
    'website.read',
    'website.edit',
    'website.publish',
    'settings.manage',
    'users.invite',
    'users.manage',
    'audit.view',
    'integrations.manage',
  ],
  admin: [
    'students.read',
    'students.write',
    'students.archive',
    'students.import',
    'students.export',
    'students.promote',
    'fees.read',
    'transport.read',
    'website.read',
    'website.edit',
    'users.invite',
  ],
  accountant: [
    'students.read',
    'fees.read',
    'fees.collect',
    'fees.receipt_cancel',
    'fees.structure_manage',
    'fees.concessions_approve',
    'fees.reports_view',
    'fees.waive_fine',
  ],
  teacher: [
    'students.read',
  ],
  driver: [
    'transport.read',
    'transport.driver_mode',
  ],
  parent: [
    // Parents access only their linked children via specialized RLS policies
  ],
};

/**
 * Checks if a given role with optional extra permissions has the requested permission
 */
export function hasPermission(
  role: UserRole,
  permission: PermissionKey,
  extraPermissions: string[] = []
): boolean {
  if (role === 'owner') return true;
  const rolePerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
  if (rolePerms.includes(permission)) return true;
  return extraPermissions.includes(permission);
}
