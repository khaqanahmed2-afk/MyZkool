/**
 * Fee Service Interface (Spec D1)
 * Stub implementation - Fee module not yet built
 * Called by Students module for fee-related operations
 */

export interface FeeService {
  /**
   * Get student's fee balance
   * @param studentId - Student UUID
   * @returns Balance in paise (bigint)
   */
  getStudentBalance(studentId: string): Promise<{ balance: number; error?: string }>;

  /**
   * Assign fee structure to student at admission
   * @param studentId - Student UUID
   * @returns Success status
   */
  assignStructure(studentId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Create transport dues for a transport assignment
   * @param assignmentId - Transport assignment UUID
   * @returns Success status
   */
  createTransportDues(assignmentId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Change transport dues when route/fee changes
   * @param assignmentId - Current transport assignment UUID
   * @param newAssignmentId - New transport assignment UUID
   * @returns Success status
   */
  changeTransportDues(assignmentId: string, newAssignmentId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Cancel transport dues when student stops transport
   * @param assignmentId - Transport assignment UUID
   * @param effectiveDate - Date from which to cancel
   * @returns Success status
   */
  cancelTransportDues(assignmentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Cancel future fee dues when student withdraws/transfers
   * @param studentId - Student UUID
   * @param effectiveDate - Date from which to cancel
   * @returns Success status
   */
  cancelFutureDues(studentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Carry forward arrears at year close
   * @param yearId - Academic year UUID
   * @returns Success status
   */
  carryForward(yearId: string): Promise<{ success: boolean; error?: string }>;
}

/**
 * Stub Fee Service Implementation
 * Returns default values until Fee module is built
 */
export class StubFeeService implements FeeService {
  async getStudentBalance(studentId: string): Promise<{ balance: number; error?: string }> {
    // Stub: return 0 balance
    console.log(`[StubFeeService] getStudentBalance called for student: ${studentId}`);
    return { balance: 0 };
  }

  async assignStructure(studentId: string): Promise<{ success: boolean; error?: string }> {
    // Stub: no-op
    console.log(`[StubFeeService] assignStructure called for student: ${studentId}`);
    return { success: true };
  }

  async createTransportDues(assignmentId: string): Promise<{ success: boolean; error?: string }> {
    // Stub: no-op
    console.log(`[StubFeeService] createTransportDues called for assignment: ${assignmentId}`);
    return { success: true };
  }

  async changeTransportDues(assignmentId: string, newAssignmentId: string): Promise<{ success: boolean; error?: string }> {
    // Stub: no-op
    console.log(`[StubFeeService] changeTransportDues called: ${assignmentId} -> ${newAssignmentId}`);
    return { success: true };
  }

  async cancelTransportDues(assignmentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }> {
    // Stub: no-op
    console.log(`[StubFeeService] cancelTransportDues called for assignment: ${assignmentId}, effective: ${effectiveDate}`);
    return { success: true };
  }

  async cancelFutureDues(studentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }> {
    // Stub: no-op
    console.log(`[StubFeeService] cancelFutureDues called for student: ${studentId}, effective: ${effectiveDate}`);
    return { success: true };
  }

  async carryForward(yearId: string): Promise<{ success: boolean; error?: string }> {
    // Stub: no-op
    console.log(`[StubFeeService] carryForward called for year: ${yearId}`);
    return { success: true };
  }
}

// Export singleton instance
export const feeService: FeeService = new StubFeeService();