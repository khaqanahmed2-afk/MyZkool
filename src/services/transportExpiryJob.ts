/**
 * Daily 08:00 Document Expiry Job (Spec C9, C3, C15)
 *
 * Evaluates document expiry across all vehicles and drivers at configured thresholds
 * (default: 30, 15, 7, 1 days, and <= 0 for expired).
 * Writes in-app notifications and outbox messages deduped by document and threshold.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  getTransportSettings,
  getAllVehicleDocuments,
  getVehicles,
  getTransportStaff,
} from "./transportCoreService";
import type { ExpiryAlertItem } from "../types/transport";

function nowISO(): string {
  return new Date().toISOString();
}

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

export async function runDocumentExpiryJob(schoolId: string): Promise<{
  scanned: number;
  alertsCreated: number;
  skippedDuplicates: number;
  alerts: ExpiryAlertItem[];
}> {
  const settings = await getTransportSettings(schoolId);
  // Sort thresholds ascending: [0, 1, 7, 15, 30]
  const thresholds = Array.from(
    new Set([...(settings.expiry_alert_days || [30, 15, 7, 1]), 0])
  ).sort((a, b) => a - b);

  const vehicles = await getVehicles(schoolId);
  const vehicleDocs = await getAllVehicleDocuments(schoolId);
  const staffList = await getTransportStaff(schoolId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingAlerts = lsGet<any>(`myzkool_fee_alerts_${schoolId}`);
  const outbox = lsGet<any>(`myzkool_fee_outbox_${schoolId}`);

  let scanned = 0;
  let alertsCreated = 0;
  let skippedDuplicates = 0;
  const createdAlerts: ExpiryAlertItem[] = [];

  // 1. Scan Vehicle Documents
  for (const doc of vehicleDocs) {
    if (!doc.expires_on || doc.deleted_at) continue;
    scanned++;

    const expDate = new Date(doc.expires_on);
    expDate.setHours(0, 0, 0, 0);
    const diffMs = expDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const vehicle = vehicles.find((v) => v.id === doc.vehicle_id);
    const vehicleReg = vehicle?.registration_no || "Unknown Vehicle";

    // Find the current active threshold bucket (smallest threshold >= daysRemaining)
    const activeThreshold = thresholds.find((t) => daysRemaining <= t);
    if (activeThreshold !== undefined) {
      const dedupeKey = `doc_expiry_${schoolId}_vehicle_${doc.id}_t${activeThreshold}`;

      const alreadySent = existingAlerts.some((a: any) => a.dedupe_key === dedupeKey);
      if (alreadySent) {
        skippedDuplicates++;
        continue;
      }

      const isExpired = daysRemaining <= 0;
      const title = isExpired
        ? `Vehicle ${vehicleReg}: ${doc.doc_type.toUpperCase()} document expired`
        : `Vehicle ${vehicleReg}: ${doc.doc_type.toUpperCase()} document expiring in ${daysRemaining} day(s)`;

      const alertItem: ExpiryAlertItem = {
        id: crypto.randomUUID(),
        school_id: schoolId,
        entity_type: "vehicle",
        entity_id: doc.vehicle_id,
        entity_name: vehicleReg,
        doc_type: doc.doc_type,
        doc_number: doc.doc_number,
        expires_on: doc.expires_on,
        days_remaining: daysRemaining,
        threshold_days: activeThreshold,
        dedupe_key: dedupeKey,
      };

      existingAlerts.push({
        id: alertItem.id,
        school_id: schoolId,
        kind: "transport_document_expiry",
        dedupe_key: dedupeKey,
        title,
        message: `${doc.doc_type.toUpperCase()} (#${doc.doc_number}) expires on ${doc.expires_on}.`,
        severity: isExpired ? "high" : "medium",
        created_at: nowISO(),
      });

      outbox.push({
        id: crypto.randomUUID(),
        school_id: schoolId,
        channel: "whatsapp",
        template_key: "transport_doc_expiry",
        params: {
          vehicle_reg: vehicleReg,
          doc_type: doc.doc_type,
          expires_on: doc.expires_on,
          days_remaining: daysRemaining,
        },
        status: "queued",
        created_at: nowISO(),
      });

      alertsCreated++;
      createdAlerts.push(alertItem);
    }
  }

  // 2. Scan Staff License and Documents
  for (const st of staffList) {
    if (st.deleted_at) continue;

    if (st.license_expires_on) {
      scanned++;
      const expDate = new Date(st.license_expires_on);
      expDate.setHours(0, 0, 0, 0);
      const diffMs = expDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const activeThreshold = thresholds.find((t) => daysRemaining <= t);
      if (activeThreshold !== undefined) {
        const dedupeKey = `doc_expiry_${schoolId}_staff_license_${st.id}_t${activeThreshold}`;

        const alreadySent = existingAlerts.some((a: any) => a.dedupe_key === dedupeKey);
        if (alreadySent) {
          skippedDuplicates++;
          continue;
        }

        const isExpired = daysRemaining <= 0;
        const title = isExpired
          ? `Driver ${st.full_name}: Driving license expired`
          : `Driver ${st.full_name}: Driving license expiring in ${daysRemaining} day(s)`;

        const alertItem: ExpiryAlertItem = {
          id: crypto.randomUUID(),
          school_id: schoolId,
          entity_type: "staff",
          entity_id: st.id,
          entity_name: st.full_name,
          doc_type: "license",
          doc_number: st.license_no || undefined,
          expires_on: st.license_expires_on,
          days_remaining: daysRemaining,
          threshold_days: activeThreshold,
          dedupe_key: dedupeKey,
        };

        existingAlerts.push({
          id: alertItem.id,
          school_id: schoolId,
          kind: "transport_document_expiry",
          dedupe_key: dedupeKey,
          title,
          message: `License #${st.license_no || "N/A"} expires on ${st.license_expires_on}.`,
          severity: isExpired ? "high" : "medium",
          created_at: nowISO(),
        });

        alertsCreated++;
        createdAlerts.push(alertItem);
      }
    }
  }

  lsSet(`myzkool_fee_alerts_${schoolId}`, existingAlerts);
  lsSet(`myzkool_fee_outbox_${schoolId}`, outbox);

  return {
    scanned,
    alertsCreated,
    skippedDuplicates,
    alerts: createdAlerts,
  };
}
