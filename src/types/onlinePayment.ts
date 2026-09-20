/**
 * Domain Types: Online Payments & Parent Pay Engine (Spec B5.10, B4.7)
 */

export type GatewayType = "razorpay" | "mock" | "payu" | "cashfree";

export type GatewayOrderStatus =
  | "created"
  | "authorised"
  | "captured"
  | "failed"
  | "expired";

export interface GatewayCreateOrderInput {
  schoolId: string;
  amountPaise: number;
  currency?: string;
  receiptRef: string;
  notes?: Record<string, string>;
}

export interface GatewayOrderResult {
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  status: GatewayOrderStatus;
  rawResponse?: unknown;
}

export interface GatewayVerifyWebhookInput {
  rawBody: string;
  signature: string;
  secret: string;
}

export interface GatewayWebhookVerificationResult {
  isValid: boolean;
  eventId?: string;
  eventType?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amountPaise?: number;
  status?: GatewayOrderStatus;
  error?: string;
  payload?: unknown;
}

export interface GatewayFetchStatusResult {
  gatewayOrderId: string;
  status: GatewayOrderStatus;
  amountPaise: number;
  gatewayPaymentId?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface SchoolGatewayCredentials {
  id: string;
  school_id: string;
  gateway: GatewayType;
  key_id: string;
  key_secret_enc: string;
  webhook_secret_enc: string;
  who_bears_charges: "school" | "parent";
  convenience_fee_percent: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentGatewayAdapter {
  gateway: GatewayType;
  createOrder(
    input: GatewayCreateOrderInput,
    credentials: SchoolGatewayCredentials
  ): Promise<GatewayOrderResult>;
  verifyWebhook(
    input: GatewayVerifyWebhookInput
  ): Promise<GatewayWebhookVerificationResult>;
  fetchOrderStatus(
    gatewayOrderId: string,
    credentials: SchoolGatewayCredentials
  ): Promise<GatewayFetchStatusResult>;
}

export interface OnlinePaymentOrder {
  id: string;
  school_id: string;
  parent_id?: string;
  student_ids: string[];
  due_ids: string[];
  amount_paise: number;
  convenience_fee_paise: number;
  currency: string;
  gateway: GatewayType;
  gateway_order_id: string;
  gateway_payment_id?: string;
  gateway_signature?: string;
  status: GatewayOrderStatus;
  payment_group_id?: string;
  receipt_ids: string[];
  advance_credit_ids: string[];
  payer_phone?: string;
  payer_email?: string;
  error_code?: string;
  error_description?: string;
  expires_at: string;
  captured_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ParentPayToken {
  id: string;
  school_id: string;
  parent_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface ParentPaySession {
  id: string;
  token_id: string;
  otp_code: string;
  attempts: number;
  max_attempts: number;
  otp_expires_at: string;
  verified: boolean;
  session_token?: string;
  session_expires_at?: string;
  created_at: string;
}

export interface ParentPayDueItem {
  due_id: string;
  fee_head_name: string;
  term_name?: string;
  due_date: string;
  balance_paise: number;
  is_overdue: boolean;
  is_current_term: boolean;
}

export interface ParentPayStudentCard {
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  section_name?: string;
  roll_no?: string;
  dues: ParentPayDueItem[];
  total_due_paise: number;
}

export interface ParentPayContext {
  school_id: string;
  school_name: string;
  subdomain: string;
  parent_id: string;
  parent_name: string;
  parent_phone: string;
  students: ParentPayStudentCard[];
  total_outstanding_paise: number;
  who_bears_charges: "school" | "parent";
  convenience_fee_percent: number;
}

export interface SettlementReportRow {
  order_id: string;
  gateway_order_id: string;
  gateway_payment_id: string;
  business_date: string;
  student_names: string;
  gross_amount_paise: number;
  gateway_fee_paise: number;
  gst_on_fee_paise: number;
  net_payout_paise: number;
  status: "settled" | "captured" | "mismatch";
}
