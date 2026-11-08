/**
 * masterAdminSettingsService.ts
 * Platform Announcements, Global Settings, and Feature Flags Management
 * Module: Communications & Global Settings
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logPlatformAction } from "./masterAdminAuditService";

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  type: "announcement" | "maintenance" | "critical" | "feature_update" | "billing_reminder";
  target_audience: "all" | "pro_plan" | "basic_plan" | "trial" | "specific_schools";
  target_school_ids?: string[];
  is_published: boolean;
  published_by?: string | null;
  published_by_name?: string | null;
  scheduled_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSetting {
  key: string;
  category: "branding" | "notifications" | "email" | "whatsapp" | "payment_gateway" | "security" | "maintenance";
  value: Record<string, unknown>;
  description?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface PlatformFeatureFlag {
  flag_key: string;
  name: string;
  description?: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  target_plans: string[];
  updated_at: string;
}

// In-memory fallback stores
const mockAnnouncementsStore: PlatformAnnouncement[] = [
  {
    id: "ann-001",
    title: "Scheduled Supabase PostgreSQL 15 Minor Upgrade",
    content: "We will be executing a seamless database maintenance window this Sunday between 02:00 AM - 02:30 AM IST.",
    type: "maintenance",
    target_audience: "all",
    target_school_ids: [],
    is_published: true,
    published_by: "admin-super-01",
    published_by_name: "Khaqan Ahmad",
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: "ann-002",
    title: "Introducing Live GPS Fleet Tracking for Pro Plans",
    content: "Schools on Pro and Custom tiers now have access to sub-second vehicle telemetry and parent bus notifications.",
    type: "feature_update",
    target_audience: "pro_plan",
    target_school_ids: [],
    is_published: true,
    published_by: "admin-super-01",
    published_by_name: "Khaqan Ahmad",
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

const mockSettingsStore: Record<string, PlatformSetting> = {
  "branding.platform": {
    key: "branding.platform",
    category: "branding",
    value: {
      platformName: "MyZkool SaaS",
      supportEmail: "support@myzkool.com",
      tagline: "Next-Gen Multi-Tenant School Management Platform",
      logoUrl: "/logo.svg",
    },
    description: "Platform visual identity and public support links.",
    updated_at: new Date().toISOString(),
  },
  "maintenance.mode": {
    key: "maintenance.mode",
    category: "maintenance",
    value: {
      enabled: false,
      bannerMessage: "Scheduled platform maintenance in progress. All systems will resume shortly.",
      allowedIps: [],
    },
    description: "Global platform maintenance toggle and emergency maintenance banner.",
    updated_at: new Date().toISOString(),
  },
  "email.smtp": {
    key: "email.smtp",
    category: "email",
    value: {
      provider: "SendGrid",
      fromAddress: "noreply@myzkool.com",
      fromName: "MyZkool Platform Notifications",
      dailyQuota: 50000,
      status: "connected",
    },
    description: "Platform transactional email routing and quota monitoring.",
    updated_at: new Date().toISOString(),
  },
  "whatsapp.gateway": {
    key: "whatsapp.gateway",
    category: "whatsapp",
    value: {
      provider: "Gupshup",
      registeredNumber: "+919876543210",
      status: "active",
      webhookVerified: true,
    },
    description: "Enterprise WhatsApp Business Cloud API integration.",
    updated_at: new Date().toISOString(),
  },
  "payment.razorpay": {
    key: "payment.razorpay",
    category: "payment_gateway",
    value: {
      merchantName: "MyZkool EdTech Pvt Ltd",
      webhookActive: true,
      autoCapture: true,
      settlementSchedule: "T+1",
    },
    description: "Subscription billing gateway status and auto-reconciliation parameters.",
    updated_at: new Date().toISOString(),
  },
};

const mockFeatureFlagsStore: PlatformFeatureFlag[] = [
  {
    flag_key: "gps_live_fleet_tracking",
    name: "Live GPS Bus Tracking",
    description: "Real-time telemetry and map projection for school transport fleets.",
    is_enabled: true,
    rollout_percentage: 100,
    target_plans: ["pro", "custom"],
    updated_at: new Date().toISOString(),
  },
  {
    flag_key: "ai_report_card_comments",
    name: "AI Report Card Remarks",
    description: "Automated constructive teacher comments powered by LLM summaries.",
    is_enabled: true,
    rollout_percentage: 50,
    target_plans: ["pro"],
    updated_at: new Date().toISOString(),
  },
  {
    flag_key: "whatsapp_automated_fee_reminders",
    name: "WhatsApp Fee Reminders",
    description: "Automated batch WhatsApp notices sent 3 days before fee due dates.",
    is_enabled: true,
    rollout_percentage: 100,
    target_plans: ["basic", "pro", "custom"],
    updated_at: new Date().toISOString(),
  },
  {
    flag_key: "biometric_rfid_gate_sync",
    name: "RFID Biometric Gate Sync",
    description: "Instant turnstile gate synchronization for staff and student arrival.",
    is_enabled: false,
    rollout_percentage: 0,
    target_plans: ["custom"],
    updated_at: new Date().toISOString(),
  },
];

// --- Announcements Operations ---

export async function getMasterAdminAnnouncements(): Promise<PlatformAnnouncement[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("platform_announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as PlatformAnnouncement[];
      }
    } catch {}
  }
  return [...mockAnnouncementsStore];
}

export async function createMasterAdminAnnouncement(
  input: {
    title: string;
    content: string;
    type: PlatformAnnouncement["type"];
    target_audience: PlatformAnnouncement["target_audience"];
    target_school_ids?: string[];
    is_published?: boolean;
    expires_at?: string | null;
  },
  admin: { id: string; email: string; name: string }
): Promise<PlatformAnnouncement> {
  const newAnnouncement: PlatformAnnouncement = {
    id: `ann-${Date.now().toString(36)}`,
    title: input.title.trim(),
    content: input.content.trim(),
    type: input.type,
    target_audience: input.target_audience,
    target_school_ids: input.target_school_ids || [],
    is_published: input.is_published ?? true,
    published_by: admin.id,
    published_by_name: admin.name,
    expires_at: input.expires_at || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockAnnouncementsStore.unshift(newAnnouncement);

  if (isSupabaseConfigured) {
    try {
      await supabase.from("platform_announcements").insert(newAnnouncement);
    } catch {}
  }

  await logPlatformAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "announcement.create",
    resourceType: "platform_announcements",
    resourceId: newAnnouncement.id,
    details: { title: newAnnouncement.title, type: newAnnouncement.type, target: newAnnouncement.target_audience },
  });

  return newAnnouncement;
}

export async function deleteMasterAdminAnnouncement(
  id: string,
  admin: { id: string; email: string }
): Promise<boolean> {
  const idx = mockAnnouncementsStore.findIndex((a) => a.id === id);
  if (idx === -1) return false;

  mockAnnouncementsStore.splice(idx, 1);

  if (isSupabaseConfigured) {
    try {
      await supabase.from("platform_announcements").delete().eq("id", id);
    } catch {}
  }

  await logPlatformAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "announcement.delete",
    resourceType: "platform_announcements",
    resourceId: id,
    details: { id },
  });

  return true;
}

// --- Settings Operations ---

export async function getMasterAdminSettings(category?: string): Promise<PlatformSetting[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from("platform_settings").select("*");
      if (category && category !== "all") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as PlatformSetting[];
      }
    } catch {}
  }

  let list = Object.values(mockSettingsStore);
  if (category && category !== "all") {
    list = list.filter((s) => s.category === category);
  }
  return list;
}

export async function updateMasterAdminSetting(
  key: string,
  value: Record<string, unknown>,
  admin: { id: string; email: string }
): Promise<PlatformSetting | null> {
  const existing = mockSettingsStore[key];
  if (!existing) {
    return null;
  }

  existing.value = { ...existing.value, ...value };
  existing.updated_at = new Date().toISOString();
  existing.updated_by = admin.id;

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("platform_settings")
        .update({
          value: existing.value,
          updated_at: existing.updated_at,
          updated_by: admin.id,
        })
        .eq("key", key);
    } catch {}
  }

  await logPlatformAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "settings.update",
    resourceType: "platform_settings",
    resourceId: key,
    details: { key, updatedFields: Object.keys(value) },
  });

  return existing;
}

// --- Feature Flags Operations ---

export async function getMasterAdminFeatureFlags(): Promise<PlatformFeatureFlag[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("platform_feature_flags").select("*");
      if (!error && data && data.length > 0) {
        return data as PlatformFeatureFlag[];
      }
    } catch {}
  }
  return [...mockFeatureFlagsStore];
}

export async function updateMasterAdminFeatureFlag(
  flagKey: string,
  updates: Partial<PlatformFeatureFlag>,
  admin: { id: string; email: string }
): Promise<PlatformFeatureFlag | null> {
  const flag = mockFeatureFlagsStore.find((f) => f.flag_key === flagKey);
  if (!flag) return null;

  Object.assign(flag, updates);
  flag.updated_at = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("platform_feature_flags")
        .update({
          ...updates,
          updated_at: flag.updated_at,
        })
        .eq("flag_key", flagKey);
    } catch {}
  }

  await logPlatformAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "feature_flag.update",
    resourceType: "platform_feature_flags",
    resourceId: flagKey,
    details: { flagKey, ...updates },
  });

  return flag;
}

