export interface PaymentInitializationParams {
  orderId: string;
  userId: string;
  email: string;
  amountKes: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitializationResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  reference: string;
  amountKes: number;
  currency: string;
  paidAt?: Date;
  channel?: string;
  customerEmail?: string;
  gatewayResponse?: string;
  rawResponse?: unknown;
}

export interface IPaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  initializePayment(params: PaymentInitializationParams): Promise<PaymentInitializationResult>;
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(signature: string, rawBody: string | Buffer): boolean;
}
