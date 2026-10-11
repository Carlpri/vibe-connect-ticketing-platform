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

export class SmsService {
  /**
   * Sends an SMS message using Africa's Talking SMS API (or safe mock fallback).
   */
  static async sendOtpSms(to: string, otp: string, expiresInMinutes: number): Promise<SmsDeliveryResult> {
    const message = `Your VIBE-CONNECT verification code is: ${otp}. Valid for ${expiresInMinutes} minutes. Never share this code with anyone.`;
    return this.sendSms({ to, message });
  }

  static async sendSms(params: SendSmsParams): Promise<SmsDeliveryResult> {
    const { to, message } = params;

    const apiKey = env.AFRICASTALKING_API_KEY;
    const username = env.AFRICASTALKING_USERNAME;

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
      const isSandbox = username.toLowerCase() === 'sandbox';
      const endpoint = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

      const bodyParams = new URLSearchParams();
      bodyParams.append('username', username);
      bodyParams.append('to', to);
      bodyParams.append('message', message);
      if (env.AFRICASTALKING_SENDER_ID) {
        bodyParams.append('from', env.AFRICASTALKING_SENDER_ID);
      }

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
}
