import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { PlatformAuditLog } from "../types/masterAdmin";

// In-memory ring buffer for fallback and offline testing
const auditBuffer: PlatformAuditLog[] = [];
const MAX_BUFFER_SIZE = 500;

export interface LogPlatformActionParams {
  adminId?: string | null;
  adminEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  schoolId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Persists an immutable administrative action to platform_audit_logs
 */
export async function logPlatformAction(params: LogPlatformActionParams): Promise<PlatformAuditLog> {
  const auditRow: PlatformAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    admin_id: params.adminId || null,
    admin_email: params.adminEmail,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId || null,
    school_id: params.schoolId || null,
    details: params.details || {},
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
    created_at: new Date().toISOString(),
  };

  // Add to in-memory buffer
  auditBuffer.unshift(auditRow);
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.pop();
  }

  // Persist to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("platform_audit_logs")
        .insert({
          admin_id: params.adminId || null,
          admin_email: params.adminEmail,
          action: params.action,
          resource_type: params.resourceType,
          resource_id: params.resourceId || null,
          school_id: params.schoolId || null,
          details: params.details || {},
          ip_address: params.ipAddress || null,
          user_agent: params.userAgent || null,
        })
        .select()
        .single();

      if (!error && data) {
        return data as PlatformAuditLog;
      }
      if (error) {
        console.warn("Notice: could not persist platform_audit_log to Supabase:", error.message);
      }
    } catch (err: any) {
      console.warn("Notice: exception writing platform_audit_log:", err.message);
    }
  }

  return auditRow;
}

/**
 * Returns recent platform audit logs with optional filtering
 */
export async function getPlatformAuditLogs(options?: {
  limit?: number;
  action?: string;
  adminEmail?: string;
  schoolId?: string;
}): Promise<PlatformAuditLog[]> {
  const limit = options?.limit || 50;

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("platform_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (options?.action) query = query.eq("action", options.action);
      if (options?.adminEmail) query = query.ilike("admin_email", `%${options.adminEmail}%`);
      if (options?.schoolId) query = query.eq("school_id", options.schoolId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as PlatformAuditLog[];
      }
    } catch {}
  }

  // Fallback to in-memory buffer
  let filtered = [...auditBuffer];
  if (options?.action) {
    filtered = filtered.filter((l) => l.action === options.action);
  }
  if (options?.adminEmail) {
    filtered = filtered.filter((l) => l.admin_email.toLowerCase().includes(options.adminEmail!.toLowerCase()));
  }
  if (options?.schoolId) {
    filtered = filtered.filter((l) => l.school_id === options.schoolId);
  }

  return filtered.slice(0, limit);
}

