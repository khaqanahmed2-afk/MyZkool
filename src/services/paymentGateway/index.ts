/**
 * Payment Gateway Adapter Factory & Registry
 */

import type { PaymentGatewayAdapter, GatewayType } from "../../types/onlinePayment";
import { mockGateway } from "./mockAdapter";
import { razorpayGateway } from "./razorpayAdapter";

export function getPaymentGatewayAdapter(type: GatewayType = "razorpay"): PaymentGatewayAdapter {
  switch (type) {
    case "mock":
      return mockGateway;
    case "razorpay":
      return razorpayGateway;
    default:
      return razorpayGateway;
  }
}

export { mockGateway, razorpayGateway };
