/**
 * Plan Service Interface (Spec D1)
 * Stub implementation for plan feature checking
 */

export interface PlanService {
  /**
   * Check if school has a feature enabled
   * @param schoolId - School UUID
   * @param feature - Feature key (e.g., 'transport')
   * @returns True if feature is enabled
   */
  hasFeature(schoolId: string, feature: string): Promise<boolean>;
}

/**
 * Stub Plan Service Implementation
 * Checks subscription plan for feature access
 */
import { checkSchoolFeature } from "../middleware/features";

export class StubPlanService implements PlanService {
  async hasFeature(schoolId: string, feature: string): Promise<boolean> {
    return checkSchoolFeature(schoolId, feature);
  }
}

// Export singleton instance
export const planService: PlanService = new StubPlanService();