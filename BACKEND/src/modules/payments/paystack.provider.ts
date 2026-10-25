import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/utils/logger';
import {
  IPaymentProvider,
  PaymentInitializationParams,
  PaymentInitializationResult,
  PaymentVerificationResult,
} from './payment-provider.interface';

const PAYSTACK_API_BASE = 'https://api.paystack.co';
const REQUEST_TIMEOUT_MS = 15_000;

export class PaystackProvider implements IPaymentProvider {
  readonly name = 'PAYSTACK';

  private get secretKey(): string {
    return (process.env.PAYSTACK_SECRET_KEY ?? env.PAYSTACK_SECRET_KEY)?.trim() || '';
  }

  private get callbackUrl(): string {
    return (process.env.PAYSTACK_CALLBACK_URL ?? env.PAYSTACK_CALLBACK_URL)?.trim() || '';
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey && this.secretKey.startsWith('sk_'));
  }

  isTestMode(): boolean {
    return this.secretKey.startsWith('sk_test_');
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.isConfigured()) {
      throw new AppError('Paystack is not configured. Set PAYSTACK_SECRET_KEY in environment.', 503);
    }
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializePayment(params: PaymentInitializationParams): Promise<PaymentInitializationResult> {
    const headers = this.getAuthHeaders();
    // Paystack requires amount in lowest currency unit (cents for KES: 1 KES = 100 cents)
    const amountInCents = Math.round(params.amountKes * 100);

    const payload = {
      email: params.email,
      amount: amountInCents,
      currency: 'KES',
      reference: params.reference,
      callback_url: params.callbackUrl || this.callbackUrl || undefined,
      metadata: {
        orderId: params.orderId,
        userId: params.userId,
        platform: 'vibe-connect',
        ...params.metadata,
      },
    };

    let response: Response;
    try {
      response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err: any) {
      logger.error('Failed to connect to Paystack initialize API', err);
      throw new AppError('Could not connect to payment gateway. Please try again later.', 502);
    }

    const body = (await response.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    } | null;

    if (!response.ok || !body?.status || !body.data?.authorization_url) {
      const detail = body?.message || 'Payment provider rejected payment initialization';
      logger.error('Paystack initialization error', { status: response.status, body });
      throw new AppError(`Payment initialization failed: ${detail}`, 502);
    }

    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code || '',
      reference: body.data.reference || params.reference,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    const headers = this.getAuthHeaders();
    const encodedRef = encodeURIComponent(reference);

    let response: Response;
    try {
      response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${encodedRef}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err: any) {
      logger.error('Failed to connect to Paystack verify API', err);
      throw new AppError('Could not verify payment with provider. Please try again.', 502);
    }

    const body = (await response.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        paid_at?: string;
        channel?: string;
        gateway_response?: string;
        customer?: {
          email?: string;
        };
      };
    } | null;

    if (!response.ok || !body?.status || !body.data) {
      const detail = body?.message || 'Payment verification failed at gateway';
      logger.error('Paystack verification error', { status: response.status, body });
      throw new AppError(`Payment verification failed: ${detail}`, 502);
    }

    const data = body.data;
    const isSuccess = data.status === 'success';
    const isFailed = data.status === 'failed' || data.status === 'abandoned';
    const status: 'SUCCESS' | 'FAILED' | 'PENDING' = isSuccess
      ? 'SUCCESS'
      : isFailed
      ? 'FAILED'
      : 'PENDING';

    // Amount returned from Paystack is in cents; convert back to KES
    const amountKes = data.amount ? Math.round(data.amount / 100) : 0;

    return {
      success: isSuccess,
      status,
      reference: data.reference || reference,
      amountKes,
      currency: data.currency || 'KES',
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      channel: data.channel,
      customerEmail: data.customer?.email,
      gatewayResponse: data.gateway_response,
      rawResponse: body,
    };
  }

  verifyWebhookSignature(signature: string, rawBody: string | Buffer): boolean {
    if (!this.isConfigured() || !signature) {
      return false;
    }

    try {
      const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(bodyBuffer)
        .digest('hex');

      const expectedBuffer = Buffer.from(hash, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch (err) {
      logger.error('Error verifying webhook signature', err);
      return false;
    }
  }
}

export const paystackProvider = new PaystackProvider();
