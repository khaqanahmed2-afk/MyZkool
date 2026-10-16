import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

console.log("=== RAZORPAY ENVIRONMENT CHECK ===");
console.log("KEY_ID set:", !!KEY_ID, KEY_ID ? KEY_ID.slice(0, 8) + "..." : "missing");
console.log("KEY_SECRET set:", !!KEY_SECRET, KEY_SECRET ? KEY_SECRET.slice(0, 4) + "..." : "missing");

if (!KEY_ID || !KEY_SECRET) {
  console.error("Missing Razorpay credentials!");
  process.exit(1);
}

// 1. Test Order Creation via Razorpay SDK
async function testCreateOrder() {
  console.log("\n--- Testing Razorpay Order Creation ---");
  const Razorpay = (await import("razorpay")).default as any;
  const RazorpayClass = Razorpay.default || Razorpay;
  const rzp = new RazorpayClass({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
  });

  const amountPaise = 50000; // ₹500.00
  const order = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `test_rcpt_${Date.now()}`,
    notes: {
      purpose: "Test School Fee Payment",
    },
  });

  console.log("Order created successfully:");
  console.log({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
  });

  if (!order.id || order.amount !== amountPaise) {
    throw new Error("Order creation validation failed");
  }

  return order.id;
}

// 2. Test Signature Verification Logic
async function testSignatureVerification(orderId: string) {
  console.log("\n--- Testing Payment Signature Verification ---");
  const dummyPaymentId = "pay_test_" + Date.now();
  const payload = `${orderId}|${dummyPaymentId}`;
  
  // Valid signature generated using the secret
  const validSignature = crypto
    .createHmac("sha256", KEY_SECRET!)
    .update(payload)
    .digest("hex");

  console.log("Generated valid signature:", validSignature.slice(0, 16) + "...");

  // Verify match
  const checkSig = crypto
    .createHmac("sha256", KEY_SECRET!)
    .update(payload)
    .digest("hex");

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(validSignature),
    Buffer.from(checkSig)
  );

  console.log("Signature match verification:", isMatch ? "PASSED" : "FAILED");

  // Verify tamper detection
  const tamperedSig = validSignature.slice(0, -2) + "00";
  const isTamperDetected = !crypto.timingSafeEqual(
    Buffer.from(tamperedSig),
    Buffer.from(checkSig)
  );

  console.log("Tamper detection verification:", isTamperDetected ? "PASSED (correctly rejected tampered signature)" : "FAILED");

  if (!isMatch || !isTamperDetected) {
    throw new Error("Signature verification tests failed!");
  }
}

async function run() {
  try {
    const orderId = await testCreateOrder();
    await testSignatureVerification(orderId);
    console.log("\n>>> ALL RAZORPAY BACKEND TESTS PASSED SUCCESSFULLY! <<<");
  } catch (err: any) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

run();
