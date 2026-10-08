/**
 * Audit Middleware & Service
 * Source of Truth: docs/SPEC.md Rules 5, 8 & Section 4.13
 */

import type { Request, Response, NextFunction } from 'express';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AuditEntry {
  schoolId?: string;
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  reason?: string;
  before?: any;
  after?: any;
  ip?: string;
}

// In-memory audit buffer for testing / offline fallback
export const memoryAuditLogs: (AuditEntry & { id: number; at: string })[] = [];
let nextAuditId = 1;

/**
 * Creates an append-only audit log row
 */
export async function createAuditLogEntry(entry: AuditEntry): Promise<number> {
  const at = new Date().toISOString();
  const id = nextAuditId++;
  memoryAuditLogs.push({ ...entry, id, at });

  if (isSupabaseConfigured) {
    try {
      await supabase.from('audit_logs').insert({
        school_id: entry.schoolId,
        actor_id: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId,
        reason: entry.reason,
        before: entry.before ? JSON.stringify(entry.before) : null,
        after: entry.after ? JSON.stringify(entry.after) : null,
        ip: entry.ip,
      });
    } catch (e) {
      // Memory record preserved
    }
  }

  return id;
}

/**
 * Express middleware to automatically record sensitive mutations
 */
export function auditSensitiveWrite(entity: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const actorId = req.user?.id || (req as any).actorId;
        const schoolId = req.schoolId || req.user?.school_id;
        const entityId = body?.id || body?.data?.id || req.params?.id;
        const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
        const reason = (req.body?.reason as string) || (req.headers['x-reason'] as string) || undefined;

        createAuditLogEntry({
          schoolId,
          actorId,
          action,
          entity,
          entityId,
          reason,
          before: (req as any).auditBefore,
          after: body,
          ip,
        }).catch((err) => console.error('[AuditMiddleware] Log insertion failed:', err));
      }
      return originalJson(body);
    };

    next();
  };
}
