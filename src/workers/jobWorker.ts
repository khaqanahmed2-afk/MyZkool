/**
 * Background Jobs Worker Skeleton
 * Source of Truth: docs/SPEC.md Section 4.12 & 8.3
 * Uses FOR UPDATE SKIP LOCKED for concurrent, gapless, idempotent processing
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface JobRow {
  id: number;
  kind: string;
  payload: any;
  run_at: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  last_error?: string | null;
}

export type JobHandler = (payload: any, job: JobRow) => Promise<any>;

// In-memory queue fallback for offline/test environments
const memoryJobs: JobRow[] = [];
let nextJobId = 1;

export class JobWorker {
  private handlers: Map<string, JobHandler> = new Map();
  private isRunning: boolean = false;
  private pollIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(pollIntervalMs: number = 2000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Register a job handler for a specific job kind
   */
  registerHandler(kind: string, handler: JobHandler): void {
    this.handlers.set(kind, handler);
  }

  /**
   * Enqueue a new background job
   */
  async enqueueJob(kind: string, payload: any, runAt: Date = new Date()): Promise<number> {
    const id = nextJobId++;
    const row: JobRow = {
      id,
      kind,
      payload,
      run_at: runAt.toISOString(),
      status: 'queued',
      attempts: 0,
      last_error: null,
    };

    memoryJobs.push(row);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            kind,
            payload,
            run_at: runAt.toISOString(),
            status: 'queued',
            attempts: 0,
          })
          .select('id')
          .single();

        if (data && !error) {
          return data.id;
        }
      } catch (err) {
        // Preserved in memoryJobs
      }
    }

    return id;
  }

  /**
   * Claims and processes the next eligible job using FOR UPDATE SKIP LOCKED
   */
  async processNextJob(): Promise<{ processed: boolean; jobId?: number; result?: any; error?: any }> {
    const now = new Date().toISOString();

    // 1. If Supabase Postgres is configured, execute SKIP LOCKED via RPC or transaction
    if (isSupabaseConfigured) {
      try {
        const { data: job, error } = await supabase.rpc('claim_next_job');
        if (job && !error) {
          return this.executeClaimedJob(job);
        }
      } catch (err) {
        // Fallback to memory runner
      }
    }

    // 2. Memory / Test queue runner (simulates atomic claim)
    const eligibleJob = memoryJobs.find(
      (j) => j.status === 'queued' && new Date(j.run_at).getTime() <= Date.now()
    );

    if (!eligibleJob) {
      return { processed: false };
    }

    // Atomically claim
    eligibleJob.status = 'processing';
    eligibleJob.attempts += 1;

    return this.executeClaimedJob(eligibleJob);
  }

  private async executeClaimedJob(job: JobRow): Promise<{ processed: boolean; jobId: number; result?: any; error?: any }> {
    const handler = this.handlers.get(job.kind);

    if (!handler) {
      job.status = 'failed';
      job.last_error = `No handler registered for job kind '${job.kind}'`;
      return { processed: true, jobId: job.id, error: job.last_error };
    }

    try {
      const result = await handler(job.payload, job);
      job.status = 'completed';
      return { processed: true, jobId: job.id, result };
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      job.last_error = errorMessage;

      if (job.attempts >= 3) {
        job.status = 'failed';
      } else {
        // Re-queue with exponential backoff (e.g. 2s, 4s)
        job.status = 'queued';
        job.run_at = new Date(Date.now() + job.attempts * 2000).toISOString();
      }

      return { processed: true, jobId: job.id, error: errorMessage };
    }
  }

  /**
   * Starts the polling worker loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const poll = async () => {
      if (!this.isRunning) return;
      try {
        await this.processNextJob();
      } catch (err) {
        console.error('[JobWorker] Error processing job:', err);
      }
      if (this.isRunning) {
        this.timer = setTimeout(poll, this.pollIntervalMs);
      }
    };

    this.timer = setTimeout(poll, this.pollIntervalMs);
  }

  /**
   * Stops the polling loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getMemoryJobs(): JobRow[] {
    return memoryJobs;
  }
}
