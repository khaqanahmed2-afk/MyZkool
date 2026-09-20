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
      const schoolId = (req as any).schoolId || (req.headers && req.headers["x-school-id"] as string);
      
      // If req already has schoolPlan attached (e.g. from test or auth context)
      if ((req as any).schoolPlan) {
        const plan = (req as any).schoolPlan;
        const features = Array.isArray(plan.features) ? plan.features : [];
        if (!features.includes(feature) && (plan.plan_key === "basic" || plan.plan_slug === "basic")) {
          return res.status(402).json({
            code: "PLAN_REQUIRED",
            feature,
            message: `This feature requires a plan that includes ${feature}`,
          });
        }
      }

      if (!schoolId) {
        return res.status(400).json({
          code: "BAD_REQUEST",
          message: "School ID is required",
        });
      }
      
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
 */
export async function checkSchoolFeature(schoolId: string, feature: string): Promise<boolean> {
  // 1. Supabase check
  try {
    const { supabase, isSupabaseConfigured } = await import("../lib/supabase");
    if (isSupabaseConfigured) {
      const { data } = await supabase.rpc("school_has_feature", { p_feature: feature });
      if (typeof data === "boolean") return data;
    }
  } catch {
    // Continue to store check
  }

  // 2. LocalStorage / Test environment check
  if (typeof localStorage !== "undefined") {
    // Check school plan cache
    const planKey = `myzkool_school_plans_${schoolId}`;
    const cachedPlan = localStorage.getItem(planKey);
    if (cachedPlan) {
      try {
        const parsed = JSON.parse(cachedPlan);
        if (Array.isArray(parsed.features)) {
          return parsed.features.includes(feature);
        }
        if (parsed.plan_slug === "basic" || parsed.plan_key === "basic") {
          return false;
        }
        if (parsed.plan_slug === "pro" || parsed.plan_key === "pro") {
          return true;
        }
      } catch {}
    }

    // Check school subscription cache
    const subKey = `myzkool_subscription_${schoolId}`;
    const cachedSub = localStorage.getItem(subKey);
    if (cachedSub) {
      try {
        const parsed = JSON.parse(cachedSub);
        const planSlug = parsed.plan?.slug || parsed.plan_slug;
        if (planSlug === "pro" || planSlug === "custom") return true;
        if (planSlug === "basic") return false;
      } catch {}
    }
  }

  if (feature === "transport") {
    return false; // Pro plan required for transport
  }

  return true;
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