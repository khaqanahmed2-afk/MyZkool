/**
 * Mock Payment Gateway Adapter for Tests and Offline Development
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

interface MockOrderRecord {
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  status: GatewayOrderStatus;
  receiptRef: string;
  paymentId?: string;
}

const mockOrders = new Map<string, MockOrderRecord>();

export class MockPaymentGateway implements PaymentGatewayAdapter {
  public readonly gateway = "mock" as const;

  async createOrder(
    input: GatewayCreateOrderInput,
    _credentials: SchoolGatewayCredentials
  ): Promise<GatewayOrderResult> {
    const gatewayOrderId = `order_mock_${crypto.randomUUID().slice(0, 12)}`;
    const record: MockOrderRecord = {
      gatewayOrderId,
      amountPaise: input.amountPaise,
      currency: input.currency || "INR",
      status: "created",
      receiptRef: input.receiptRef,
    };
    mockOrders.set(gatewayOrderId, record);

    return {
      gatewayOrderId,
      amountPaise: record.amountPaise,
      currency: record.currency,
      status: record.status,
      rawResponse: record,
    };
  }

  async verifyWebhook(
    input: GatewayVerifyWebhookInput
  ): Promise<GatewayWebhookVerificationResult> {
    try {
      const parsed = JSON.parse(input.rawBody);
      const expectedSignature = `sig_mock_${parsed.event_id || "event"}_${input.secret}`;

      if (input.signature !== expectedSignature) {
        return {
          isValid: false,
          error: "Invalid mock webhook signature.",
        };
      }

      const orderId = parsed.payload?.payment?.entity?.order_id || parsed.order_id;
      const paymentId = parsed.payload?.payment?.entity?.id || parsed.payment_id || `pay_mock_${crypto.randomUUID().slice(0, 8)}`;
      const amountPaise = parsed.payload?.payment?.entity?.amount || parsed.amount_paise || 0;
      const status: GatewayOrderStatus = parsed.status === "failed" ? "failed" : "captured";

      if (orderId && mockOrders.has(orderId)) {
        const order = mockOrders.get(orderId)!;
        order.status = status;
        order.paymentId = paymentId;
      }

      return {
        isValid: true,
        eventId: parsed.event_id || `evt_mock_${crypto.randomUUID().slice(0, 8)}`,
        eventType: parsed.event || "payment.captured",
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        amountPaise,
        status,
        payload: parsed,
      };
    } catch {
      return {
        isValid: false,
        error: "Malformed mock webhook body.",
      };
    }
  }

  async fetchOrderStatus(
    gatewayOrderId: string,
    _credentials: SchoolGatewayCredentials
  ): Promise<GatewayFetchStatusResult> {
    const order = mockOrders.get(gatewayOrderId);
    if (!order) {
      return {
        gatewayOrderId,
        status: "failed",
        amountPaise: 0,
        error: "Order not found in mock store.",
      };
    }

    return {
      gatewayOrderId: order.gatewayOrderId,
      status: order.status,
      amountPaise: order.amountPaise,
      gatewayPaymentId: order.paymentId,
      rawResponse: order,
    };
  }

  // Test helpers to inspect and mutate mock orders
  public static setOrderStatus(gatewayOrderId: string, status: GatewayOrderStatus, paymentId?: string) {
    const o = mockOrders.get(gatewayOrderId);
    if (o) {
      o.status = status;
      if (paymentId) o.paymentId = paymentId;
    }
  }

  public static clearMockOrders() {
    mockOrders.clear();
  }
}

export const mockGateway = new MockPaymentGateway();
