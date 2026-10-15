/**
 * Fee Service Interface (Spec B1)
 * Real implementation built on feeDuesService and feeSetupService.
 * Interface unchanged — studentOperationsService imports stay valid.
 */

import {
  getStudentBalance as _getBalance,
  assignFeeStructure as _assignFeeStructure,
  autoAssignOnAdmission,
  cancelFutureDues as _cancelFutureDues,
  createTransportDues as _createTransportDues,
  changeTransportDues as _changeTransportDues,
  cancelTransportDues as _cancelTransportDues,
} from "./feeDuesService";

export interface AssignStructureOptions {
  structureId?: string;
  classId?: string;
  academicYearId?: string;
  isRte?: boolean;
  admissionType?: "new" | "re_admission" | "transfer_in";
  admissionDate?: string;
  actorId?: string;
}

export interface FeeService {
  /** Get student's fee balance in paise */
  getStudentBalance(studentId: string): Promise<{ balance: number; error?: string }>;
  /** Assign fee structure at admission (or auto-assign if structureId omitted) */
  assignStructure(
    studentId: string,
    options?: AssignStructureOptions
  ): Promise<{ success: boolean; error?: string; assignmentId?: string; createdDuesCount?: number }>;
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

/** Real Fee Service Implementation (Phase 2 / 3a) */
export class RealFeeService implements FeeService {
  private schoolId: string;

  constructor(schoolId: string) {
    this.schoolId = schoolId;
  }

  async getStudentBalance(studentId: string): Promise<{ balance: number; error?: string }> {
    if (feeService && feeService.getStudentBalance !== StubFeeService.prototype.getStudentBalance) {
      return feeService.getStudentBalance(studentId);
    }
    return _getBalance(this.schoolId, studentId);
  }

  async assignStructure(
    studentId: string,
    options?: AssignStructureOptions
  ): Promise<{ success: boolean; error?: string; assignmentId?: string; createdDuesCount?: number }> {
    try {
      if (options?.structureId) {
        const res = await _assignFeeStructure(
          this.schoolId,
          studentId,
          options.academicYearId || "",
          options.structureId,
          undefined,
          options.actorId,
          options.isRte ?? false,
          options.admissionDate
        );
        if (res.error) {
          return { success: false, error: res.error };
        }
        return { success: true, assignmentId: res.assignment?.id, createdDuesCount: res.createdDuesCount };
      } else {
        const res = await autoAssignOnAdmission(
          this.schoolId,
          studentId,
          options?.isRte ?? false,
          options?.classId ?? "",
          options?.admissionType ?? "new",
          options?.actorId,
          options?.academicYearId
        );
        if (res.error) {
          return { success: false, error: res.error };
        }
        return { success: true, assignmentId: res.assignmentIds?.[0] };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ── Transport dues (Phase 7 - Spec B6 Rule 15, C7, D1) ─────────────────
  async createTransportDues(assignmentId: string): Promise<{ success: boolean; error?: string }> {
    return _createTransportDues(this.schoolId, assignmentId);
  }

  async changeTransportDues(assignmentId: string, newAssignmentId: string): Promise<{ success: boolean; error?: string }> {
    return _changeTransportDues(this.schoolId, assignmentId, newAssignmentId);
  }

  async cancelTransportDues(assignmentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }> {
    return _cancelTransportDues(this.schoolId, assignmentId, effectiveDate);
  }

  async cancelFutureDues(studentId: string, effectiveDate: string): Promise<{ success: boolean; error?: string }> {
    const { cancelled: _cancelled, error } = await _cancelFutureDues(this.schoolId, studentId, effectiveDate);
    if (error) return { success: false, error };
    return { success: true };
  }

  async carryForward(_yearId: string): Promise<{ success: boolean; error?: string }> {
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
  async assignStructure(
    _studentId: string,
    _options?: AssignStructureOptions
  ): Promise<{ success: boolean; error?: string; assignmentId?: string; createdDuesCount?: number }> {
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