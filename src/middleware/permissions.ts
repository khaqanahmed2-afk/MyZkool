/**
 * Permission Middleware
 * Checks permission keys, not role names
 */

import type { Request, Response, NextFunction } from "express";
import type { StudentPermissionKey } from "../types/students";

/**
 * Middleware to check if user has a specific permission
 * Usage: requirePermission('students.write')
 */
export function requirePermission(permission: StudentPermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In a real implementation, this would check the user's permissions
      // from their profile/role in the database
      const userPermissions = (req as any).userPermissions || [];
      
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: `Permission required: ${permission}`,
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Permission check failed",
      });
    }
  };
}

/**
 * Middleware to check if user has any of the given permissions
 * Usage: requireAnyPermission(['students.write', 'students.read'])
 */
export function requireAnyPermission(permissions: StudentPermissionKey[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userPermissions = (req as any).userPermissions || [];
      
      const hasPermission = permissions.some(p => userPermissions.includes(p));
      
      if (!hasPermission) {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: `One of these permissions required: ${permissions.join(", ")}`,
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Permission check failed",
      });
    }
  };
}

/**
 * Middleware to check if user has all of the given permissions
 * Usage: requireAllPermissions(['students.write', 'students.contacts.read'])
 */
export function requireAllPermissions(permissions: StudentPermissionKey[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userPermissions = (req as any).userPermissions || [];
      
      const hasAllPermissions = permissions.every(p => userPermissions.includes(p));
      
      if (!hasAllPermissions) {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: `All of these permissions required: ${permissions.join(", ")}`,
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Permission check failed",
      });
    }
  };
}

/**
 * Extract user permissions from request (to be used after authentication)
 * This would typically be called after the auth middleware
 */
export async function extractUserPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    // In a real implementation, this would fetch the user's role and permissions
    // from the database based on the authenticated user
    const userId = (req as any).user?.id;
    const schoolId = (req as any).schoolId;
    
    if (!userId || !schoolId) {
      (req as any).userPermissions = [];
      return next();
    }
    
    // For now, return empty array - in real implementation, fetch from DB
    (req as any).userPermissions = [];
    next();
  } catch (error) {
    (req as any).userPermissions = [];
    next();
  }
}