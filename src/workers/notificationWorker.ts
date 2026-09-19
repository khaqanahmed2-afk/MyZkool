/**
 * Notification Worker
 * Processes notification_outbox queue with retry, dedupe_key, consent and quiet-hours checks
 * Behind a provider interface with a fake provider for testing
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { NotificationOutbox, NotificationChannel, ConsentStatus } from "../types/students";

/**
 * Notification Provider Interface
 */
export interface NotificationProvider {
  name: string;
  sendTemplate(params: SendTemplateParams): Promise<SendResult>;
  parseWebhook(payload: unknown): ParsedWebhook | null;
}

export interface SendTemplateParams {
  channel: NotificationChannel;
  templateKey: string;
  recipientPhone: string;
  params: Record<string, unknown>;
  schoolId: string;
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface ParsedWebhook {
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  error?: string;
}

/**
 * Fake Provider for testing/development
 */
export class FakeNotificationProvider implements NotificationProvider {
  name = "fake";
  private sentMessages: Array<SendTemplateParams & { id: string; sentAt: Date }> = [];
  private shouldFail = false;
  private failError = "Simulated failure";

  setShouldFail(shouldFail: boolean, error?: string) {
    this.shouldFail = shouldFail;
    this.failError = error || "Simulated failure";
  }

  getSentMessages() {
    return [...this.sentMessages];
  }

  clearSentMessages() {
    this.sentMessages = [];
  }

  async sendTemplate(params: SendTemplateParams): Promise<SendResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (this.shouldFail) {
      return { success: false, error: this.failError };
    }

    const messageId = `fake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.sentMessages.push({
      ...params,
      id: messageId,
      sentAt: new Date(),
    });

    return {
      success: true,
      providerMessageId: messageId,
    };
  }

  parseWebhook(payload: unknown): ParsedWebhook | null {
    // Fake webhook parsing
    const data = payload as Record<string, unknown>;
    if (data.messageId && data.status) {
      return {
        providerMessageId: data.messageId as string,
        status: data.status as "sent" | "delivered" | "read" | "failed",
        timestamp: new Date(data.timestamp as string || Date.now()),
        error: data.error as string | undefined,
      };
    }
    return null;
  }
}

/**
 * WhatsApp Provider (placeholder for real implementation)
 */
export class WhatsAppProvider implements NotificationProvider {
  name = "whatsapp";
  private accessToken: string;
  private phoneNumberId: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
  }

  async sendTemplate(params: SendTemplateParams): Promise<SendResult> {
    // Real implementation would call Meta Cloud API
    // For now, delegate to fake provider
    const fake = new FakeNotificationProvider();
    return fake.sendTemplate(params);
  }

  parseWebhook(payload: unknown): ParsedWebhook | null {
    // Real implementation would parse Meta webhook
    return null;
  }
}

/**
 * Provider Factory
 */
export class NotificationProviderFactory {
  private static providers: Map<string, NotificationProvider> = new Map();
  private static defaultProvider: NotificationProvider = new FakeNotificationProvider();

  static registerProvider(channel: NotificationChannel, provider: NotificationProvider) {
    this.providers.set(channel, provider);
  }

  static getProvider(channel: NotificationChannel): NotificationProvider {
    return this.providers.get(channel) || this.defaultProvider;
  }

  static setDefaultProvider(provider: NotificationProvider) {
    this.defaultProvider = provider;
  }
}

// Register fake provider as default for all channels
NotificationProviderFactory.registerProvider("whatsapp", new FakeNotificationProvider());
NotificationProviderFactory.registerProvider("sms", new FakeNotificationProvider());
NotificationProviderFactory.registerProvider("email", new FakeNotificationProvider());

/**
 * Quiet hours check (21:00 - 08:00 local time)
 */
function isQuietHours(): boolean {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 21 || hours < 8;
}

/**
 * Check if parent has consented to channel
 */
export async function checkConsent(schoolId: string, parentId: string, channel: NotificationChannel): Promise<boolean> {
  if (!parentId) return true; // No parent ID, assume consent for system messages

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("communication_consents")
        .select("status")
        .eq("school_id", schoolId)
        .eq("parent_id", parentId)
        .eq("channel", channel)
        .order("captured_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return data.status === "opted_in";
      }
    } catch {
      // Fall through
    }
  }

  // Local storage fallback
  try {
    const consentsKey = `myzkool_communication_consents_${schoolId}`;
    const cached = localStorage.getItem(consentsKey);
    if (cached) {
      const consents: Array<{ parent_id: string; channel: string; status: string; captured_at: string }> = JSON.parse(cached);
      const match = consents
        .filter(c => c.parent_id === parentId && c.channel === channel)
        .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())[0];
      if (match) {
        return match.status === "opted_in";
      }
    }
  } catch {
    // Ignore
  }

  // Default to opted_in if no record found
  return true;
}

/**
 * Process a single notification outbox entry
 */
export async function processNotification(
  outbox: NotificationOutbox,
  customProvider?: NotificationProvider
): Promise<NotificationOutbox & { error?: string }> {
  const provider = customProvider || NotificationProviderFactory.getProvider(outbox.channel);
  
  // Check consent
  const hasConsent = await checkConsent(outbox.school_id, outbox.recipient_parent_id || "", outbox.channel);
  if (!hasConsent) {
    return {
      ...outbox,
      status: "skipped",
      error: "Parent has opted out of this channel",
    };
  }

  // Check quiet hours for non-urgent messages
  const urgentTemplates = ["receipt", "payment_confirmation", "admission_confirmation"];
  const isUrgent = urgentTemplates.some(t => outbox.template_key.includes(t));
  
  if (!isUrgent && isQuietHours()) {
    // Reschedule for after quiet hours
    const tomorrow = new Date();
    tomorrow.setHours(8, 0, 0, 0);
    if (tomorrow <= new Date()) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    if (isSupabaseConfigured) {
      await supabase
        .from("notification_outbox")
        .update({ 
          status: "queued", 
          scheduled_at: tomorrow.toISOString(),
          attempts: outbox.attempts,
        })
        .eq("id", outbox.id);
    }
    
    return {
      ...outbox,
      status: "queued",
      scheduled_at: tomorrow.toISOString(),
      error: "Rescheduled due to quiet hours",
    };
  }

  // Send via provider
  const result = await provider.sendTemplate({
    channel: outbox.channel,
    templateKey: outbox.template_key,
    recipientPhone: outbox.recipient_phone,
    params: outbox.params,
    schoolId: outbox.school_id,
  });

  const newAttempts = (outbox.attempts || 0) + 1;
  const maxAttempts = 5;

  if (result.success) {
    const updated: NotificationOutbox = {
      ...outbox,
      status: "sent",
      provider_message_id: result.providerMessageId || "msg-" + Date.now(),
      sent_at: new Date().toISOString(),
      attempts: newAttempts,
    };

    if (isSupabaseConfigured) {
      await supabase
        .from("notification_outbox")
        .update({
          status: "sent",
          provider_message_id: updated.provider_message_id,
          sent_at: updated.sent_at,
          attempts: updated.attempts,
        })
        .eq("id", outbox.id);
    }

    return updated;
  } else {
    if (newAttempts >= maxAttempts) {
      const updated: NotificationOutbox = {
        ...outbox,
        status: "failed",
        error: result.error,
        attempts: newAttempts,
      };

      if (isSupabaseConfigured) {
        await supabase
          .from("notification_outbox")
          .update({
            status: "failed",
            error: result.error,
            attempts: newAttempts,
          })
          .eq("id", outbox.id);
      }

      return updated;
    } else {
      // Exponential backoff: 1min, 2min, 4min, 8min, 16min
      const delayMinutes = Math.pow(2, newAttempts - 1);
      const nextAttempt = new Date(Date.now() + delayMinutes * 60 * 1000);
      
      const updated: NotificationOutbox = {
        ...outbox,
        status: "queued",
        error: result.error,
        attempts: newAttempts,
        scheduled_at: nextAttempt.toISOString(),
      };

      if (isSupabaseConfigured) {
        await supabase
          .from("notification_outbox")
          .update({
            status: "queued",
            error: result.error,
            attempts: newAttempts,
            scheduled_at: nextAttempt.toISOString(),
          })
          .eq("id", outbox.id);
      }

      return updated;
    }
  }
}

export interface NotificationWorkerOptions {
  provider?: NotificationProvider;
  pollIntervalMs?: number;
  batchSize?: number;
  maxAttempts?: number;
}

/**
 * Notification Worker Class
 * Processes the notification_outbox queue
 */
export class NotificationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pollInterval = 5000; // 5 seconds
  private batchSize = 10;
  private provider?: NotificationProvider;

  constructor(options?: NotificationWorkerOptions) {
    if (options?.provider) this.provider = options.provider;
    if (options?.pollIntervalMs) this.pollInterval = options.pollIntervalMs;
    if (options?.batchSize) this.batchSize = options.batchSize;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => this.processBatch(), this.pollInterval);
    console.log("Notification worker started");
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("Notification worker stopped");
  }

  async processBatch(): Promise<void> {
    if (!isSupabaseConfigured) return;

    try {
      const now = new Date().toISOString();
      
      // Get queued notifications that are due
      const { data: notifications, error } = await supabase
        .from("notification_outbox")
        .select("*")
        .eq("status", "queued")
        .lte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(this.batchSize);

      if (error || !notifications || notifications.length === 0) {
        return;
      }

      // Process each notification
      for (const notification of notifications) {
        await this.processItem(notification as NotificationOutbox);
      }
    } catch (error) {
      console.error("Notification worker error:", error);
    }
  }

  async processItem(outbox: NotificationOutbox): Promise<NotificationOutbox & { error?: string }> {
    return await processNotification(outbox, this.provider);
  }

  /**
   * Manually trigger processing (for testing)
   */
  async triggerProcess(): Promise<void> {
    await this.processBatch();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      pollInterval: this.pollInterval,
      batchSize: this.batchSize,
    };
  }
}

// Export singleton instance
export const notificationWorker = new NotificationWorker();

/**
 * Helper to queue a notification
 */
export async function queueNotification(
  schoolId: string,
  input: Omit<NotificationOutbox, "id" | "school_id" | "status" | "attempts" | "created_at" | "sent_at" | "provider_message_id" | "error">
): Promise<{ outbox?: NotificationOutbox; error?: string }> {
  // Check dedupe_key
  if (input.dedupe_key && isSupabaseConfigured) {
    const { data: existing } = await supabase
      .from("notification_outbox")
      .select("id")
      .eq("dedupe_key", input.dedupe_key)
      .single();
    
    if (existing) {
      return { error: "Duplicate notification (dedupe_key)" };
    }
  }

  const outbox: NotificationOutbox = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    ...input,
    status: "queued",
    attempts: 0,
    created_at: new Date().toISOString(),
    scheduled_at: input.scheduled_at || new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("notification_outbox")
        .insert(outbox)
        .select()
        .single();

      if (!error && data) {
        return { outbox: data as NotificationOutbox };
      }
      return { error: error?.message || "Failed to queue notification" };
    } catch (err) {
      return { error: String(err) };
    }
  }

  // Local storage fallback
  try {
    const cacheKey = `myzkool_notification_outbox_${schoolId}`;
    const cached = localStorage.getItem(cacheKey);
    const outboxItems: NotificationOutbox[] = cached ? JSON.parse(cached) : [];
    if (input.dedupe_key && outboxItems.some((item) => item.dedupe_key === input.dedupe_key)) {
      return { error: "Duplicate notification (dedupe_key)" };
    }
    outboxItems.push(outbox);
    localStorage.setItem(cacheKey, JSON.stringify(outboxItems));
    return { outbox };
  } catch {
    return { error: "Failed to queue notification" };
  }
}

/**
 * Template registry for WhatsApp templates
 */
export interface NotificationTemplate {
  key: string;
  language: string;
  body: string; // With {{1}}, {{2}} placeholders
  category: "marketing" | "utility" | "authentication";
  approvalStatus: "pending" | "approved" | "rejected";
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    key: "admission_confirmation",
    language: "en",
    body: "Welcome to {{1}}! Your child {{2}} (Admission No: {{3}}) has been admitted to {{4}}. Classes begin on {{5}}.",
    category: "utility",
    approvalStatus: "approved",
  },
  {
    key: "fee_reminder",
    language: "en",
    body: "Dear Parent, fee of Rs {{1}} for {{2}} is due on {{3}}. Pay now: {{4}}",
    category: "utility",
    approvalStatus: "approved",
  },
  {
    key: "payment_confirmation",
    language: "en",
    body: "Payment of Rs {{1}} received for {{2}} (Admission No: {{3}}). Receipt: {{4}}",
    category: "utility",
    approvalStatus: "approved",
  },
  {
    key: "attendance_alert",
    language: "en",
    body: "{{1}} was marked absent on {{2}}. Please contact school if this is an error.",
    category: "utility",
    approvalStatus: "approved",
  },
  {
    key: "docs_pending",
    language: "en",
    body: "Reminder: The following documents are pending for {{1}}: {{2}}. Please submit by {{3}}.",
    category: "utility",
    approvalStatus: "approved",
  },
  {
    key: "tc_issued",
    language: "en",
    body: "Transfer Certificate {{1}} has been issued for {{2}}. Collect from school office.",
    category: "utility",
    approvalStatus: "approved",
  },
  {
    key: "promotion_notice",
    language: "en",
    body: "{{1}} has been promoted to {{2}} for the academic year {{3}}.",
    category: "utility",
    approvalStatus: "approved",
  },
];

/**
 * Render template with parameters
 */
export function renderTemplate(templateKey: string, params: Record<string, unknown>, language = "en"): string {
  const template = NOTIFICATION_TEMPLATES.find(t => t.key === templateKey && t.language === language);
  if (!template) {
    return `Template not found: ${templateKey}`;
  }

  let body = template.body;
  Object.entries(params).forEach(([key, value]) => {
    body = body.replaceAll(`{{${key}}}`, String(value));
  });

  // Also support numeric placeholders {{1}}, {{2}}, etc.
  Object.entries(params).forEach(([key, value], index) => {
    body = body.replaceAll(`{{${index + 1}}}`, String(value));
  });

  return body;
}