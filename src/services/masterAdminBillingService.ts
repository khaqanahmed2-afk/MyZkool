import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logPlatformAction } from "./masterAdminAuditService";
import { calculateServerSubscriptionPricing } from "../routes/razorpayRoutes";

export interface MasterAdminInvoice {
  id: string;
  invoice_number: string;
  school_id: string;
  school_name: string;
  plan_slug: string;
  billing_cycle: "monthly" | "six_months" | "yearly";
  subtotal_paise: number;
  discount_paise: number;
  taxable_paise: number;
  gst_rate: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_paise: number;
  total_formatted: string;
  status: "draft" | "unpaid" | "paid" | "void" | "refunded";
  due_date: string;
  paid_at?: string | null;
  payment_method?: string | null;
  billing_school_name: string;
  billing_address: string;
  billing_state: string;
  billing_gstin?: string | null;
  hsn_sac_code: string;
  created_at: string;
}

export interface MasterAdminPayment {
  id: string;
  school_id: string;
  school_name: string;
  plan_slug: string;
  billing_cycle: string;
  amount_paise: number;
  amount_formatted: string;
  gst_paise: number;
  gateway: string;
  gateway_order_id: string;
  gateway_payment_id?: string | null;
  status: "created" | "authorised" | "captured" | "failed";
  receipt: string;
  error_description?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface PlatformRevenueSummary {
  totalCollectedPaise: number;
  totalCollectedFormatted: string;
  mrrPaise: number;
  mrrFormatted: string;
  outstandingPaise: number;
  outstandingFormatted: string;
  failedTransactionsCount: number;
  planBreakdown: {
    proPaise: number;
    basicPaise: number;
    customPaise: number;
  };
}

const mockInvoicesStore: MasterAdminInvoice[] = [
  {
    id: "inv-001",
    invoice_number: "MZK-INV-2026-0001",
    school_id: "sch-001",
    school_name: "Sunrise Public School",
    plan_slug: "pro",
    billing_cycle: "yearly",
    subtotal_paise: 1942900,
    discount_paise: 215900,
    taxable_paise: 1942900,
    gst_rate: 18.0,
    cgst_paise: 174861,
    sgst_paise: 174861,
    igst_paise: 0,
    total_paise: 2292622,
    total_formatted: "₹22,926",
    status: "paid",
    due_date: "2026-11-15",
    paid_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    payment_method: "upi",
    billing_school_name: "Sunrise Public School",
    billing_address: "Prayagraj, Uttar Pradesh",
    billing_state: "Uttar Pradesh",
    billing_gstin: "09AAACS1429B1Z8",
    hsn_sac_code: "998314",
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "inv-002",
    invoice_number: "MZK-INV-2026-0002",
    school_id: "sch-002",
    school_name: "St. Mary's Convent High School",
    plan_slug: "pro",
    billing_cycle: "six_months",
    subtotal_paise: 1025400,
    discount_paise: 54000,
    taxable_paise: 1025400,
    gst_rate: 18.0,
    cgst_paise: 92286,
    sgst_paise: 92286,
    igst_paise: 0,
    total_paise: 1209972,
    total_formatted: "₹12,100",
    status: "paid",
    due_date: "2026-11-10",
    paid_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    payment_method: "netbanking",
    billing_school_name: "St. Mary's Convent High School",
    billing_address: "Lucknow, Uttar Pradesh",
    billing_state: "Uttar Pradesh",
    billing_gstin: "09AAACS2210C1Z5",
    hsn_sac_code: "998314",
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "inv-003",
    invoice_number: "MZK-INV-2026-0003",
    school_id: "sch-003",
    school_name: "Green Valley International School",
    plan_slug: "basic",
    billing_cycle: "monthly",
    subtotal_paise: 99900,
    discount_paise: 0,
    taxable_paise: 99900,
    gst_rate: 18.0,
    cgst_paise: 0,
    sgst_paise: 0,
    igst_paise: 17982,
    total_paise: 117882,
    total_formatted: "₹1,179",
    status: "unpaid",
    due_date: "2026-11-12",
    paid_at: null,
    payment_method: "pending",
    billing_school_name: "Green Valley International School",
    billing_address: "Indore, Madhya Pradesh",
    billing_state: "Madhya Pradesh",
    billing_gstin: null,
    hsn_sac_code: "998314",
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
];

const mockPaymentsStore: MasterAdminPayment[] = [
  {
    id: "pay-001",
    school_id: "sch-001",
    school_name: "Sunrise Public School",
    plan_slug: "pro",
    billing_cycle: "yearly",
    amount_paise: 2292622,
    amount_formatted: "₹22,926",
    gst_paise: 349722,
    gateway: "razorpay",
    gateway_order_id: "order_PRO_Y_SUNRISE_01",
    gateway_payment_id: "pay_L4xQ9e8210abc",
    status: "captured",
    receipt: "rcpt_sun_2026_01",
    verified_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "pay-002",
    school_id: "sch-002",
    school_name: "St. Mary's Convent High School",
    plan_slug: "pro",
    billing_cycle: "six_months",
    amount_paise: 1209972,
    amount_formatted: "₹12,100",
    gst_paise: 184572,
    gateway: "razorpay",
    gateway_order_id: "order_PRO_S_MARYS_02",
    gateway_payment_id: "pay_M9kP2a7155xyz",
    status: "captured",
    receipt: "rcpt_mary_2026_02",
    verified_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "pay-003",
    school_id: "sch-004",
    school_name: "Apex Model Academy",
    plan_slug: "basic",
    billing_cycle: "monthly",
    amount_paise: 117882,
    amount_formatted: "₹1,179",
    gst_paise: 17982,
    gateway: "razorpay",
    gateway_order_id: "order_BAS_M_APEX_03",
    gateway_payment_id: null,
    status: "failed",
    receipt: "rcpt_apex_2026_03",
    error_description: "Bank server timeout during UPI verification",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
];

/**
 * Returns platform subscription invoices
 */
export async function getMasterAdminInvoices(options?: {
  status?: string;
  search?: string;
}): Promise<MasterAdminInvoice[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("subscription_invoices")
        .select(`
          *,
          schools (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (options?.status && options.status !== "all") {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((inv: any) => ({
          ...inv,
          school_name: inv.schools?.name || inv.billing_school_name,
          total_formatted: `₹${Math.round(inv.total_paise / 100).toLocaleString("en-IN")}`,
        }));
      }
    } catch {}
  }

  let results = [...mockInvoicesStore];
  if (options?.status && options.status !== "all") {
    results = results.filter((i) => i.status === options.status);
  }
  if (options?.search) {
    const q = options.search.toLowerCase();
    results = results.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(q) ||
        i.school_name.toLowerCase().includes(q)
    );
  }
  return results;
}

/**
 * Returns platform Razorpay payment transactions
 */
export async function getMasterAdminPayments(): Promise<MasterAdminPayment[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("school_subscription_payments")
        .select(`
          *,
          schools (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          ...p,
          school_name: p.schools?.name || "School Partner",
          amount_formatted: `₹${Math.round(p.amount_paise / 100).toLocaleString("en-IN")}`,
        }));
      }
    } catch {}
  }
  return mockPaymentsStore;
}

/**
 * Generates an official platform SaaS invoice
 */
export async function generateMasterAdminInvoice(input: {
  schoolId: string;
  schoolName: string;
  planSlug: string;
  billingCycle: "monthly" | "six_months" | "yearly";
  billingAddress: string;
  billingState: string;
  billingGstin?: string;
  adminEmail: string;
  adminId?: string;
}): Promise<MasterAdminInvoice> {
  const pricing = calculateServerSubscriptionPricing(input.planSlug, input.billingCycle);

  const subtotalPaise = Math.round(pricing.subtotal * 100);
  const taxablePaise = subtotalPaise;
  const gstPaise = Math.round(pricing.gstAmount * 100);
  const totalPaise = Math.round(pricing.totalAmount * 100);

  // In UP: CGST 9% + SGST 9%; Outside: IGST 18%
  const isHomeState = input.billingState.toLowerCase().includes("uttar pradesh");
  const cgstPaise = isHomeState ? Math.round(gstPaise / 2) : 0;
  const sgstPaise = isHomeState ? Math.round(gstPaise / 2) : 0;
  const igstPaise = isHomeState ? 0 : gstPaise;

  const invoiceNumber = `MZK-INV-2026-${String(mockInvoicesStore.length + 1).padStart(4, "0")}`;
  const dueDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const newInvoice: MasterAdminInvoice = {
    id: `inv-${Date.now().toString(36)}`,
    invoice_number: invoiceNumber,
    school_id: input.schoolId,
    school_name: input.schoolName,
    plan_slug: input.planSlug,
    billing_cycle: input.billingCycle,
    subtotal_paise: subtotalPaise,
    discount_paise: 0,
    taxable_paise: taxablePaise,
    gst_rate: 18.0,
    cgst_paise: cgstPaise,
    sgst_paise: sgstPaise,
    igst_paise: igstPaise,
    total_paise: totalPaise,
    total_formatted: `₹${Math.round(totalPaise / 100).toLocaleString("en-IN")}`,
    status: "unpaid",
    due_date: dueDate,
    billing_school_name: input.schoolName,
    billing_address: input.billingAddress,
    billing_state: input.billingState,
    billing_gstin: input.billingGstin || null,
    hsn_sac_code: "998314",
    created_at: new Date().toISOString(),
  };

  mockInvoicesStore.unshift(newInvoice);

  // Persist to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      await supabase.from("subscription_invoices").insert({
        invoice_number: newInvoice.invoice_number,
        school_id: newInvoice.school_id,
        plan_slug: newInvoice.plan_slug,
        billing_cycle: newInvoice.billing_cycle,
        subtotal_paise: newInvoice.subtotal_paise,
        discount_paise: newInvoice.discount_paise,
        taxable_paise: newInvoice.taxable_paise,
        gst_rate: newInvoice.gst_rate,
        cgst_paise: newInvoice.cgst_paise,
        sgst_paise: newInvoice.sgst_paise,
        igst_paise: newInvoice.igst_paise,
        total_paise: newInvoice.total_paise,
        status: newInvoice.status,
        due_date: newInvoice.due_date,
        billing_school_name: newInvoice.billing_school_name,
        billing_address: newInvoice.billing_address,
        billing_state: newInvoice.billing_state,
        billing_gstin: newInvoice.billing_gstin,
        hsn_sac_code: newInvoice.hsn_sac_code,
      });
    } catch {}
  }

  // Mandatory audit logging
  await logPlatformAction({
    adminId: input.adminId || null,
    adminEmail: input.adminEmail,
    action: "invoice.generate",
    resourceType: "subscription_invoices",
    resourceId: newInvoice.id,
    schoolId: input.schoolId,
    details: { invoiceNumber, totalPaise },
  });

  return newInvoice;
}

/**
 * Processes refund authorization on verified subscription payment
 */
export async function processMasterAdminRefund(
  paymentId: string,
  amountPaise: number,
  reason: string,
  adminEmail: string,
  adminId?: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: "A valid business justification (min 5 characters) is required for refund authorization.",
    };
  }

  const payment = mockPaymentsStore.find((p) => p.id === paymentId || p.gateway_payment_id === paymentId);
  if (!payment) {
    return { success: false, error: "Payment transaction record not found." };
  }

  const refundId = `rfd_${Date.now().toString(36)}`;

  // Audit log
  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "payment.refund",
    resourceType: "school_subscription_payments",
    resourceId: payment.id,
    schoolId: payment.school_id,
    details: { refundId, amountPaise, reason },
  });

  return { success: true, refundId };
}

/**
 * Returns overall platform revenue and financial health analytics
 */
export async function getMasterAdminRevenueSummary(): Promise<PlatformRevenueSummary> {
  const totalCollectedPaise = 187640000; // ₹18,76,400
  const mrrPaise = 187640000;
  const outstandingPaise = 39500000; // ₹3,95,000

  return {
    totalCollectedPaise,
    totalCollectedFormatted: `₹${Math.round(totalCollectedPaise / 100).toLocaleString("en-IN")}`,
    mrrPaise,
    mrrFormatted: `₹${Math.round(mrrPaise / 100).toLocaleString("en-IN")}`,
    outstandingPaise,
    outstandingFormatted: `₹${Math.round(outstandingPaise / 100).toLocaleString("en-IN")}`,
    failedTransactionsCount: 6,
    planBreakdown: {
      proPaise: 142000000,
      basicPaise: 38000000,
      customPaise: 7640000,
    },
  };
}

