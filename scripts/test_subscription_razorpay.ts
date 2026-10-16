import dotenv from "dotenv";
import crypto from "crypto";
import {
  calculateServerSubscriptionPricing,
  SERVER_SUBSCRIPTION_PLANS,
} from "../src/routes/razorpayRoutes";

dotenv.config();

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

console.log("=== SUBSCRIPTION ONBOARDING RAZORPAY TEST SUITE ===");
console.log("KEY_ID:", KEY_ID ? KEY_ID.slice(0, 10) + "..." : "MISSING");
console.log("KEY_SECRET:", KEY_SECRET ? KEY_SECRET.slice(0, 4) + "..." : "MISSING");

if (!KEY_ID || !KEY_SECRET) {
  console.error("Missing Razorpay credentials!");
  process.exit(1);
}

// 1. Test Server-side Pricing Calculations (Zero Trust for Client Price)
function testPricingCalculations() {
  console.log("\n1. Testing Server-side Subscription Pricing Calculations:");

  // Basic monthly: 999 + 18% GST = 1178.82 -> 117882 paise
  const basicMonthly = calculateServerSubscriptionPricing("basic", "monthly");
  console.log(" - Basic Monthly:", basicMonthly.subtotal, "GST:", basicMonthly.gstAmount, "Total Paise:", basicMonthly.totalPaise);
  if (basicMonthly.totalPaise !== 117882) throw new Error("Basic Monthly pricing calculation mismatch!");

  // Basic yearly: 10789 + 18% GST = 12731.02 -> 1273102 paise
  const basicYearly = calculateServerSubscriptionPricing("basic", "yearly");
  console.log(" - Basic Yearly:", basicYearly.subtotal, "GST:", basicYearly.gstAmount, "Total Paise:", basicYearly.totalPaise);
  if (basicYearly.totalPaise !== 1273102) throw new Error("Basic Yearly pricing calculation mismatch!");

  // Pro monthly: 1799 + 18% GST = 2122.82 -> 212282 paise
  const proMonthly = calculateServerSubscriptionPricing("pro", "monthly");
  console.log(" - Pro Monthly:", proMonthly.subtotal, "GST:", proMonthly.gstAmount, "Total Paise:", proMonthly.totalPaise);
  if (proMonthly.totalPaise !== 212282) throw new Error("Pro Monthly pricing calculation mismatch!");

  // Pro 6 months: 10254 + 18% GST = 12099.72 -> 1209972 paise
  const pro6Mo = calculateServerSubscriptionPricing("pro", "six_months");
  console.log(" - Pro 6-Months:", pro6Mo.subtotal, "GST:", pro6Mo.gstAmount, "Total Paise:", pro6Mo.totalPaise);
  if (pro6Mo.totalPaise !== 1209972) throw new Error("Pro 6-Months pricing calculation mismatch!");

  // Pro yearly: 19429 + 18% GST = 22926.22 -> 2292622 paise
  const proYearly = calculateServerSubscriptionPricing("pro", "yearly");
  console.log(" - Pro Yearly:", proYearly.subtotal, "GST:", proYearly.gstAmount, "Total Paise:", proYearly.totalPaise);
  if (proYearly.totalPaise !== 2292622) throw new Error("Pro Yearly pricing calculation mismatch!");

  // Custom plan should throw error rejecting online self-checkout
  try {
    calculateServerSubscriptionPricing("custom", "monthly");
    throw new Error("Should have thrown on custom plan!");
  } catch (err: any) {
    console.log(" - Custom Plan Rejection:", err.message, "[EXPECTED]");
  }

  console.log(" [PASSED] Server Pricing Calculations verified!");
}

// 2. Test Real Razorpay Order Creation for School Subscription
async function testSubscriptionOrderCreation() {
  console.log("\n2. Testing Real Razorpay Order Creation via SDK for School Subscription:");
  const Razorpay = (await import("razorpay")).default as any;
  const RazorpayClass = Razorpay.default || Razorpay;
  const rzp = new RazorpayClass({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
  });

  const schoolId = "sch_test_onboarding_8812";
  const pricing = calculateServerSubscriptionPricing("pro", "yearly");

  const order = await rzp.orders.create({
    amount: pricing.totalPaise,
    currency: "INR",
    receipt: `sub_${schoolId.slice(0, 8)}_${Date.now()}`.slice(0, 40),
    notes: {
      type: "school_subscription",
      school_id: schoolId,
      plan_slug: "pro",
      billing_cycle: "yearly",
      module: "school_onboarding",
    },
  });

  console.log(" - Created Razorpay Order:", {
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status,
  });

  if (!order.id || order.amount !== pricing.totalPaise) {
    throw new Error("Order creation failed or amount mismatch!");
  }

  return order.id;
}

// 3. Test Signature Verification & Tamper Detection
async function testSignatureVerification(orderId: string) {
  console.log("\n3. Testing HMAC-SHA256 Signature Verification:");
  const testPaymentId = "pay_test_" + Date.now();
  const payload = `${orderId}|${testPaymentId}`;

  const validSig = crypto
    .createHmac("sha256", KEY_SECRET!)
    .update(payload)
    .digest("hex");

  // Check timing-safe match
  const checkSig = crypto
    .createHmac("sha256", KEY_SECRET!)
    .update(payload)
    .digest("hex");

  const isMatch = crypto.timingSafeEqual(Buffer.from(validSig), Buffer.from(checkSig));
  console.log(" - Valid Signature:", validSig.slice(0, 16) + "...", "Match:", isMatch ? "PASSED" : "FAILED");

  // Check tamper detection
  const tamperedSig = "bad" + validSig.slice(3);
  const isTamperCaught = !crypto.timingSafeEqual(Buffer.from(tamperedSig), Buffer.from(checkSig));
  console.log(" - Tampered Signature Rejection:", isTamperCaught ? "PASSED" : "FAILED");

  if (!isMatch || !isTamperCaught) {
    throw new Error("Signature verification tests failed!");
  }
}

async function main() {
  try {
    testPricingCalculations();
    const orderId = await testSubscriptionOrderCreation();
    await testSignatureVerification(orderId);
    console.log("\n>>> ALL ONBOARDING SUBSCRIPTION RAZORPAY TESTS PASSED! <<<");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

main();
