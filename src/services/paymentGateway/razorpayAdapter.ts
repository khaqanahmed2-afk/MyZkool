/**
 * Razorpay Payment Gateway Adapter (Default Real Adapter)
 */

import type {
  PaymentGatewayAdapter,
  GatewayCreateOrderInput,
  GatewayOrderResult,
  GatewayVerifyWebhookInput,
  GatewayWebhookVerificationResult,
  GatewayFetchStatusResult,
  SchoolGatewayCredentials,
  GatewayOrderStatus,
} from "../../types/onlinePayment";

export async function computeHmacSha256(secret: string, message: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle !== "undefined") {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node.js fallback
  try {
    const nodeCrypto = await import("crypto");
    return nodeCrypto.createHmac("sha256", secret).update(message).digest("hex");
  } catch {
    throw new Error("Cryptographic runtime unavailable for HMAC.");
  }
}

export class RazorpayGateway implements PaymentGatewayAdapter {
  public readonly gateway = "razorpay" as const;

  async createOrder(
    input: GatewayCreateOrderInput,
    credentials: SchoolGatewayCredentials
  ): Promise<GatewayOrderResult> {
    const endpoint = "https://api.razorpay.com/v1/orders";
    const authHeader = `Basic ${btoa(`${credentials.key_id}:${credentials.key_secret_enc}`)}`;

    const payload = {
      amount: input.amountPaise,
      currency: input.currency || "INR",
      receipt: input.receiptRef,
      notes: input.notes || {},
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Razorpay createOrder failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      return {
        gatewayOrderId: data.id,
        amountPaise: data.amount,
        currency: data.currency,
        status: (data.status as GatewayOrderStatus) || "created",
        rawResponse: data,
      };
    } catch (err: unknown) {
      // Offline / unmocked fallback for dev tests
      const msg = err instanceof Error ? err.message : "Razorpay order creation failed";
      throw new Error(msg);
    }
  }

  async verifyWebhook(
    input: GatewayVerifyWebhookInput
  ): Promise<GatewayWebhookVerificationResult> {
    try {
      const computed = await computeHmacSha256(input.secret, input.rawBody);
      if (computed !== input.signature) {
        return {
          isValid: false,
          error: "Signature mismatch: verification failed.",
        };
      }

      const parsed = JSON.parse(input.rawBody);
      const eventType = parsed.event;
      const paymentEntity = parsed.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount || 0;

      let status: GatewayOrderStatus = "captured";
      if (eventType === "payment.failed") status = "failed";
      else if (eventType === "payment.authorized") status = "authorised";
      else if (eventType === "order.paid" || eventType === "payment.captured") status = "captured";

      return {
        isValid: true,
        eventId: parsed.event_id || parsed.id || paymentId,
        eventType,
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        amountPaise,
        status,
        payload: parsed,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid webhook payload";
      return {
        isValid: false,
        error: msg,
      };
    }
  }

  async fetchOrderStatus(
    gatewayOrderId: string,
    credentials: SchoolGatewayCredentials
  ): Promise<GatewayFetchStatusResult> {
    const endpoint = `https://api.razorpay.com/v1/orders/${gatewayOrderId}`;
    const authHeader = `Basic ${btoa(`${credentials.key_id}:${credentials.key_secret_enc}`)}`;

    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: authHeader },
      });

      if (!res.ok) {
        return {
          gatewayOrderId,
          status: "failed",
          amountPaise: 0,
          error: `Razorpay fetch status failed with ${res.status}`,
        };
      }

      const data = await res.json();
      let status: GatewayOrderStatus = "created";
      if (data.status === "paid") status = "captured";
      else if (data.status === "attempted") status = "authorised";

      return {
        gatewayOrderId: data.id,
        status,
        amountPaise: data.amount,
        rawResponse: data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch status from Razorpay";
      return {
        gatewayOrderId,
        status: "failed",
        amountPaise: 0,
        error: msg,
      };
    }
  }
}

export const razorpayGateway = new RazorpayGateway();

