/**
 * Online Payment Reconciliation Engine (Spec B5.10)
 *
 * Runs every 15 minutes:
 * - Scans orders in 'created' or 'authorised' for > 10 minutes.
 * - Queries the payment gateway for authoritative status.
 * - Captures confirmed orders idempotently (creating official receipts).
 * - Expires orders older than 30 minutes without capture.
 */

import { runOnlineReconciliationJob } from "./onlinePaymentService";

export { runOnlineReconciliationJob };
