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
export class StubPlanService implements PlanService {
  async hasFeature(schoolId: string, feature: string): Promise<boolean> {
    console.log(`[StubPlanService] hasFeature called for school: ${schoolId}, feature: ${feature}`);
    
    // In a real implementation, this would call the school_has_feature() SQL function
    // For now, return false for transport (Pro only), true for others
    if (feature === "transport") {
      return false; // Basic plan doesn't have transport
    }
    
    return true;
  }
}

// Export singleton instance
export const planService: PlanService = new StubPlanService();