/**
 * Idempotency Middleware
 * Handles Idempotency-Key header for money-changing POST routes
 */

import type { Request, Response, NextFunction } from "express";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface IdempotencyRecord {
  id: string;
  school_id: string;
  key: string;
  request_hash: string;
  response_status: number;
  response_body: unknown;
  created_at: string;
}

/**
 * Middleware to handle idempotency for money-changing operations
 * Usage: idempotencyMiddleware()
 */
export function idempotencyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only apply to POST, PUT, PATCH requests
    if (!["POST", "PUT", "PATCH"].includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers["idempotency-key"] as string;
    
    if (!idempotencyKey) {
      // No idempotency key provided, continue without idempotency
      return next();
    }

    const schoolId = (req as any).schoolId;
    
    if (!schoolId) {
      return res.status(400).json({
        code: "BAD_REQUEST",
        message: "School ID is required for idempotency",
      });
    }

    // Generate request hash for comparison
    const requestHash = generateRequestHash(req);

    // Check if we have a cached response
    const cached = await getIdempotencyRecord(schoolId, idempotencyKey);
    
    if (cached) {
      // Check if request matches
      if (cached.request_hash === requestHash) {
        // Return cached response
        return res.status(cached.response_status).json(cached.response_body);
      } else {
        // Key collision with different request
        return res.status(409).json({
          code: "IDEMPOTENCY_KEY_CONFLICT",
          message: "Idempotency key already used with a different request",
        });
      }
    }

    // Store the original send function
    const originalSend = res.send;
    
    // Override send to capture response
    res.send = function(body?: any): Response {
      // Store the response for future requests
      const statusCode = res.statusCode;
      let responseBody: unknown;
      
      try {
        responseBody = typeof body === "string" ? JSON.parse(body) : body;
      } catch {
        responseBody = body;
      }
      
      // Save idempotency record asynchronously
      saveIdempotencyRecord(schoolId, idempotencyKey, requestHash, statusCode, responseBody)
        .catch(console.error);
      
      // Call original send
      return originalSend.call(this, body);
    };
    
    next();
  };
}

/**
 * Generate a hash of the request for comparison
 */
function generateRequestHash(req: Request): string {
  const content = JSON.stringify({
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
  });
  
  // Simple hash - in production, use crypto.createHash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get idempotency record from database
 */
async function getIdempotencyRecord(schoolId: string, key: string): Promise<IdempotencyRecord | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("idempotency_keys")
        .select("*")
        .eq("school_id", schoolId)
        .eq("key", key)
        .single();
      
      if (!error && data) {
        return data as IdempotencyRecord;
      }
    } catch {
      // Fall through to local storage
    }
  }
  
  // Local storage fallback
  try {
    const cacheKey = `myzkool_idempotency_${schoolId}`;
    const cached = localStorage.getItem(cacheKey);
    const records: IdempotencyRecord[] = cached ? JSON.parse(cached) : [];
    return records.find(r => r.key === key) || null;
  } catch {
    return null;
  }
}

/**
 * Save idempotency record to database
 */
async function saveIdempotencyRecord(
  schoolId: string,
  key: string,
  requestHash: string,
  responseStatus: number,
  responseBody: unknown
): Promise<void> {
  const record: IdempotencyRecord = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    key,
    request_hash: requestHash,
    response_status: responseStatus,
    response_body: responseBody,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("idempotency_keys")
        .upsert(record, { onConflict: "school_id,key" });
      return;
    } catch {
      // Fall through to local storage
    }
  }
  
  // Local storage fallback
  try {
    const cacheKey = `myzkool_idempotency_${schoolId}`;
    const cached = localStorage.getItem(cacheKey);
    const records: IdempotencyRecord[] = cached ? JSON.parse(cached) : [];
    const existingIndex = records.findIndex(r => r.key === key);
    if (existingIndex !== -1) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    localStorage.setItem(cacheKey, JSON.stringify(records));
  } catch {
    // Ignore local storage errors
  }
}

/**
 * Create idempotency_keys table migration helper
 * This should be run as a migration
 */
export const IDEMPOTENCY_KEYS_TABLE_SQL = `
-- Idempotency keys table for money-changing operations
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_idempotency_key_per_school UNIQUE (school_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_school_id ON public.idempotency_keys(school_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON public.idempotency_keys(created_at);

-- RLS
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School admins can view idempotency keys" ON public.idempotency_keys;
CREATE POLICY "School admins can view idempotency keys"
  ON public.idempotency_keys FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "System can manage idempotency keys" ON public.idempotency_keys;
CREATE POLICY "System can manage idempotency keys"
  ON public.idempotency_keys FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));
`;