/**
 * Feature Gating Middleware
 * Returns HTTP 402 with code PLAN_REQUIRED when feature is not available
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if school has a specific feature enabled
 * Usage: requireFeature('transport')
 */
export function requireFeature(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = (req as any).schoolId;
      
      if (!schoolId) {
        return res.status(400).json({
          code: "BAD_REQUEST",
          message: "School ID is required",
        });
      }
      
      // In a real implementation, this would call the school_has_feature() SQL function
      // For now, we'll check the school's subscription plan
      const hasFeature = await checkSchoolFeature(schoolId, feature);
      
      if (!hasFeature) {
        return res.status(402).json({
          code: "PLAN_REQUIRED",
          feature,
          message: `This feature requires a plan that includes ${feature}`,
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Feature check failed",
      });
    }
  };
}

/**
 * Check if school has a feature enabled
 * In a real implementation, this would call the school_has_feature() SQL function
 */
async function checkSchoolFeature(schoolId: string, feature: string): Promise<boolean> {
  // This is a placeholder - in real implementation, call the SQL function
  // For now, we'll check based on plan
  try {
    // In a real app, this would query the database
    // const { data } = await supabase.rpc('school_has_feature', { p_feature: feature });
    // return data === true;
    
    // Placeholder logic based on feature
    if (feature === 'transport') {
      // Check if school is on Pro plan
      return false; // Default to false for now
    }
    
    return true; // Other features available by default
  } catch {
    return false;
  }
}

/**
 * Middleware to check student limit
 * Returns 402 if limit reached
 */
export function requireStudentLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = (req as any).schoolId;
      
      if (!schoolId) {
        return res.status(400).json({
          code: "BAD_REQUEST",
          message: "School ID is required",
        });
      }
      
      const { canCreate, limit, currentCount } = await checkStudentLimit(schoolId);
      
      if (!canCreate) {
        return res.status(402).json({
          code: "LIMIT_REACHED",
          message: `Student limit reached (${currentCount}/${limit}). Upgrade your plan to add more students.`,
          limit,
          current_count: currentCount,
        });
      }
      
      // Add warning header if at 90% capacity
      if (currentCount >= limit * 0.9) {
        res.setHeader("X-Student-Limit-Warning", "true");
        res.setHeader("X-Student-Limit-Current", String(currentCount));
        res.setHeader("X-Student-Limit-Max", String(limit));
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Student limit check failed",
      });
    }
  };
}

/**
 * Check if school can create more students
 */
async function checkStudentLimit(schoolId: string): Promise<{ canCreate: boolean; limit: number; currentCount: number }> {
  // In a real implementation, this would query the database
  // For now, return placeholder values
  return {
    canCreate: true,
    limit: 800, // Basic plan limit
    currentCount: 0,
  };
}