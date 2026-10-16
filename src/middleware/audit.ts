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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val);
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

  if (isSupabaseConfigured && entry.schoolId && isValidUuid(entry.schoolId)) {
    try {
      const cleanActorId = isValidUuid(entry.actorId) ? entry.actorId : null;
      const cleanEntityId = isValidUuid(entry.entityId) ? entry.entityId : crypto.randomUUID();
      
      // Clean IP for postgres INET field (extract first IP if comma-separated from proxy)
      let cleanIp: string | null = null;
      if (entry.ip) {
        const firstIp = entry.ip.split(',')[0].trim();
        if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(firstIp) || firstIp.includes(':')) {
          cleanIp = firstIp;
        }
      }

      const { error } = await supabase.from('audit_logs').insert({
        school_id: entry.schoolId,
        actor_id: cleanActorId,
        action: entry.action,
        entity_type: entry.entity,
        entity_id: cleanEntityId,
        reason: entry.reason || null,
        before: entry.before || null,
        after: entry.after || null,
        ip: cleanIp,
      });

      if (error) {
        console.warn('[AuditMiddleware] Supabase audit log insert skipped:', error.message);
      }
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
