/**
 * Fee Service Interface (Spec B1)
 * Real implementation built on feeDuesService and feeSetupService.
 * Interface unchanged — studentOperationsService imports stay valid.
 */

import {
  getStudentBalance as _getBalance,
  autoAssignOnAdmission,
  cancelFutureDues as _cancelFutureDues,
} from "./feeDuesService";

export interface FeeService {
  /** Get student's fee balance in paise */
  getStudentBalance(studentId: string): Promise<{ balance: number; error?: string }>;
  /** Assign fee structure at admission (replaced by autoAssignOnAdmission) */
  assignStructure(studentId: string): Promise<{ success: boolean; error?: string }>;
  /** Create transport dues (stub — Phase 7) */
  createTransportDues(assignmentId: string): Promise<{ success: boolean; error?: string }>;
  /** Change transport dues (stub — Phase 7) */
  changeTransportDues(assignmentId: string, newAssignmentId: string): Promise<{ success: boolean; error?: string }>;
  /** Cancel transport dues (stub — Phase 7) */
  cancelTransportDues(assignmentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }>;
  /** Cancel future dues on status change */
  cancelFutureDues(studentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }>;
  /** Carry forward arrears at year close (stub — Phase 4) */
  carryForward(yearId: string): Promise<{ success: boolean; error?: string }>;
}

/** Real Fee Service Implementation (Phase 2) */
export class RealFeeService implements FeeService {
  private schoolId: string;

  constructor(schoolId: string) {
    this.schoolId = schoolId;
  }

  async getStudentBalance(studentId: string): Promise<{ balance: number; error?: string }> {
    return _getBalance(this.schoolId, studentId);
  }

  async assignStructure(studentId: string): Promise<{ success: boolean; error?: string }> {
    // auto-assign — caller must set classId and admissionType. Kept as no-op here
    // because autoAssignOnAdmission is called directly by admission wizard.
    console.log(`[FeeService] assignStructure: use autoAssignOnAdmission directly for ${studentId}`);
    return { success: true };
  }

  async createTransportDues(assignmentId: string): Promise<{ success: boolean; error?: string }> {
    // Stub — Phase 7
    console.log(`[FeeService] createTransportDues stub: ${assignmentId}`);
    return { success: true };
  }

  async changeTransportDues(assignmentId: string, newAssignmentId: string): Promise<{ success: boolean; error?: string }> {
    // Stub — Phase 7
    console.log(`[FeeService] changeTransportDues stub: ${assignmentId} -> ${newAssignmentId}`);
    return { success: true };
  }

  async cancelTransportDues(assignmentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }> {
    // Stub — Phase 7
    console.log(`[FeeService] cancelTransportDues stub: ${assignmentId}, ${effectiveDate}`);
    return { success: true };
  }

  async cancelFutureDues(studentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }> {
    const { cancelled, error } = await _cancelFutureDues(this.schoolId, studentId, effectiveDate);
    if (error) return { success: false, error };
    console.log(`[FeeService] cancelFutureDues: cancelled ${cancelled} dues for ${studentId}`);
    return { success: true };
  }

  async carryForward(yearId: string): Promise<{ success: boolean; error?: string }> {
    // Stub — Phase 4
    console.log(`[FeeService] carryForward stub for year: ${yearId}`);
    return { success: true };
  }
}

/**
 * Stub Fee Service (used when school context is unavailable)
 */
export class StubFeeService implements FeeService {
  async getStudentBalance(_studentId: string): Promise<{ balance: number; error?: string }> {
    return { balance: 0 };
  }
  async assignStructure(_studentId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
  async createTransportDues(_assignmentId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
  async changeTransportDues(_a: string, _b: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
  async cancelTransportDues(_a: string, _b: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
  async cancelFutureDues(_studentId: string, _effectiveDate: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
  async carryForward(_yearId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}

/**
 * Factory: create a fee service with school context.
 * Use this in components/services that have schoolId available.
 */
export function createFeeService(schoolId: string): FeeService {
  return new RealFeeService(schoolId);
}

// Default singleton (stub) for backward compatibility with imports
// that don't have schoolId at module load time.
export const feeService: FeeService = new StubFeeService();