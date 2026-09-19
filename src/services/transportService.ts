/**
 * Transport Service Interface (Spec D1)
 * Stub implementation - Transport module not yet built
 * Called by Students module for transport-related operations
 */

export interface TransportService {
  /**
   * Get student's transport assignment
   * @param studentId - Student UUID
   * @returns Transport assignment details
   */
  getStudentTransport(studentId: string): Promise<{ 
    assignment?: {
      id: string;
      route_id: string;
      route_name: string;
      stop_id: string;
      stop_name: string;
      pickup_time: string;
      drop_time: string;
      monthly_fee: number;
    } | null; 
    error?: string 
  }>;

  /**
   * End transport assignment when student withdraws/transfers
   * @param studentId - Student UUID
   * @param date - Effective date
   * @param reason - Reason for ending
   * @returns Success status
   */
  endAssignment(studentId: string, date: string, reason: string): Promise<{ success: boolean; error?: string }>;
}

/**
 * Stub Transport Service Implementation
 * Returns default values until Transport module is built
 */
export class StubTransportService implements TransportService {
  async getStudentTransport(studentId: string): Promise<{ 
    assignment?: {
      id: string;
      route_id: string;
      route_name: string;
      stop_id: string;
      stop_name: string;
      pickup_time: string;
      drop_time: string;
      monthly_fee: number;
    } | null; 
    error?: string 
  }> {
    // Stub: return null (no transport)
    console.log(`[StubTransportService] getStudentTransport called for student: ${studentId}`);
    return { assignment: null };
  }

  async endAssignment(studentId: string, date: string, reason: string): Promise<{ success: boolean; error?: string }> {
    // Stub: no-op
    console.log(`[StubTransportService] endAssignment called for student: ${studentId}, date: ${date}, reason: ${reason}`);
    return { success: true };
  }
}

// Export singleton instance
export const transportService: TransportService = new StubTransportService();