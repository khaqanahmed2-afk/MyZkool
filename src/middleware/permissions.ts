/**
 * Permission Middleware
 * Checks permission keys, not role names, adhering to SPEC 4.4 matrix
 */

import type { Request, Response, NextFunction } from 'express';
import {
  ROLE_DEFAULT_PERMISSIONS,
  hasPermission,
} from '../../packages/shared/src/permissions';
import type { PermissionKey, UserRole } from '../../packages/shared/src/types';

/**
 * Resolves effective permissions for a request from role + extra permissions
 */
export function getRequestPermissions(req: Request): string[] {
  if (Array.isArray((req as any).userPermissions) && (req as any).userPermissions.length > 0) {
    return (req as any).userPermissions;
  }

  const role = ((req as any).userRole || (req as any).user?.role) as UserRole | undefined;
  if (!role) {
    return [];
  }

  if (role === 'owner') {
    return ROLE_DEFAULT_PERMISSIONS.owner;
  }

  const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
  const extraPerms = ((req as any).user?.extra_permissions as string[]) || [];

  return Array.from(new Set([...defaultPerms, ...extraPerms]));
}

/**
 * Middleware to check if user has a specific permission
 * Usage: requirePermission('students.write')
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = ((req as any).userRole || (req as any).user?.role) as UserRole | undefined;
      const extra = ((req as any).user?.extra_permissions as string[]) || [];

      // Owner always has all permissions
      if (role === 'owner') {
        return next();
      }

      const permissions = getRequestPermissions(req);
      const isGranted =
        permissions.includes(permission) ||
        (role ? hasPermission(role, permission as PermissionKey, extra) : false);

      if (!isGranted) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: `Permission required: ${permission}`,
          details: { required: permission },
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Permission check failed',
        details: error,
      });
    }
  };
}

/**
 * Middleware to check if user has any of the given permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = ((req as any).userRole || (req as any).user?.role) as UserRole | undefined;
      if (role === 'owner') {
        return next();
      }

      const effective = getRequestPermissions(req);
      const hasAny = permissions.some((p) => effective.includes(p));

      if (!hasAny) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: `One of these permissions required: ${permissions.join(', ')}`,
          details: { requiredAny: permissions },
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Permission check failed',
        details: error,
      });
    }
  };
}

/**
 * Middleware to check if user has all of the given permissions
 */
export function requireAllPermissions(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = ((req as any).userRole || (req as any).user?.role) as UserRole | undefined;
      if (role === 'owner') {
        return next();
      }

      const effective = getRequestPermissions(req);
      const hasAll = permissions.every((p) => effective.includes(p));

      if (!hasAll) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: `All of these permissions required: ${permissions.join(', ')}`,
          details: { requiredAll: permissions },
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Permission check failed',
        details: error,
      });
    }
  };
}