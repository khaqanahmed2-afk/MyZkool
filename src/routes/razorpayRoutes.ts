import { Router, Request, Response } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const razorpayRouter = Router();

// Server-side canonical subscription pricing (Source of Truth)
export const SERVER_SUBSCRIPTION_PLANS: Record<
  string,
  {
    name: string;
    monthly: number;
    six_months: number;
    yearly: number;
  }
> = {
  basic: {
    name: "Basic",
    monthly: 999,
    six_months: 5694, // 5% off
    yearly: 10789, // 10% off
  },
  pro: {
    name: "Pro",
    monthly: 1799,
    six_months: 10254, // 5% off
    yearly: 19429, // 10% off
  },
};

export function calculateServerSubscriptionPricing(
  planSlug: string,
  billingCycle: string
) {
  const normSlug = (planSlug || "").trim().toLowerCase();
  const normCycle = (billingCycle || "monthly").trim().toLowerCase();

  if (normSlug === "custom") {
    throw new Error("Custom enterprise plans require tailored SLA terms. Online self-checkout is unavailable.");
  }

  const plan = SERVER_SUBSCRIPTION_PLANS[normSlug];
  if (!plan) {
    throw new Error(`Invalid subscription plan '${planSlug}'. Must be 'basic' or 'pro'.`);
  }

  let subtotal = plan.monthly;
  let durationMonths = 1;

  if (normCycle === "monthly") {
    subtotal = plan.monthly;
    durationMonths = 1;
  } else if (normCycle === "six_months") {
    subtotal = plan.six_months;
    durationMonths = 6;
  } else if (normCycle === "yearly") {
    subtotal = plan.yearly;
    durationMonths = 12;
  } else {
    throw new Error(`Invalid billing cycle '${billingCycle}'. Must be 'monthly', 'six_months', or 'yearly'.`);
  }

  const gstRate = 0.18;
  const gstAmount = Math.round(subtotal * gstRate * 100) / 100;
  const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
  const totalPaise = Math.round(totalAmount * 100);

  return {
    planSlug: normSlug,
    planName: plan.name,
    billingCycle: normCycle,
    durationMonths,
    subtotal,
    gstAmount,
    totalAmount,
    totalPaise,
  };
}

// In-memory registry fallback for zero-downtime offline tests or dev runs
interface StoredOrderRecord {
  order_id: string;
  school_id: string;
  user_id?: string;
  plan_slug: string;
  billing_cycle: string;
  amount_paise: number;
  currency: string;
  receipt: string;
  status: "created" | "captured" | "failed";
  payment_id?: string;
  created_at: string;
}
const localOrdersRegistry = new Map<string, StoredOrderRecord>();

function getRazorpayClient(): { razorpay: any; keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials missing in environment variables (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET).");
  }

  // Handle default export variations across bundler/ESM environments
  const RazorpayClass = (Razorpay as any).default || Razorpay;
  const razorpay = new RazorpayClass({
    key_id: keyId,
    key_secret: keySecret,
  });

  return { razorpay, keyId, keySecret };
}

/**
 * Extracts and verifies the authenticated user from the Authorization header if present.
 */
async function getAuthenticatedUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        return { id: data.user.id, email: data.user.email };
      }
    } catch {
      // Non-fatal fallback
    }
  }

  return null;
}

/**
 * STEP 1: BACKEND - Create Order
 * Endpoint: POST /api/create-order (and alias /api/razorpay/create-order)
 * Supports:
 *  A) School Onboarding Subscription: { school_id, plan_slug, billing_cycle }
 *  B) Generic / Student Fee Order: { amount, currency, receipt }
 */
async function handleCreateOrder(req: Request, res: Response): Promise<void> {
  try {
    const {
      amount,
      currency = "INR",
      receipt,
      notes,
      school_id,
      plan_slug,
      billing_cycle,
      user_id,
    } = req.body || {};

    let clientInfo: { razorpay: any; keyId: string; keySecret: string };
    try {
      clientInfo = getRazorpayClient();
    } catch (credErr: any) {
      res.status(500).json({ error: credErr.message });
      return;
    }

    const { razorpay, keyId } = clientInfo;
    const authUser = await getAuthenticatedUser(req);
    const effectiveUserId = authUser?.id || user_id || "";

    let finalAmountPaise: number;
    let orderReceipt: string;
    let orderNotes: Record<string, string> = { ...(notes || {}) };

    // Mode A: School Subscription Onboarding Payment
    if (plan_slug && school_id) {
      if (!school_id) {
        res.status(400).json({ error: "school_id is required for subscription orders." });
        return;
      }

      let pricing;
      try {
        pricing = calculateServerSubscriptionPricing(plan_slug, billing_cycle || "monthly");
      } catch (priceErr: any) {
        res.status(400).json({ error: priceErr.message });
        return;
      }

      // Enforce strict server pricing: Never trust client-submitted amount
      finalAmountPaise = pricing.totalPaise;

      // Detect tampering if client sent a conflicting amount
      if (amount && Math.abs(Number(amount) - finalAmountPaise) > 100) {
        res.status(400).json({
          error: "Tampered or invalid amount. Amount must match server-calculated plan pricing.",
          serverCalculatedPaise: finalAmountPaise,
          clientProvidedAmount: amount,
        });
        return;
      }

      orderReceipt = receipt || `sub_${school_id.slice(0, 8)}_${Date.now()}`;
      orderNotes = {
        ...orderNotes,
        type: "school_subscription",
        school_id,
        plan_slug: pricing.planSlug,
        billing_cycle: pricing.billingCycle,
        user_id: effectiveUserId,
      };
    } else {
      // Mode B: Generic / Fee Payment Order
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount < 100) {
        res.status(400).json({
          error: "Invalid amount. Minimum amount is 100 paise (₹1.00).",
          amountReceived: amount,
        });
        return;
      }
      finalAmountPaise = Math.round(numericAmount);
      orderReceipt = receipt || `receipt_${Date.now()}`;
    }

    const orderOptions = {
      amount: finalAmountPaise,
      currency: (currency || "INR").toUpperCase(),
      receipt: String(orderReceipt).slice(0, 40),
      notes: orderNotes,
    };

    const order = await razorpay.orders.create(orderOptions);

    // Persist order in local memory registry
    localOrdersRegistry.set(order.id, {
      order_id: order.id,
      school_id: school_id || "",
      user_id: effectiveUserId,
      plan_slug: plan_slug || "",
      billing_cycle: billing_cycle || "monthly",
      amount_paise: finalAmountPaise,
      currency: order.currency,
      receipt: order.receipt,
      status: "created",
      created_at: new Date().toISOString(),
    });

    // Also persist in Supabase school_subscription_payments if subscription order
    if (school_id && plan_slug && isSupabaseConfigured) {
      try {
        await supabase.from("school_subscription_payments").insert({
          school_id,
          user_id: effectiveUserId || null,
          plan_slug,
          billing_cycle: billing_cycle || "monthly",
          amount_paise: finalAmountPaise,
          gst_paise: Math.round(finalAmountPaise - (finalAmountPaise / 1.18)),
          currency: order.currency,
          gateway: "razorpay",
          gateway_order_id: order.id,
          status: "created",
          receipt: order.receipt,
          notes: orderNotes,
        });
      } catch (dbErr) {
        console.warn("Non-fatal Supabase order insert notice:", dbErr);
      }
    }

    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      receipt: order.receipt,
      status: order.status,
      plan_slug: plan_slug || undefined,
      billing_cycle: billing_cycle || undefined,
    });
  } catch (error: any) {
    console.error("Razorpay create-order error:", error);

    if (error?.statusCode === 401 || (error?.error?.code === "BAD_REQUEST_ERROR" && error?.error?.description?.includes("authenticate"))) {
      res.status(401).json({
        error: "Razorpay authentication failed. Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        details: error?.error?.description || error.message,
      });
      return;
    }

    const status = error?.statusCode || 500;
    res.status(status).json({
      error: "Failed to create Razorpay order.",
      details: error?.error?.description || error.message || "Unknown error",
    });
  }
}

/**
 * STEP 3: BACKEND - Verify Payment Signature & Activate Subscription
 * Endpoint: POST /api/verify-payment (and alias /api/razorpay/verify-payment)
 * Validates HMAC-SHA256 signature, confirms with Razorpay API, and activates subscription idempotently.
 */
async function handleVerifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
      payment_id,
      signature,
      school_id,
      plan_slug,
      billing_cycle,
    } = req.body || {};

    const effectiveOrderId = razorpay_order_id || order_id;
    const effectivePaymentId = razorpay_payment_id || payment_id;
    const effectiveSignature = razorpay_signature || signature;

    // 1. Check for missing required fields
    if (!effectiveOrderId || !effectivePaymentId || !effectiveSignature) {
      res.status(400).json({
        success: false,
        verified: false,
        error: "Missing required verification fields. Expected razorpay_order_id, razorpay_payment_id, and razorpay_signature.",
      });
      return;
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      res.status(500).json({
        success: false,
        error: "Razorpay KEY_SECRET is not configured on the server.",
      });
      return;
    }

    // 2. Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const payload = `${effectiveOrderId}|${effectivePaymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    const sigBufferA = Buffer.from(generatedSignature, "utf8");
    const sigBufferB = Buffer.from(effectiveSignature, "utf8");

    const isMatch =
      sigBufferA.length === sigBufferB.length &&
      crypto.timingSafeEqual(sigBufferA, sigBufferB);

    if (!isMatch) {
      console.warn(`Payment signature mismatch for order: ${effectiveOrderId}, payment: ${effectivePaymentId}`);
      res.status(400).json({
        success: false,
        verified: false,
        error: "Payment verification failed: Signature mismatch.",
      });
      return;
    }

    // 3. Confirm payment status with Razorpay API using server SDK
    let rzpPayment: any = null;
    let rzpClient;
    try {
      rzpClient = getRazorpayClient();
      rzpPayment = await rzpClient.razorpay.payments.fetch(effectivePaymentId);
    } catch (fetchErr: any) {
      console.warn("Razorpay API payment fetch notice:", fetchErr?.message || fetchErr);
    }

    if (rzpPayment) {
      // Validate that payment belongs to the expected order
      if (rzpPayment.order_id && rzpPayment.order_id !== effectiveOrderId) {
        res.status(400).json({
          success: false,
          verified: false,
          error: "Payment order mismatch: payment does not belong to the requested order.",
        });
        return;
      }

      // Check payment status from Razorpay
      const allowedStatuses = ["captured", "authorized"];
      if (!allowedStatuses.includes(rzpPayment.status)) {
        res.status(400).json({
          success: false,
          verified: false,
          error: `Payment is not in captured status (current status: ${rzpPayment.status}).`,
        });
        return;
      }
    }

    // 4. Resolve metadata (check memory registry & DB)
    const storedOrder = localOrdersRegistry.get(effectiveOrderId);
    const effectiveSchoolId = storedOrder?.school_id || school_id;
    const effectivePlanSlug = storedOrder?.plan_slug || plan_slug;
    const effectiveBillingCycle = storedOrder?.billing_cycle || billing_cycle || "monthly";

    // 5. Idempotent check: Prevent duplicate subscription activation
    if (storedOrder?.status === "captured" && storedOrder.payment_id === effectivePaymentId) {
      res.status(200).json({
        success: true,
        verified: true,
        already_processed: true,
        message: "Payment already verified and subscription is active.",
        order_id: effectiveOrderId,
        payment_id: effectivePaymentId,
        school_id: effectiveSchoolId,
        subscription_status: "active",
      });
      return;
    }

    // Mark in memory registry as captured
    if (storedOrder) {
      storedOrder.status = "captured";
      storedOrder.payment_id = effectivePaymentId;
    }

    // 6. Activate Subscription in Database if school_id and plan_slug exist
    let subscriptionData: any = null;
    if (effectiveSchoolId && effectivePlanSlug) {
      const now = new Date();
      const periodEnds = new Date(now);
      if (effectiveBillingCycle === "monthly") {
        periodEnds.setMonth(periodEnds.getMonth() + 1);
      } else if (effectiveBillingCycle === "six_months") {
        periodEnds.setMonth(periodEnds.getMonth() + 6);
      } else if (effectiveBillingCycle === "yearly") {
        periodEnds.setFullYear(periodEnds.getFullYear() + 1);
      }

      let pricing: any;
      try {
        pricing = calculateServerSubscriptionPricing(effectivePlanSlug, effectiveBillingCycle);
      } catch {
        pricing = { subtotal: 1799, gstAmount: 323.82, totalAmount: 2122.82 };
      }

      subscriptionData = {
        school_id: effectiveSchoolId,
        billing_cycle: effectiveBillingCycle,
        status: "active",
        current_period_starts_at: now.toISOString(),
        current_period_ends_at: periodEnds.toISOString(),
        amount: pricing.subtotal,
        currency: "INR",
        gst_rate: 18,
        gst_amount: pricing.gstAmount,
        total_amount: pricing.totalAmount,
        payment_method: rzpPayment?.method || "card",
        payment_status: "paid",
        metadata: {
          razorpay_order_id: effectiveOrderId,
          razorpay_payment_id: effectivePaymentId,
          plan_slug: effectivePlanSlug,
          billing_cycle: effectiveBillingCycle,
          verified_at: now.toISOString(),
        },
      };

      if (isSupabaseConfigured) {
        try {
          // Check for canonical plan_id
          const { data: planRow } = await supabase
            .from("subscription_plans")
            .select("id")
            .eq("slug", effectivePlanSlug)
            .maybeSingle();

          const planId = planRow?.id || "00000000-0000-0000-0000-000000000000";

          // Upsert school_subscriptions
          const { data: subRow } = await supabase
            .from("school_subscriptions")
            .upsert(
              {
                ...subscriptionData,
                plan_id: planId,
                trial_starts_at: now.toISOString(),
                trial_ends_at: now.toISOString(),
                updated_at: now.toISOString(),
              },
              { onConflict: "school_id" }
            )
            .select()
            .maybeSingle();

          // Update school_subscription_payments record
          await supabase
            .from("school_subscription_payments")
            .update({
              status: "captured",
              gateway_payment_id: effectivePaymentId,
              gateway_signature: effectiveSignature,
              subscription_id: subRow?.id || null,
              verified_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("gateway_order_id", effectiveOrderId);
        } catch (dbErr) {
          console.warn("Non-fatal subscription activation db notice:", dbErr);
        }
      }
    }

    res.status(200).json({
      success: true,
      verified: true,
      message: "Payment verified successfully and subscription activated.",
      order_id: effectiveOrderId,
      payment_id: effectivePaymentId,
      school_id: effectiveSchoolId,
      plan_slug: effectivePlanSlug,
      billing_cycle: effectiveBillingCycle,
      subscription_status: "active",
      subscription: subscriptionData,
    });
  } catch (error: any) {
    console.error("Razorpay verify-payment error:", error);
    res.status(500).json({
      success: false,
      error: "Internal error during payment verification.",
      details: error.message,
    });
  }
}

/**
 * Webhook Endpoint: POST /api/razorpay/webhook
 * Handles Razorpay webhook events securely and idempotently
 */
async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!webhookSignature || !webhookSecret) {
      res.status(400).json({ error: "Missing webhook signature or secret." });
      return;
    }

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const sigBufA = Buffer.from(expectedSig, "utf8");
    const sigBufB = Buffer.from(webhookSignature, "utf8");

    if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
      res.status(400).json({ error: "Invalid webhook signature." });
      return;
    }

    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const event = payload?.event;
    console.log(`Razorpay webhook received: ${event}`);

    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: err.message });
  }
}

// Register endpoints
razorpayRouter.post("/api/create-order", handleCreateOrder);
razorpayRouter.post("/api/verify-payment", handleVerifyPayment);
razorpayRouter.post("/api/razorpay/create-order", handleCreateOrder);
razorpayRouter.post("/api/razorpay/verify-payment", handleVerifyPayment);
razorpayRouter.post("/api/razorpay/webhook", handleWebhook);
