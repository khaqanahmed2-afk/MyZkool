/**
 * Razorpay Standard Web Checkout Service (Frontend)
 *
 * Implements the official 3-step checkout workflow:
 * 1. Calls backend /api/create-order to create order_id (with amount in paise >= 100)
 * 2. Opens official Razorpay Standard Web Checkout Modal
 * 3. On success, sends { razorpay_order_id, razorpay_payment_id, razorpay_signature } to backend /api/verify-payment
 */

export interface CreateOrderRequest {
  amount: number; // in paise (e.g. 10000 = ₹100.00)
  currency?: string; // defaults to "INR"
  receipt?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  id?: string;
  receipt?: string;
  status?: string;
  error?: string;
  details?: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  order_id?: string;
  payment_id?: string;
  error?: string;
  details?: string;
}

export interface RazorpayCheckoutOptions {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  name?: string;
  description?: string;
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  onSuccess?: (verifyResult: VerifyPaymentResponse, paymentData: VerifyPaymentRequest) => void;
  onError?: (errorMessage: string, rawError?: any) => void;
  onDismiss?: () => void;
}

// Global Razorpay declaration for window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Ensures Razorpay Checkout script (https://checkout.razorpay.com/v1/checkout.js) is loaded.
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Step 1: Call Backend to Create Order
 */
export async function createOrder(
  data: CreateOrderRequest
): Promise<CreateOrderResponse> {
  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || body.details || `Order creation failed (${res.status})`);
  }

  return body;
}

/**
 * Step 3: Call Backend to Verify Payment Signature
 */
export async function verifyPayment(
  data: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  const res = await fetch("/api/verify-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || body.details || `Payment verification failed (${res.status})`);
  }

  return body;
}

/**
 * Step 2: Open Razorpay Checkout Modal
 * Coordinates Step 1 (create order), modal display, and Step 3 (verify signature)
 */
export async function initiateRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<void> {
  const isScriptLoaded = await loadRazorpayCheckoutScript();
  if (!isScriptLoaded || !window.Razorpay) {
    const errorMsg = "Unable to load Razorpay Checkout SDK. Please check your internet connection.";
    options.onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  // Frontend environment variable for public key ID (never key_secret!)
  const keyId =
    import.meta.env.VITE_RAZORPAY_KEY_ID ||
    "rzp_test_ToShb8lw8bsnC2";

  if (!keyId) {
    const errorMsg = "VITE_RAZORPAY_KEY_ID is not configured in frontend environment.";
    options.onError?.(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Create order on backend
  let orderData: CreateOrderResponse;
  try {
    orderData = await createOrder({
      amount: options.amount,
      currency: options.currency || "INR",
      receipt: options.receipt,
      notes: options.notes,
    });
  } catch (err: any) {
    const msg = err.message || "Failed to create order on server.";
    options.onError?.(msg, err);
    return;
  }

  // 2. Open Razorpay modal
  const rzpConfig = {
    key: keyId,
    amount: orderData.amount,
    currency: orderData.currency || "INR",
    name: options.name || "MyZkool School ERP",
    description: options.description || "Fee Payment",
    order_id: orderData.order_id,
    prefill: options.prefill || {},
    notes: options.notes || {},
    theme: {
      color: options.themeColor || "#2158E0",
    },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      try {
        // 3. Verify signature on backend
        const verificationResult = await verifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });

        if (verificationResult.success) {
          options.onSuccess?.(verificationResult, response);
        } else {
          options.onError?.(
            verificationResult.error || "Payment signature verification failed.",
            verificationResult
          );
        }
      } catch (verifyErr: any) {
        options.onError?.(
          verifyErr.message || "Failed to verify payment with server.",
          verifyErr
        );
      }
    },
    modal: {
      ondismiss: () => {
        options.onDismiss?.();
      },
      escape: true,
      backdropclose: false,
    },
  };

  const razorpayInstance = new window.Razorpay(rzpConfig);

  // Listen to payment.failed event
  razorpayInstance.on("payment.failed", (response: any) => {
    const reason =
      response?.error?.description ||
      response?.error?.reason ||
      "Payment failed. Please try a different card, UPI or bank.";
    options.onError?.(reason, response?.error);
  });

  razorpayInstance.open();
}

export interface SubscriptionCheckoutOptions {
  schoolId: string;
  schoolName: string;
  planSlug: string;
  planName: string;
  billingCycle: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  onSuccess: (verifyResult: VerifyPaymentResponse, paymentData: VerifyPaymentRequest) => void;
  onError: (errorMessage: string, rawError?: any) => void;
  onDismiss?: () => void;
}

/**
 * Dedicated helper for School Onboarding Subscription Payment via Razorpay Standard Checkout
 */
export async function initiateSubscriptionCheckout(
  options: SubscriptionCheckoutOptions
): Promise<void> {
  const isScriptLoaded = await loadRazorpayCheckoutScript();
  if (!isScriptLoaded || !window.Razorpay) {
    const errorMsg = "Unable to load Razorpay Checkout SDK. Please check your internet connection.";
    options.onError(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Create order on server using trusted server-side pricing
  let orderData: any;
  try {
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        school_id: options.schoolId,
        plan_slug: options.planSlug,
        billing_cycle: options.billingCycle,
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || body.details || `Order creation failed (${res.status})`);
    }
    orderData = body;
  } catch (err: any) {
    options.onError(err.message || "Failed to initialize subscription order on server.", err);
    return;
  }

  const keyId =
    orderData.key_id ||
    import.meta.env.VITE_RAZORPAY_KEY_ID ||
    "rzp_test_ToShb8lw8bsnC2";

  // 2. Open official Razorpay modal
  const rzpConfig = {
    key: keyId,
    amount: orderData.amount,
    currency: orderData.currency || "INR",
    name: "MyZkool School ERP",
    description: `${options.planName} Plan (${options.billingCycle}) - ${options.schoolName}`,
    order_id: orderData.order_id,
    prefill: {
      email: options.userEmail || "",
      contact: options.userPhone || "",
      name: options.userName || "",
    },
    notes: {
      school_id: options.schoolId,
      plan_slug: options.planSlug,
      billing_cycle: options.billingCycle,
    },
    theme: {
      color: "#2158E0",
    },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      try {
        // 3. Verify signature and activate subscription on backend
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            school_id: options.schoolId,
            plan_slug: options.planSlug,
            billing_cycle: options.billingCycle,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          options.onError(
            verifyData.error || "Payment signature verification failed.",
            verifyData
          );
          return;
        }

        options.onSuccess(verifyData, response);
      } catch (verifyErr: any) {
        options.onError(
          verifyErr.message || "Failed to verify subscription payment with server.",
          verifyErr
        );
      }
    },
    modal: {
      ondismiss: () => {
        options.onDismiss?.();
      },
      escape: true,
      backdropclose: false,
    },
  };

  const razorpayInstance = new window.Razorpay(rzpConfig);

  razorpayInstance.on("payment.failed", (response: any) => {
    const reason =
      response?.error?.description ||
      response?.error?.reason ||
      "Subscription payment failed. Please try a different card, UPI or NetBanking.";
    options.onError(reason, response?.error);
  });

  razorpayInstance.open();
}

