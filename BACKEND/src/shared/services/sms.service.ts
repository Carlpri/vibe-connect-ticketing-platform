import { env } from '../../config/env';
import { logger } from '../utils/logger';

export interface SendSmsParams {
  to: string; // E.164 phone number
  message: string;
}

export interface SmsDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isMocked?: boolean;
}

export interface SmsRequestOptions {
  username: string;
  to: string;
  message: string;
  senderId?: string;
}

export class SmsService {
  /**
   * Constructs the API endpoint and URLSearchParams payload for Africa's Talking.
   * Handles Sandbox vs Production endpoints and respects Africa's Talking sandbox
   * sender rules (omits custom sender ID in sandbox mode or when sender ID is not specified).
   */
  static buildRequestPayload(options: SmsRequestOptions): { endpoint: string; bodyParams: URLSearchParams } {
    const isSandbox = options.username.trim().toLowerCase() === 'sandbox';
    const endpoint = isSandbox
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    const bodyParams = new URLSearchParams();
    bodyParams.append('username', options.username.trim());
    bodyParams.append('to', options.to);
    bodyParams.append('message', options.message);

    const senderId = options.senderId?.trim();
    // In Africa's Talking sandbox mode, custom alphanumeric sender IDs are not permitted
    // and cause requests to fail. Omitting 'from' allows Africa's Talking to route via
    // its default sandbox shortcode.
    // In production, 'from' is only appended when a non-empty sender ID is configured.
    if (senderId && (!isSandbox || /^\d+$/.test(senderId))) {
      bodyParams.append('from', senderId);
    }

    return { endpoint, bodyParams };
  }

  /**
   * Sends an SMS message using Africa's Talking SMS API (or safe mock fallback).
   */
  static async sendOtpSms(to: string, otp: string, expiresInMinutes: number): Promise<SmsDeliveryResult> {
    const message = `Your VIBE-CONNECT verification code is: ${otp}. Valid for ${expiresInMinutes} minutes. Never share this code with anyone.`;
    return this.sendSms({ to, message });
  }

  static async sendSms(params: SendSmsParams): Promise<SmsDeliveryResult> {
    const { to, message } = params;

    const apiKey = env.AT_API_KEY || env.AFRICASTALKING_API_KEY;
    const username = env.AT_USERNAME || env.AFRICASTALKING_USERNAME;
    const senderId = env.AT_SENDER_ID || env.AFRICASTALKING_SENDER_ID;

    const hasValidCredentials =
      Boolean(apiKey && username && !apiKey.includes('your_api_key'));

    // If Africa's Talking credentials are not provided or in test environment, use safe mock adapter
    if (!hasValidCredentials || !apiKey || !username || process.env.NODE_ENV === 'test') {
      const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

      if (!isTestOrDev) {
        logger.error("Africa's Talking SMS credentials are not configured in production", null, {
          category: 'SMS_CONFIG_MISSING',
          recipient: to,
        });

        return {
          success: false,
          error: 'SMS service configuration is incomplete on server',
        };
      }

      // Safe dev/test mock: log without exposing sensitive tokens
      logger.info(`[MOCK SMS PROVIDER] Simulating SMS delivery to ${to}`, {
        category: 'SMS_SERVICE_MOCK',
        recipient: to,
        isConfigured: false,
      });

      return {
        success: true,
        messageId: `mock-sms-${Date.now()}`,
        isMocked: true,
      };
    }

    try {
      const { endpoint, bodyParams } = SmsService.buildRequestPayload({
        username,
        to,
        message,
        senderId,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: bodyParams.toString(),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        logger.error(`Africa's Talking API rejected SMS request: ${response.statusText}`, null, {
          category: 'SMS_DELIVERY_FAILURE',
          statusCode: response.status,
          apiResponse: data,
        });

        return {
          success: false,
          error: data?.errorMessage || 'SMS delivery failed at gateway',
        };
      }

      const recipients = data?.SMSMessageData?.Recipients || [];
      const primary = recipients[0];

      // Status codes: 101 = Success, 100 = Processed, 102 = Queued
      const isSuccess = primary && [100, 101, 102].includes(primary.statusCode);

      if (!isSuccess) {
        const errorMsg = primary?.status || 'SMS delivery rejected by carrier';
        logger.error(`Africa's Talking carrier rejected delivery to ${to}: ${errorMsg}`, null, {
          category: 'SMS_CARRIER_REJECTED',
          recipientStatus: primary,
        });

        return {
          success: false,
          error: errorMsg,
        };
      }

      logger.info(`SMS sent successfully to ${to} (MessageId: ${primary.messageId})`, {
        category: 'SMS_DELIVERED',
        recipient: to,
        messageId: primary.messageId,
      });

      return {
        success: true,
        messageId: primary.messageId,
      };
    } catch (error: any) {
      logger.error(`Network error while calling Africa's Talking API for ${to}`, error, {
        category: 'SMS_NETWORK_ERROR',
      });

      return {
        success: false,
        error: error.message || 'Network error communicating with SMS provider',
      };
    }
  }

  /**
   * Safe non-invasive connectivity audit for Africa's Talking API.
   * Calls the official user/balance endpoint to verify that username and API key
   * authenticate successfully without sending an SMS or incurring cost.
   */
  static async checkConnectivity(): Promise<{ success: boolean; message: string; details?: any }> {
    const apiKey = env.AT_API_KEY || env.AFRICASTALKING_API_KEY;
    const username = env.AT_USERNAME || env.AFRICASTALKING_USERNAME;

    if (!apiKey || !username || apiKey.includes('your_api_key')) {
      return { success: false, message: "Africa's Talking API key or username is missing or using placeholder" };
    }

    try {
      const isSandbox = username.trim().toLowerCase() === 'sandbox';
      const endpoint = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/user?username=sandbox'
        : `https://api.africastalking.com/version1/user?username=${encodeURIComponent(username.trim())}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apiKey,
          Accept: 'application/json',
        },
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          message: `Africa's Talking authentication failed (${response.status}): ${data?.errorMessage || response.statusText}`,
          details: data,
        };
      }

      return {
        success: true,
        message: `Africa's Talking authenticated successfully (Environment: ${isSandbox ? 'Sandbox' : 'Production'})`,
        details: {
          isSandbox,
          username: isSandbox ? 'sandbox' : username,
          balance: data?.UserData?.balance,
        },
      };
    } catch (err: any) {
      return { success: false, message: `Africa's Talking connectivity error: ${err.message}` };
    }
  }
}
