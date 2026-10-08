/**
 * SMS Adapters for OTP Delivery
 * Source of Truth: docs/SPEC.md Section 4.3 & 4.9
 */

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsAdapter {
  sendOtp(mobile: string, code: string, purpose: string): Promise<SmsResult>;
}

export class ConsoleSmsAdapter implements SmsAdapter {
  async sendOtp(mobile: string, code: string, purpose: string): Promise<SmsResult> {
    const timestamp = new Date().toISOString();
    console.log(`\n============================================================`);
    console.log(`[SMS CONSOLE ADAPTER] Mode: console | Time: ${timestamp}`);
    console.log(`  Recipient: +91 ${mobile}`);
    console.log(`  Purpose:   ${purpose}`);
    console.log(`  OTP Code:  ${code} (Valid for 5 minutes)`);
    console.log(`============================================================\n`);
    return {
      success: true,
      messageId: `console-${Date.now()}-${mobile}`,
    };
  }
}

export class Fast2SmsAdapter implements SmsAdapter {
  private apiKey: string;
  private senderId?: string;

  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY || '';
    this.senderId = process.env.FAST2SMS_SENDER_ID;
  }

  async sendOtp(mobile: string, code: string, purpose: string): Promise<SmsResult> {
    if (!this.apiKey) {
      console.warn('[Fast2SMS] Missing FAST2SMS_API_KEY, falling back to console');
      return new ConsoleSmsAdapter().sendOtp(mobile, code, purpose);
    }

    try {
      // Fast2SMS Quick SMS / OTP endpoint
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables_values: code,
          route: 'otp',
          numbers: mobile,
        }),
      });

      const data = (await response.json()) as any;
      if (data.return) {
        return { success: true, messageId: data.request_id };
      }
      return { success: false, error: data.message || 'Fast2SMS dispatch failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error sending SMS' };
    }
  }
}

export function getSmsAdapter(): SmsAdapter {
  const mode = process.env.SMS_MODE || 'console';
  if (mode === 'live') {
    return new Fast2SmsAdapter();
  }
  return new ConsoleSmsAdapter();
}
