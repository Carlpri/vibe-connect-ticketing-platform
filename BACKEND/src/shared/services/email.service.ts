import { Resend } from 'resend';
import { env } from '../../config/env';
import { logger } from '../utils/logger';

export interface SendVerificationEmailParams {
  to: string;
  name: string;
  token: string;
  expiresInMinutes?: number;
  redirectUrl?: string;
  origin?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  provider: 'resend' | 'mock';
  messageId?: string;
  error?: string;
  isMocked?: boolean;
  verificationUrl?: string;
}

/**
 * Common contract for email delivery providers in VIBE-CONNECT.
 */
export interface IEmailProvider {
  readonly name: 'resend' | 'mock';
  sendVerificationEmail(
    params: SendVerificationEmailParams,
    verificationUrl: string,
    html: string
  ): Promise<EmailDeliveryResult>;
}

/**
 * Production Resend provider using the official Resend Node.js SDK.
 */
export class ResendEmailProvider implements IEmailProvider {
  readonly name = 'resend' as const;
  private resendClient: Resend | null = null;
  private apiKey: string;
  private from: string;

  constructor(apiKey?: string, from?: string, customClient?: Resend) {
    this.apiKey = (apiKey || env.RESEND_API_KEY || '').trim();
    this.from = (from || env.EMAIL_FROM || '').trim();
    if (customClient) {
      this.resendClient = customClient;
    }
  }

  private getClient(): Resend {
    if (this.resendClient) {
      return this.resendClient;
    }
    if (!this.apiKey || this.apiKey.includes('your_api_key')) {
      throw new Error('RESEND_API_KEY is not configured or using placeholder.');
    }
    this.resendClient = new Resend(this.apiKey);
    return this.resendClient;
  }

  async sendVerificationEmail(
    params: SendVerificationEmailParams,
    verificationUrl: string,
    html: string
  ): Promise<EmailDeliveryResult> {
    const { to } = params;

    if (!to || !to.includes('@')) {
      return {
        success: false,
        provider: 'resend',
        error: 'Invalid recipient email address',
        verificationUrl,
      };
    }

    try {
      const client = this.getClient();
      const response = await client.emails.send({
        from: this.from,
        to: [to],
        subject: 'Verify your Vibe-Connect email',
        html,
      });

      if (response.error) {
        // Sanitize error logging: record provider, recipient, and error details without secrets
        logger.warn(`[RESEND_DELIVERY_REJECTED] Email rejected for recipient ${to}: ${response.error.message}`, {
          category: 'EMAIL_DELIVERY_REJECTED',
          provider: 'resend',
          recipient: to,
          errorMessage: response.error.message,
          errorName: response.error.name,
        });

        return {
          success: false,
          provider: 'resend',
          error: response.error.message || 'Email delivery rejected by Resend',
          verificationUrl,
        };
      }

      const messageId = response.data?.id;

      // Sanitized diagnostics: provider, recipient, provider message ID
      logger.info(`[RESEND_DELIVERY_SUCCESS] Email accepted by Resend for recipient ${to} (Message ID: ${messageId})`, {
        category: 'EMAIL_DELIVERY_SUCCESS',
        provider: 'resend',
        recipient: to,
        messageId,
      });

      return {
        success: true,
        provider: 'resend',
        messageId,
        verificationUrl,
      };
    } catch (err: any) {
      logger.error(`[RESEND_DELIVERY_ERROR] Network or provider failure sending to ${to}: ${err.message}`, err, {
        category: 'EMAIL_DELIVERY_ERROR',
        provider: 'resend',
        recipient: to,
        errorMessage: err.message,
      });

      return {
        success: false,
        provider: 'resend',
        error: err.message || 'Network error communicating with Resend',
        verificationUrl,
      };
    }
  }
}

/**
 * Mock email provider used for local development and unit tests.
 */
export class MockEmailProvider implements IEmailProvider {
  readonly name = 'mock' as const;

  async sendVerificationEmail(
    params: SendVerificationEmailParams,
    verificationUrl: string
  ): Promise<EmailDeliveryResult> {
    const { to } = params;

    // Sanitized diagnostics
    logger.info(`[EMAIL_SERVICE_MOCK] [MOCK EMAIL PROVIDER] Verification email generated for ${to}`, {
      category: 'EMAIL_SERVICE_MOCK',
      provider: 'mock',
      recipient: to,
    });

    return {
      success: true,
      provider: 'mock',
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      isMocked: true,
      verificationUrl,
    };
  }
}

/**
 * Provider selection strategy:
 * - Production: Resend is mandatory. Fails clearly if missing RESEND_API_KEY or set to mock.
 * - Test: Mock provider by default (or Resend if explicitly configured).
 * - Development: Resend if RESEND_API_KEY is present and EMAIL_PROVIDER !== 'mock', else Mock.
 */
export function selectEmailProvider(override?: IEmailProvider | null): IEmailProvider {
  if (override) {
    return override;
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const configuredProvider = (
    process.env.EMAIL_PROVIDER !== undefined ? process.env.EMAIL_PROVIDER : env.EMAIL_PROVIDER || ''
  ).toLowerCase().trim();
  const apiKey = (
    process.env.RESEND_API_KEY !== undefined ? process.env.RESEND_API_KEY : env.RESEND_API_KEY || ''
  ).trim();
  const hasValidKey = Boolean(apiKey && !apiKey.includes('your_api_key'));

  if (nodeEnv === 'production') {
    if (configuredProvider === 'mock') {
      throw new Error(
        'Production email provider misconfiguration: EMAIL_PROVIDER is set to "mock" in production. Real email delivery via Resend is required.'
      );
    }
    if (!hasValidKey) {
      throw new Error(
        'Production email provider misconfiguration: RESEND_API_KEY is required in production environment but is missing or placeholder.'
      );
    }
    return new ResendEmailProvider(apiKey, env.EMAIL_FROM);
  }

  if (nodeEnv === 'test') {
    if (configuredProvider === 'resend') {
      return new ResendEmailProvider(apiKey, env.EMAIL_FROM);
    }
    return new MockEmailProvider();
  }

  // Development
  if (configuredProvider === 'mock') {
    return new MockEmailProvider();
  }
  if (configuredProvider === 'resend' || hasValidKey) {
    return new ResendEmailProvider(apiKey, env.EMAIL_FROM);
  }

  return new MockEmailProvider();
}

/**
 * High-level EmailService orchestrating verification URL generation,
 * HTML template rendering, provider selection, and delivery tracking.
 */
export class EmailService {
  private static activeProviderOverride: IEmailProvider | null = null;

  /**
   * Allows unit tests to inject a mock or custom provider instance.
   */
  static setProvider(provider: IEmailProvider | null): void {
    this.activeProviderOverride = provider;
  }

  /**
   * Resets active provider override to default environment selection.
   */
  static resetProvider(): void {
    this.activeProviderOverride = null;
  }

  /**
   * Returns current active provider.
   */
  static getProvider(): IEmailProvider {
    return selectEmailProvider(this.activeProviderOverride);
  }

  /**
   * Generates the trusted frontend verification URL.
   */
  static getVerificationUrl(token: string, redirectUrl?: string, origin?: string): string {
    let baseUrl = (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    // In production, ensure we never point to localhost
    if (process.env.NODE_ENV === 'production' && (baseUrl.includes('localhost') || !baseUrl)) {
      baseUrl = 'https://www.vibe-connect.co.ke';
    }

    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          // Only adopt origin if not pointing to localhost in production
          if (!(process.env.NODE_ENV === 'production' && origin.includes('localhost'))) {
            baseUrl = origin.replace(/\/$/, '');
          }
        }
      } catch {
        // keep configured baseUrl
      }
    }

    const cleanRedirect = redirectUrl && redirectUrl.startsWith('/') ? redirectUrl : '';
    const redirectParam = cleanRedirect ? `&redirect=${encodeURIComponent(cleanRedirect)}` : '';
    return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}${redirectParam}`;
  }

  /**
   * Generates high-fidelity HTML content for the verification email matching VIBE-CONNECT brand guidelines.
   */
  static getVerificationEmailHtml(name: string, verificationUrl: string, expiresInMinutes: number): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Vibe-Connect email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #1C1916;
      color: #FAF7F2;
      margin: 0;
      padding: 32px 16px;
    }
    .wrapper {
      max-width: 580px;
      margin: 0 auto;
      background-color: #262220;
      border-radius: 12px;
      border: 1px solid #3D3733;
      padding: 40px 32px;
    }
    .header {
      text-align: center;
      margin-bottom: 28px;
    }
    .brand {
      color: #B5E02A;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .subbrand {
      color: #A39B92;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 6px;
      font-weight: 700;
    }
    .content {
      line-height: 1.65;
      color: #ECE8E2;
      font-size: 15px;
    }
    .content p {
      margin: 16px 0;
    }
    .btn-wrap {
      text-align: center;
      margin: 36px 0;
    }
    .btn {
      background-color: #B5E02A;
      color: #1A2B08 !important;
      text-decoration: none;
      padding: 14px 34px;
      border-radius: 8px;
      font-weight: 800;
      display: inline-block;
      font-size: 15px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .notice {
      background-color: #1C1916;
      border-left: 4px solid #E8503A;
      padding: 14px 16px;
      border-radius: 6px;
      margin: 24px 0;
      font-size: 13px;
      color: #D1CBC3;
    }
    .fallback {
      font-size: 13px;
      color: #A39B92;
      word-break: break-all;
      background: #1C1916;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #3D3733;
    }
    .fallback a {
      color: #B5E02A;
      text-decoration: none;
    }
    .reason {
      font-size: 12px;
      color: #8C847A;
      margin-top: 24px;
      border-top: 1px solid #3D3733;
      padding-top: 18px;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #756D65;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">VIBE-CONNECT</div>
      <div class="subbrand">Kenyan Event Discovery & Ticketing</div>
    </div>
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering with <strong>VIBE-CONNECT</strong>! To activate your account privileges, purchase tickets via M-Pesa, and receive booking confirmations, please verify your email address.</p>
      
      <div class="btn-wrap">
        <a href="${verificationUrl}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
      </div>

      <div class="notice">
        <strong>⏱️ Expiration Notice:</strong> This verification link is valid for <strong>${expiresInMinutes} minutes</strong> and can only be used once.
      </div>

      <p style="font-size: 13px; color: #A39B92; margin-bottom: 8px;">
        If the button above does not open, copy and paste this link into your browser:
      </p>
      <div class="fallback">
        <a href="${verificationUrl}">${verificationUrl}</a>
      </div>

      <div class="reason">
        <strong>Why did I receive this email?</strong><br>
        You are receiving this email because an account was registered with this email address on VIBE-CONNECT (<a href="https://www.vibe-connect.co.ke" style="color: #A39B92;">www.vibe-connect.co.ke</a>). If you did not create this account, you can safely ignore this email; no account will be activated without this verification step.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VIBE-CONNECT Kenya. Nairobi, Kenya.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Sends the verification email using the configured provider.
   */
  static async sendVerificationEmail(params: SendVerificationEmailParams): Promise<EmailDeliveryResult> {
    const { to, name, token, expiresInMinutes = env.EMAIL_VERIFICATION_EXPIRES_MINUTES, redirectUrl, origin } = params;
    const verificationUrl = this.getVerificationUrl(token, redirectUrl, origin);
    const html = this.getVerificationEmailHtml(name, verificationUrl, expiresInMinutes);

    try {
      const provider = this.getProvider();
      return await provider.sendVerificationEmail(params, verificationUrl, html);
    } catch (configErr: any) {
      logger.error(`[EMAIL_PROVIDER_CONFIG_ERROR] Failed to dispatch verification email to ${to}: ${configErr.message}`, {
        category: 'EMAIL_PROVIDER_CONFIG_ERROR',
        recipient: to,
        errorMessage: configErr.message,
      });

      return {
        success: false,
        provider: 'resend',
        error: configErr.message || 'Email provider configuration error',
        verificationUrl,
      };
    }
  }

  /**
   * Safe non-invasive connectivity audit for Resend API.
   * Checks whether the configured RESEND_API_KEY is valid and accepted by Resend
   * without sending an email or triggering volume.
   */
  static async checkConnectivity(): Promise<{ success: boolean; message: string; details?: any }> {
    const apiKey = (env.RESEND_API_KEY || '').trim();
    if (!apiKey || apiKey.includes('your_api_key')) {
      return { success: false, message: 'RESEND_API_KEY is not configured or using placeholder' };
    }

    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.apiKeys.list();
      if (error) {
        // If the key has sending-only permission, list() returns a restricted/unauthorized error,
        // which still verifies the key is authentic against Resend.
        const errMsg = error.message?.toLowerCase() || '';
        if (errMsg.includes('restricted') || errMsg.includes('permission') || (error as any).name === 'restricted_api_key') {
          return { success: true, message: 'Resend API key authenticated successfully (restricted sending key)', details: error };
        }
        return { success: false, message: `Resend authentication failed: ${error.message}`, details: error };
      }
      return { success: true, message: 'Resend API key authenticated and active', details: data };
    } catch (err: any) {
      return { success: false, message: `Resend connectivity error: ${err.message}` };
    }
  }
}
