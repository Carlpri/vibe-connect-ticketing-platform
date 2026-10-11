import { env } from '../../config/env';
import { logger } from '../utils/logger';

export interface SendVerificationEmailParams {
  to: string;
  name: string;
  token: string;
  expiresInMinutes?: number;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isMocked?: boolean;
}

export class EmailService {
  /**
   * Generates the trusted frontend verification URL.
   */
  static getVerificationUrl(token: string): string {
    const baseUrl = env.FRONTEND_URL.replace(/\/$/, '');
    return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  }

  /**
   * Generates HTML content for the verification email.
   */
  static getVerificationEmailHtml(name: string, verificationUrl: string, expiresInMinutes: number): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify your VIBE-CONNECT Account</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 36px; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { color: #f43f5e; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: #94a3b8; font-size: 14px; margin-top: 6px; }
    .content { line-height: 1.6; color: #cbd5e1; font-size: 16px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background: linear-gradient(135deg, #f43f5e, #e11d48); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 14px rgba(244, 63, 94, 0.4); }
    .notice { background-color: #0f172a; border-left: 4px solid #f43f5e; padding: 14px; border-radius: 4px; margin: 24px 0; font-size: 14px; color: #94a3b8; }
    .footer { text-align: center; margin-top: 32px; font-size: 13px; color: #64748b; border-top: 1px solid #334155; padding-top: 20px; }
    .fallback-url { word-break: break-all; color: #38bdf8; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VIBE-CONNECT</h1>
      <p>Live Event Discovery & Digital Ticketing Platform</p>
    </div>
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for creating an account with VIBE-CONNECT! To activate your ticketing privileges and ensure your account remains secure, please verify your email address.</p>
      
      <div class="btn-container">
        <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
      </div>

      <div class="notice">
        <strong>⏱️ Expiration Notice:</strong> This link is valid for <strong>${expiresInMinutes} minutes</strong>. For your security, it can only be used once.
      </div>

      <p style="font-size: 14px; color: #94a3b8;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="${verificationUrl}" class="fallback-url">${verificationUrl}</a>
      </p>

      <p style="font-size: 13px; color: #64748b;">
        Need a new link? If this link expires, you can request a replacement verification link directly from your account login or settings.
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VIBE-CONNECT Kenya. If you did not create this account, please disregard this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Sends the verification email using Resend API (or safe mock fallback).
   */
  static async sendVerificationEmail(params: SendVerificationEmailParams): Promise<EmailDeliveryResult> {
    const { to, name, token, expiresInMinutes = env.EMAIL_VERIFICATION_EXPIRES_MINUTES } = params;
    const verificationUrl = this.getVerificationUrl(token);

    // If Resend API key is not configured or in test environment, use safe mock adapter
    if (!env.RESEND_API_KEY || env.RESEND_API_KEY.includes('your_api_key') || process.env.NODE_ENV === 'test') {
      logger.info(`[MOCK EMAIL PROVIDER] Verification email generated for ${to}`, {
        category: 'EMAIL_SERVICE_MOCK',
        recipient: to,
        verificationUrl,
      });

      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        isMocked: true,
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [to],
          subject: 'Verify your VIBE-CONNECT account',
          html: this.getVerificationEmailHtml(name, verificationUrl, expiresInMinutes),
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        logger.error(`Resend API rejected email to ${to}: ${data?.message || response.statusText}`, null, {
          category: 'EMAIL_DELIVERY_FAILURE',
          statusCode: response.status,
          resendError: data,
        });

        return {
          success: false,
          error: data?.message || 'Email delivery failed at provider',
        };
      }

      logger.info(`Verification email sent successfully to ${to} (ID: ${data.id})`, {
        category: 'EMAIL_DELIVERED',
        recipient: to,
        id: data.id,
      });

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error: any) {
      logger.error(`Network error while calling Resend API for ${to}`, error, {
        category: 'EMAIL_NETWORK_ERROR',
      });

      return {
        success: false,
        error: error.message || 'Network error communicating with email provider',
      };
    }
  }
}
