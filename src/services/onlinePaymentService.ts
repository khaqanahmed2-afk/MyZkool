/**
 * Online Payment Service (Spec B5.10, B4.7, B10, B11)
 *
 * Core engine for:
 * - Public Parent Pay Links & 30-Day Opaque Tokens
 * - 6-Digit WhatsApp OTP Verification (5 min validity, 3 attempts, 30 min session)
 * - Server-Side Amount Recomputation (Never trusts client-supplied amounts)
 * - Gateway Abstraction & Idempotent Webhook Processing
 * - Multi-Child Single Checkout (Shared payment_group_id)
 * - Race Condition Protection (Simultaneous payment becomes FeeCredit advance + Accountant Alert)
 * - 15-Minute Stale Order Reconciliation Job
 * - Settlement Reports & Failed Payment Outbox Notifications
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { collectFees } from "./collectionService";
import { getPaymentGatewayAdapter } from "./paymentGateway";
import type {
  GatewayType,
  OnlinePaymentOrder,
  SchoolGatewayCredentials,
  ParentPayToken,
  ParentPaySession,
  ParentPayContext,
  ParentPayStudentCard,
  SettlementReportRow,
} from "../types/onlinePayment";
import type { StudentDue, FeeCredit } from "../types/fees";

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

// ─── 1. School Gateway Credentials ──────────────────────────────────────────

export async function getSchoolGatewayCredentials(
  schoolId: string
): Promise<SchoolGatewayCredentials> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("school_gateway_credentials")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();

    if (data) return data as SchoolGatewayCredentials;
  }

  const cached = lsGet<SchoolGatewayCredentials>(`myzkool_gateway_creds_${schoolId}`);
  if (cached.length > 0 && cached[0].is_active) {
    return cached[0];
  }

  // Default credentials (mock adapter for testing/local dev)
  return {
    id: `cred_${schoolId}`,
    school_id: schoolId,
    gateway: "mock",
    key_id: "rzp_test_mockkey123",
    key_secret_enc: "mock_secret_abc456",
    webhook_secret_enc: "mock_webhook_secret_xyz789",
    who_bears_charges: "school",
    convenience_fee_percent: 2.0,
    is_active: true,
  };
}

export async function saveSchoolGatewayCredentials(
  schoolId: string,
  input: Partial<SchoolGatewayCredentials>
): Promise<SchoolGatewayCredentials> {
  const existing = await getSchoolGatewayCredentials(schoolId);
  const updated: SchoolGatewayCredentials = {
    ...existing,
    ...input,
    school_id: schoolId,
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase
      .from("school_gateway_credentials")
      .upsert(updated, { onConflict: "school_id,gateway" });
  }

  lsSet(`myzkool_gateway_creds_${schoolId}`, [updated]);
  return updated;
}

// ─── 2. Parent Pay Link & Opaque Token ──────────────────────────────────────

export async function generateParentPayLink(
  schoolId: string,
  parentId: string,
  dueIds?: string[]
): Promise<{ token: string; payUrl: string; expiresAt: string }> {
  const token = `pay_${crypto.randomUUID().replace(/-/g, "")}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  const tokenRecord: ParentPayToken = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    parent_id: parentId,
    token,
    expires_at: expiresAt,
    created_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("parent_pay_tokens").insert(tokenRecord);
  }

  const allTokens = lsGet<ParentPayToken>(`myzkool_parent_pay_tokens_${schoolId}`);
  lsSet(`myzkool_parent_pay_tokens_${schoolId}`, [...allTokens, tokenRecord]);

  // Retrieve school subdomain
  let subdomain = "demo";
  if (isSupabaseConfigured) {
    const { data: s } = await supabase.from("schools").select("subdomain").eq("id", schoolId).single();
    if (s?.subdomain) subdomain = s.subdomain;
  } else {
    const schools = lsGet<any>(`myzkool_schools`);
    const school = schools.find((s: any) => s.id === schoolId);
    if (school?.subdomain) subdomain = school.subdomain;
  }

  const payUrl = `https://${subdomain}.myzkool.com/pay/${token}`;

  // Log notification to outbox
  const outbox = lsGet<any>(`myzkool_fee_outbox_${schoolId}`);
  outbox.push({
    id: crypto.randomUUID(),
    school_id: schoolId,
    channel: "whatsapp",
    template_key: "parent_pay_link",
    recipient_parent_id: parentId,
    params: { pay_url: payUrl, expires_at: expiresAt, due_ids: dueIds || [] },
    status: "queued",
    created_at: nowISO(),
  });
  lsSet(`myzkool_fee_outbox_${schoolId}`, outbox);

  return { token, payUrl, expiresAt };
}

// ─── 3. OTP Verification & 30-Minute Session ────────────────────────────────

export async function requestParentPayOTP(
  token: string
): Promise<{ success: boolean; masked_phone: string; expires_in_seconds: number; error?: string }> {
  // 1. Locate token across stores
  let tokenRecord: ParentPayToken | null = null;

  if (isSupabaseConfigured) {
    const { data } = await supabase.from("parent_pay_tokens").select("*").eq("token", token).maybeSingle();
    tokenRecord = data as ParentPayToken;
  } else {
    // Search localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("myzkool_parent_pay_tokens_")) {
        const tokens = lsGet<ParentPayToken>(key);
        const found = tokens.find((t) => t.token === token);
        if (found) {
          tokenRecord = found;
          break;
        }
      }
    }
  }

  if (!tokenRecord) {
    return { success: false, masked_phone: "", expires_in_seconds: 0, error: "Invalid payment link." };
  }

  if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
    return { success: false, masked_phone: "", expires_in_seconds: 0, error: "Payment link has expired." };
  }

  // 2. Fetch parent phone
  let parentPhone = "+91 98765 43210";
  if (isSupabaseConfigured) {
    const { data: p } = await supabase.from("parents").select("phone").eq("id", tokenRecord.parent_id).maybeSingle();
    if (p?.phone) parentPhone = p.phone;
  } else {
    const parents = lsGet<any>(`myzkool_parents_${tokenRecord.school_id}`);
    const parent = parents.find((p: any) => p.id === tokenRecord?.parent_id);
    if (parent?.phone) parentPhone = parent.phone;
  }

  // 3. Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  const sessionRecord: ParentPaySession = {
    id: crypto.randomUUID(),
    token_id: tokenRecord.id,
    otp_code: otpCode,
    attempts: 0,
    max_attempts: 3,
    otp_expires_at: otpExpiresAt,
    verified: false,
    created_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("parent_pay_sessions").insert(sessionRecord);
  }

  const sessions = lsGet<ParentPaySession>(`myzkool_pay_sessions_${tokenRecord.school_id}`);
  lsSet(`myzkool_pay_sessions_${tokenRecord.school_id}`, [...sessions, sessionRecord]);

  // Queue OTP to outbox
  const outbox = lsGet<any>(`myzkool_fee_outbox_${tokenRecord.school_id}`);
  outbox.push({
    id: crypto.randomUUID(),
    school_id: tokenRecord.school_id,
    channel: "whatsapp",
    template_key: "parent_pay_otp",
    recipient_parent_id: tokenRecord.parent_id,
    params: { otp_code: otpCode, expires_in: "5 minutes" },
    status: "queued",
    created_at: nowISO(),
  });
  lsSet(`myzkool_fee_outbox_${tokenRecord.school_id}`, outbox);

  // Mask phone: "+91 ****** 3210"
  const digitsOnly = parentPhone.replace(/\D/g, "");
  const last4 = digitsOnly.slice(-4);
  const maskedPhone = `+91 ****** ${last4}`;

  return {
    success: true,
    masked_phone: maskedPhone,
    expires_in_seconds: 300,
  };
}

export async function verifyParentPayOTP(
  token: string,
  enteredOtp: string
): Promise<{ success: boolean; session_token?: string; remaining_attempts?: number; error?: string }> {
  // Find token
  let tokenRecord: ParentPayToken | null = null;
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("parent_pay_tokens").select("*").eq("token", token).maybeSingle();
    tokenRecord = data as ParentPayToken;
  } else {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("myzkool_parent_pay_tokens_")) {
        const tokens = lsGet<ParentPayToken>(key);
        const found = tokens.find((t) => t.token === token);
        if (found) {
          tokenRecord = found;
          break;
        }
      }
    }
  }

  if (!tokenRecord) {
    return { success: false, error: "Invalid payment token." };
  }

  // Find latest session for this token
  const sessions = lsGet<ParentPaySession>(`myzkool_pay_sessions_${tokenRecord.school_id}`);
  const session = sessions.filter((s) => s.token_id === tokenRecord?.id).pop();

  if (!session) {
    return { success: false, error: "No active OTP request found. Please request an OTP." };
  }

  // Check max attempts
  if (session.attempts >= session.max_attempts) {
    return { success: false, remaining_attempts: 0, error: "Maximum verification attempts exceeded. Request a new OTP." };
  }

  // Check expiration
  if (new Date(session.otp_expires_at).getTime() < Date.now()) {
    return { success: false, error: "OTP has expired. Request a new OTP." };
  }

  session.attempts += 1;

  if (session.otp_code !== enteredOtp.trim()) {
    lsSet(`myzkool_pay_sessions_${tokenRecord.school_id}`, sessions);
    const remaining = session.max_attempts - session.attempts;
    return {
      success: false,
      remaining_attempts: remaining,
      error: remaining > 0 ? `Incorrect OTP. ${remaining} attempt(s) remaining.` : "Maximum attempts exceeded.",
    };
  }

  // OTP verified: generate 30-minute session token
  session.verified = true;
  session.session_token = `sess_${crypto.randomUUID()}`;
  session.session_expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  if (isSupabaseConfigured) {
    await supabase
      .from("parent_pay_sessions")
      .update({
        verified: true,
        session_token: session.session_token,
        session_expires_at: session.session_expires_at,
        attempts: session.attempts,
      })
      .eq("id", session.id);
  }

  lsSet(`myzkool_pay_sessions_${tokenRecord.school_id}`, sessions);

  return {
    success: true,
    session_token: session.session_token,
  };
}

// ─── 4. Parent Pay Context (No sensitive data) ──────────────────────────────

export async function getParentPayContext(
  sessionToken: string
): Promise<{ success: boolean; context?: ParentPayContext; error?: string }> {
  // Validate session token across stores
  let activeSession: ParentPaySession | null = null;
  let schoolId = "";

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("myzkool_pay_sessions_")) {
      const sId = key.replace("myzkool_pay_sessions_", "");
      const sessions = lsGet<ParentPaySession>(key);
      const found = sessions.find((s) => s.session_token === sessionToken && s.verified);
      if (found) {
        activeSession = found;
        schoolId = sId;
        break;
      }
    }
  }

  if (!activeSession || !activeSession.session_expires_at) {
    return { success: false, error: "Invalid or unverified session token." };
  }

  if (new Date(activeSession.session_expires_at).getTime() < Date.now()) {
    return { success: false, error: "Payment session has expired. Please verify with OTP again." };
  }

  // Retrieve token record to get parent_id
  const tokens = lsGet<ParentPayToken>(`myzkool_parent_pay_tokens_${schoolId}`);
  const tokenRecord = tokens.find((t) => t.id === activeSession?.token_id);
  if (!tokenRecord) {
    return { success: false, error: "Token record not found." };
  }

  const parentId = tokenRecord.parent_id;

  // Retrieve School, Parent, and Children
  const schoolProfile = lsGet<any>(`myzkool_school_profile_${schoolId}`)[0] || {
    id: schoolId,
    name: "School Academy",
    subdomain: "academy",
  };

  const parents = lsGet<any>(`myzkool_parents_${schoolId}`);
  const parent = parents.find((p: any) => p.id === parentId) || {
    id: parentId,
    full_name: "Parent",
    phone: "+91 98765 43210",
  };

  // Find linked children via student_parents
  const studentParents = lsGet<any>(`myzkool_student_parents_${schoolId}`);
  const linkedStudentIds = studentParents
    .filter((sp: any) => sp.parent_id === parentId)
    .map((sp: any) => sp.student_id);

  const students = lsGet<any>(`myzkool_students_${schoolId}`).filter(
    (s: any) => linkedStudentIds.includes(s.id) && !s.deleted_at
  );

  const enrollments = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);
  const classes = lsGet<any>(`myzkool_classes_${schoolId}`);
  const sections = lsGet<any>(`myzkool_sections_${schoolId}`);
  const dues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
  const feeHeads = lsGet<any>(`myzkool_fee_heads_${schoolId}`);
  const terms = lsGet<any>(`myzkool_fee_terms_${schoolId}`);

  const todayStr = new Date().toISOString().split("T")[0];
  let totalOutstandingPaise = 0;
  const studentCards: ParentPayStudentCard[] = [];

  for (const st of students) {
    const enr = enrollments.find((e: any) => e.student_id === st.id);
    const cls = classes.find((c: any) => c.id === (enr?.class_id || st.admission_class_id));
    const sec = sections.find((s: any) => s.id === enr?.section_id);

    const sDues = dues.filter(
      (d) =>
        d.student_id === st.id &&
        (d.status === "pending" || d.status === "partial") &&
        d.balance_paise > 0
    );

    const mappedDues = sDues.map((d) => {
      const head = feeHeads.find((h: any) => h.id === d.fee_head_id);
      const term = terms.find((t: any) => t.id === d.term_id);
      const isOverdue = d.due_date < todayStr;
      return {
        due_id: d.id,
        fee_head_name: head?.name || d.description || "Fee Due",
        term_name: term?.name,
        due_date: d.due_date,
        balance_paise: d.balance_paise,
        is_overdue: isOverdue,
        is_current_term: !isOverdue,
      };
    });

    const cardTotal = mappedDues.reduce((acc, curr) => acc + curr.balance_paise, 0);
    totalOutstandingPaise += cardTotal;

    // Strict sanitization: NO aadhaar, medical, or sensitive records
    studentCards.push({
      student_id: st.id,
      student_name: `${st.first_name} ${st.last_name}`.trim(),
      admission_no: st.admission_no,
      class_name: cls?.name || "Grade",
      section_name: sec?.name,
      roll_no: enr?.roll_no,
      dues: mappedDues,
      total_due_paise: cardTotal,
    });
  }

  const credentials = await getSchoolGatewayCredentials(schoolId);

  return {
    success: true,
    context: {
      school_id: schoolId,
      school_name: schoolProfile.name,
      subdomain: schoolProfile.subdomain,
      parent_id: parentId,
      parent_name: parent.full_name,
      parent_phone: parent.phone,
      students: studentCards,
      total_outstanding_paise: totalOutstandingPaise,
      who_bears_charges: credentials.who_bears_charges,
      convenience_fee_percent: credentials.convenience_fee_percent,
    },
  };
}

// ─── 5. Server-Side Order Creation (Server Recomputes Amount) ───────────────

export async function createOnlinePaymentOrder(
  sessionToken: string,
  selectedDueIds: string[],
  clientSuppliedAmount?: number
): Promise<{
  success: boolean;
  order?: OnlinePaymentOrder;
  gateway_order_id?: string;
  key_id?: string;
  convenience_fee_paise?: number;
  total_paise?: number;
  error?: string;
}> {
  if (!selectedDueIds || selectedDueIds.length === 0) {
    return { success: false, error: "Please select at least one fee due to proceed." };
  }

  // 1. Validate session
  const ctxRes = await getParentPayContext(sessionToken);
  if (!ctxRes.success || !ctxRes.context) {
    return { success: false, error: ctxRes.error || "Authentication failed." };
  }

  const { context } = ctxRes;
  const schoolId = context.school_id;

  // 2. Fetch dues from database/store (CRITICAL: ignore clientSuppliedAmount)
  const allDues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
  const matchedDues = allDues.filter((d) => selectedDueIds.includes(d.id));

  if (matchedDues.length === 0) {
    return { success: false, error: "Selected dues not found or already settled." };
  }

  // Cross-tenant & parent verification: ensure dues belong to parent's children
  const parentStudentIds = context.students.map((s) => s.student_id);
  const unauthorizedDue = matchedDues.find((d) => !parentStudentIds.includes(d.student_id));
  if (unauthorizedDue) {
    return { success: false, error: "Unauthorized due selection detected." };
  }

  // SERVER RECOMPUTES AMOUNT DIRECTLY
  const recomputedAmountPaise = matchedDues.reduce((sum, d) => sum + d.balance_paise, 0);

  if (recomputedAmountPaise <= 0) {
    return { success: false, error: "Dues have already been fully settled." };
  }

  // 3. Compute convenience fee
  const credentials = await getSchoolGatewayCredentials(schoolId);
  let convenienceFeePaise = 0;
  if (credentials.who_bears_charges === "parent" && credentials.convenience_fee_percent > 0) {
    convenienceFeePaise = Math.round(
      (recomputedAmountPaise * credentials.convenience_fee_percent) / 100
    );
  }

  const totalGatewayPaise = recomputedAmountPaise + convenienceFeePaise;
  const studentIds = Array.from(new Set(matchedDues.map((d) => d.student_id)));
  const paymentGroupId = studentIds.length > 1 ? crypto.randomUUID() : undefined;

  // 4. Create Gateway Order
  const gatewayAdapter = getPaymentGatewayAdapter(credentials.gateway);
  const receiptRef = `REF_${Date.now().toString().slice(-8)}`;

  const gatewayResult = await gatewayAdapter.createOrder(
    {
      schoolId,
      amountPaise: totalGatewayPaise,
      currency: "INR",
      receiptRef,
      notes: {
        school_id: schoolId,
        parent_id: context.parent_id,
        due_count: String(matchedDues.length),
      },
    },
    credentials
  );

  // 5. Persist order record
  const orderRecord: OnlinePaymentOrder = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    parent_id: context.parent_id,
    student_ids: studentIds,
    due_ids: selectedDueIds,
    amount_paise: recomputedAmountPaise,
    convenience_fee_paise: convenienceFeePaise,
    currency: "INR",
    gateway: credentials.gateway,
    gateway_order_id: gatewayResult.gatewayOrderId,
    status: "created",
    payment_group_id: paymentGroupId,
    receipt_ids: [],
    advance_credit_ids: [],
    payer_phone: context.parent_phone,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    created_at: nowISO(),
    updated_at: nowISO(),
  };

  if (isSupabaseConfigured) {
    await supabase.from("online_payment_orders").insert(orderRecord);
  }

  const allOrders = lsGet<OnlinePaymentOrder>(`myzkool_online_orders_${schoolId}`);
  lsSet(`myzkool_online_orders_${schoolId}`, [...allOrders, orderRecord]);

  return {
    success: true,
    order: orderRecord,
    gateway_order_id: gatewayResult.gatewayOrderId,
    key_id: credentials.key_id,
    convenience_fee_paise: convenienceFeePaise,
    total_paise: totalGatewayPaise,
  };
}

// ─── 6. Finalise Order Capture & Receipt Generation ─────────────────────────

export async function finaliseOnlineOrderCapture(
  schoolId: string,
  gatewayOrderId: string,
  gatewayPaymentId: string,
  gatewaySignature?: string
): Promise<{ success: boolean; receipt_ids: string[]; error?: string }> {
  // Retrieve order
  const orders = lsGet<OnlinePaymentOrder>(`myzkool_online_orders_${schoolId}`);
  const orderIndex = orders.findIndex((o) => o.gateway_order_id === gatewayOrderId);

  if (orderIndex === -1) {
    return { success: false, receipt_ids: [], error: `Order ${gatewayOrderId} not found.` };
  }

  const order = orders[orderIndex];

  // Idempotency: If already captured, return existing receipts
  if (order.status === "captured") {
    return { success: true, receipt_ids: order.receipt_ids };
  }

  const allDues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
  const createdReceiptIds: string[] = [];
  const createdAdvanceIds: string[] = [];

  // Group dues by student
  const studentDuesMap = new Map<string, string[]>();
  for (const dueId of order.due_ids) {
    const due = allDues.find((d) => d.id === dueId);
    if (due) {
      const list = studentDuesMap.get(due.student_id) || [];
      list.push(due.id);
      studentDuesMap.set(due.student_id, list);
    }
  }

  // Collect fees per student
  for (const [studentId, dueIds] of studentDuesMap.entries()) {
    const studentSelectedDues = allDues.filter((d) => dueIds.includes(d.id));
    const stillUnpaidDues = studentSelectedDues.filter(
      (d) => (d.status === "pending" || d.status === "partial") && d.balance_paise > 0
    );

    const yearId = studentSelectedDues[0]?.academic_year_id || "";
    const originalDuePaise = studentSelectedDues.reduce(
      (sum, d) => sum + (d.net_paise ?? d.gross_paise ?? 0),
      0
    );
    const allocatedPaise =
      stillUnpaidDues.length > 0
        ? stillUnpaidDues.reduce((sum, d) => sum + d.balance_paise, 0)
        : (order.student_ids.length === 1 ? order.amount_paise : originalDuePaise);

    // RACE CONDITION CHECK: Were all these dues paid at the counter or by another parent?
    if (stillUnpaidDues.length === 0) {
      // DUPLICATE CAPTURE RULE: Convert entire amount to advance credit + write accountant alert!
      const credits = lsGet<FeeCredit>(`myzkool_fee_credits_${schoolId}`);
      const advanceId = crypto.randomUUID();
      credits.push({
        id: advanceId,
        school_id: schoolId,
        student_id: studentId,
        academic_year_id: yearId,
        amount_paise: allocatedPaise,
        remaining_paise: allocatedPaise,
        created_at: nowISO(),
      });
      lsSet(`myzkool_fee_credits_${schoolId}`, credits);
      createdAdvanceIds.push(advanceId);

      // Write alert for accountant
      const alerts = lsGet<any>(`myzkool_fee_alerts_${schoolId}`);
      alerts.push({
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: studentId,
        kind: "simultaneous_online_payment",
        message: `Simultaneous payment detected on order ${gatewayOrderId}. Dues were already settled; ₹${(allocatedPaise / 100).toFixed(2)} converted to student advance credit.`,
        created_at: nowISO(),
      });
      lsSet(`myzkool_fee_alerts_${schoolId}`, alerts);
      continue;
    }

    // Normal collection: create official receipt with source = 'online'
    const idempotencyKey = `online_${order.gateway_order_id}_${studentId}`;
    const collectRes = await collectFees(
      schoolId,
      {
        student_id: studentId,
        academic_year_id: yearId,
        payments: [
          {
            mode: "upi",
            amount_paise: allocatedPaise,
            reference_no: gatewayPaymentId,
          },
        ],
        source: "online",
        selected_due_ids: dueIds,
        payment_group_id: order.payment_group_id,
        remarks: `Online Payment via ${order.gateway.toUpperCase()} (${gatewayOrderId})`,
      },
      idempotencyKey
    );

    if (collectRes.receipt_id) {
      createdReceiptIds.push(collectRes.receipt_id);
    }
  }

  // Update order record
  order.status = "captured";
  order.gateway_payment_id = gatewayPaymentId;
  order.gateway_signature = gatewaySignature;
  order.captured_at = nowISO();
  order.receipt_ids = createdReceiptIds;
  order.advance_credit_ids = createdAdvanceIds;
  order.updated_at = nowISO();

  orders[orderIndex] = order;
  lsSet(`myzkool_online_orders_${schoolId}`, orders);

  if (isSupabaseConfigured) {
    await supabase
      .from("online_payment_orders")
      .update({
        status: "captured",
        gateway_payment_id: gatewayPaymentId,
        gateway_signature: gatewaySignature,
        captured_at: order.captured_at,
        receipt_ids: createdReceiptIds,
        advance_credit_ids: createdAdvanceIds,
        updated_at: order.updated_at,
      })
      .eq("id", order.id);
  }

  // Send WhatsApp receipt outbox message
  const outbox = lsGet<any>(`myzkool_fee_outbox_${schoolId}`);
  outbox.push({
    id: crypto.randomUUID(),
    school_id: schoolId,
    channel: "whatsapp",
    template_key: createdReceiptIds.length > 1 ? "fee_receipt_family" : "fee_receipt",
    recipient_parent_id: order.parent_id,
    params: {
      receipt_ids: createdReceiptIds,
      amount_paise: order.amount_paise,
      gateway_payment_id: gatewayPaymentId,
    },
    status: "queued",
    created_at: nowISO(),
  });
  lsSet(`myzkool_fee_outbox_${schoolId}`, outbox);

  return {
    success: true,
    receipt_ids: createdReceiptIds,
  };
}

// ─── 7. Webhook Handler with Signature Verification & Replay Protection ──────

export async function processPaymentWebhook(
  schoolId: string,
  rawBody: string,
  signature: string
): Promise<{ success: boolean; event_id?: string; replayed?: boolean; error?: string }> {
  const credentials = await getSchoolGatewayCredentials(schoolId);
  const gatewayAdapter = getPaymentGatewayAdapter(credentials.gateway);

  // 1. Signature Verification
  const verifyResult = await gatewayAdapter.verifyWebhook({
    rawBody,
    signature,
    secret: credentials.webhook_secret_enc,
  });

  if (!verifyResult.isValid) {
    return { success: false, error: verifyResult.error || "Forged or invalid webhook signature." };
  }

  const eventId = verifyResult.eventId || `evt_${crypto.randomUUID()}`;

  // 2. WEBHOOK REPLAY PROTECTION: Deduplicate by event_id
  const events = lsGet<any>(`myzkool_webhook_events_${schoolId}`);
  const existingEvent = events.find((e: any) => e.event_id === eventId);
  if (existingEvent) {
    return { success: true, event_id: eventId, replayed: true };
  }

  // Log event
  events.push({
    id: crypto.randomUUID(),
    school_id: schoolId,
    gateway: credentials.gateway,
    event_id: eventId,
    event_type: verifyResult.eventType,
    payload: verifyResult.payload,
    processed: false,
    created_at: nowISO(),
  });
  lsSet(`myzkool_webhook_events_${schoolId}`, events);

  // 3. Process Captured Event
  if (verifyResult.status === "captured" && verifyResult.gatewayOrderId) {
    await finaliseOnlineOrderCapture(
      schoolId,
      verifyResult.gatewayOrderId,
      verifyResult.gatewayPaymentId || `pay_${crypto.randomUUID().slice(0, 8)}`,
      signature
    );
  } else if (verifyResult.status === "failed" && verifyResult.gatewayOrderId) {
    // Handle Failed Payment
    const orders = lsGet<OnlinePaymentOrder>(`myzkool_online_orders_${schoolId}`);
    const order = orders.find((o) => o.gateway_order_id === verifyResult.gatewayOrderId);
    if (order) {
      order.status = "failed";
      order.updated_at = nowISO();
      lsSet(`myzkool_online_orders_${schoolId}`, orders);

      // Queue payment_failed template notification
      const outbox = lsGet<any>(`myzkool_fee_outbox_${schoolId}`);
      outbox.push({
        id: crypto.randomUUID(),
        school_id: schoolId,
        channel: "whatsapp",
        template_key: "payment_failed",
        recipient_parent_id: order.parent_id,
        params: { order_id: order.gateway_order_id, amount_paise: order.amount_paise },
        status: "queued",
        created_at: nowISO(),
      });
      lsSet(`myzkool_fee_outbox_${schoolId}`, outbox);
    }
  }

  return { success: true, event_id: eventId, replayed: false };
}

// ─── 8. Reconciliation Engine (Every 15 minutes) ────────────────────────────

export async function runOnlineReconciliationJob(
  schoolId: string
): Promise<{ evaluated: number; finalised: number; expired: number; failed: number }> {
  const orders = lsGet<OnlinePaymentOrder>(`myzkool_online_orders_${schoolId}`);
  const credentials = await getSchoolGatewayCredentials(schoolId);
  const gatewayAdapter = getPaymentGatewayAdapter(credentials.gateway);

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

  let evaluated = 0;
  let finalised = 0;
  let expired = 0;
  let failed = 0;

  const nonCaptureStatusUpdates = new Map<string, { status: "failed" | "expired"; updated_at: string }>();

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    if (o.status !== "created" && o.status !== "authorised") continue;

    const createdAtTime = new Date(o.created_at).getTime();
    // Only check orders pending for more than 10 minutes
    if (createdAtTime > tenMinutesAgo) continue;

    evaluated++;

    try {
      const statusRes = await gatewayAdapter.fetchOrderStatus(o.gateway_order_id, credentials);

      if (statusRes.status === "captured") {
        await finaliseOnlineOrderCapture(
          schoolId,
          o.gateway_order_id,
          statusRes.gatewayPaymentId || `pay_recon_${crypto.randomUUID().slice(0, 8)}`
        );
        finalised++;
      } else if (statusRes.status === "failed") {
        nonCaptureStatusUpdates.set(o.id, { status: "failed", updated_at: nowISO() });
        failed++;
      } else if (createdAtTime < thirtyMinutesAgo) {
        // Order expired after 30 minutes
        nonCaptureStatusUpdates.set(o.id, { status: "expired", updated_at: nowISO() });
        expired++;
      }
    } catch {
      // Non-fatal
    }
  }

  // Update failed or expired orders in latest storage without overwriting captured ones
  if (nonCaptureStatusUpdates.size > 0) {
    const latestOrders = lsGet<OnlinePaymentOrder>(`myzkool_online_orders_${schoolId}`);
    for (const ord of latestOrders) {
      const update = nonCaptureStatusUpdates.get(ord.id);
      if (update && ord.status !== "captured") {
        ord.status = update.status;
        ord.updated_at = update.updated_at;
      }
    }
    lsSet(`myzkool_online_orders_${schoolId}`, latestOrders);
  }

  return { evaluated, finalised, expired, failed };
}

// ─── 9. Settlement Report ───────────────────────────────────────────────────

export async function getSettlementReport(
  schoolId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ rows: SettlementReportRow[]; total_gross_paise: number; total_payout_paise: number }> {
  const orders = lsGet<OnlinePaymentOrder>(`myzkool_online_orders_${schoolId}`).filter(
    (o) => o.status === "captured"
  );
  const students = lsGet<any>(`myzkool_students_${schoolId}`);

  const rows: SettlementReportRow[] = [];
  let totalGross = 0;
  let totalPayout = 0;

  for (const o of orders) {
    const dateStr = (o.captured_at || o.created_at).split("T")[0];
    if (dateFrom && dateStr < dateFrom) continue;
    if (dateTo && dateStr > dateTo) continue;

    const stNames = o.student_ids
      .map((sid) => {
        const s = students.find((st: any) => st.id === sid);
        return s ? `${s.first_name} ${s.last_name}`.trim() : "Student";
      })
      .join(", ");

    // Standard merchant calculation: 2% gateway fee + 18% GST on fee
    const feePaise = Math.round(o.amount_paise * 0.02);
    const gstPaise = Math.round(feePaise * 0.18);
    const netPayout = o.amount_paise - feePaise - gstPaise;

    totalGross += o.amount_paise;
    totalPayout += netPayout;

    rows.push({
      order_id: o.id,
      gateway_order_id: o.gateway_order_id,
      gateway_payment_id: o.gateway_payment_id || "PAY_CAPTURED",
      business_date: dateStr,
      student_names: stNames,
      gross_amount_paise: o.amount_paise,
      gateway_fee_paise: feePaise,
      gst_on_fee_paise: gstPaise,
      net_payout_paise: netPayout,
      status: "captured",
    });
  }

  return {
    rows,
    total_gross_paise: totalGross,
    total_payout_paise: totalPayout,
  };
}
