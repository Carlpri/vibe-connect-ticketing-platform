import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/utils/logger';
import { env } from '../../config/env';
import { TicketsService } from '../tickets/tickets.service';
import { paystackProvider } from './paystack.provider';

export interface InitiatePaymentInput {
  email?: string;
  callbackUrl?: string;
}

export class PaymentsService {
  /**
   * Initializes a payment for an owned, unexpired, pending order.
   */
  static async initiateOrderPayment(
    orderId: string,
    userId: string,
    input?: InitiatePaymentInput
  ) {
    if (!paystackProvider.isConfigured()) {
      throw new AppError('Payment gateway is not configured. Please configure Paystack credentials.', 503);
    }

    const { payment, customerEmail } = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId}::uuid FOR UPDATE`;

        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            user: { select: { email: true, name: true } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        });

        if (!order) throw new AppError('Order not found', 404);
        if (order.userId !== userId) {
          throw new AppError('Forbidden: You do not have access to this order', 403);
        }
        if (order.status !== 'PENDING') {
          throw new AppError(`Cannot pay for order with status ${order.status}`, 400);
        }
        if (order.expiresAt <= new Date()) {
          throw new AppError('This reservation has expired. Please select tickets again.', 400);
        }

        const email = input?.email?.trim() || order.user.email;
        if (!email || !email.includes('@')) {
          throw new AppError('A valid customer email is required to initiate payment', 400);
        }

        // Check if a successful payment already exists
        const existingSuccess = order.payments.find((p) => p.status === 'SUCCESS');
        if (existingSuccess) {
          throw new AppError('This order has already been paid for', 409);
        }

        // Generate clean, traceable reference
        const reference = `VC-${orderId.replace(/-/g, '').slice(0, 8)}-${Date.now()}`;

        const created = await tx.payment.create({
          data: {
            orderId,
            amountKes: order.totalKes,
            provider: paystackProvider.name,
            reference,
            status: 'PENDING',
            customerEmail: email,
          },
        });

        // Refresh 15-minute reservation timer during active checkout
        await tx.order.update({
          where: { id: orderId },
          data: { expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
        });

        return { payment: created, customerEmail: email };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    let providerResult;
    try {
      providerResult = await paystackProvider.initializePayment({
        orderId,
        userId,
        email: customerEmail,
        amountKes: payment.amountKes,
        reference: payment.reference!,
        callbackUrl: input?.callbackUrl,
      });
    } catch (err) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          resultDesc: 'Payment initialization could not be completed with provider',
        },
      });
      throw err;
    }

    return {
      paymentId: payment.id,
      orderId,
      reference: providerResult.reference,
      authorizationUrl: providerResult.authorizationUrl,
      accessCode: providerResult.accessCode,
      amountKes: payment.amountKes,
      status: payment.status,
      message: 'Payment initialized. Complete checkout at the authorization URL.',
    };
  }

  /**
   * Verifies payment with Paystack and finalizes order & tickets upon successful verification.
   * Fully idempotent: duplicate calls return current status without re-issuing tickets.
   */
  static async verifyAndFinalizePayment(reference: string) {
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { order: true },
    });

    if (!payment) {
      throw new AppError(`Payment with reference '${reference}' not found`, 404);
    }

    // Idempotent: If already marked SUCCESS, ensure tickets exist and return
    if (payment.status === 'SUCCESS' && payment.order.status === 'PAID') {
      await TicketsService.issueTicketsForPaidOrder(payment.orderId);
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        reference: payment.reference,
        amountKes: payment.amountKes,
        status: 'SUCCESS' as const,
        paidAt: payment.paidAt,
        message: 'Payment has already been confirmed and tickets are issued.',
      };
    }

    // Call Paystack verification API
    const verification = await paystackProvider.verifyPayment(reference);

    const now = new Date();
    await prisma.$transaction(
      async (tx) => {
        const current = await tx.payment.findUnique({
          where: { id: payment.id },
          include: { order: true },
        });

        if (!current) throw new AppError('Payment record not found', 404);
        if (current.status === 'SUCCESS' && current.order.status === 'PAID') return;

        if (verification.status === 'SUCCESS') {
          // Amount integrity check: Must match order amount exactly
          if (verification.amountKes !== current.amountKes) {
            logger.warn('Payment amount mismatch during verification', {
              category: 'PAYMENT_AMOUNT_MISMATCH',
              expected: current.amountKes,
              received: verification.amountKes,
              reference,
            });
            await tx.payment.update({
              where: { id: current.id },
              data: {
                status: 'FAILED',
                resultDesc: `Amount mismatch: expected KES ${current.amountKes}, received KES ${verification.amountKes}`,
                rawCallback: verification.rawResponse as Prisma.InputJsonValue,
              },
            });
            throw new AppError('Payment verification failed: Amount paid does not match order total', 400);
          }

          const paidAt = verification.paidAt || now;

          await tx.payment.update({
            where: { id: current.id },
            data: {
              status: 'SUCCESS',
              paidAt,
              channel: verification.channel || current.channel,
              customerEmail: verification.customerEmail || current.customerEmail,
              resultDesc: verification.gatewayResponse || 'Approved',
              rawCallback: verification.rawResponse as Prisma.InputJsonValue,
            },
          });

          await tx.order.update({
            where: { id: current.orderId },
            data: {
              status: 'PAID',
              paidAt,
            },
          });
        } else if (verification.status === 'FAILED') {
          await tx.payment.update({
            where: { id: current.id },
            data: {
              status: 'FAILED',
              resultDesc: verification.gatewayResponse || 'Transaction declined or failed',
              rawCallback: verification.rawResponse as Prisma.InputJsonValue,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (verification.status === 'SUCCESS') {
      await TicketsService.issueTicketsForPaidOrder(payment.orderId);
    }

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      reference,
      amountKes: payment.amountKes,
      status: verification.status,
      message:
        verification.status === 'SUCCESS'
          ? 'Payment confirmed successfully. Digital tickets have been generated.'
          : 'Payment verification indicated the transaction was not successful.',
    };
  }

  /**
   * Processes verified Paystack webhook notifications.
   */
  static async handleWebhook(signature: string | undefined, rawBody: string | Buffer) {
    if (!signature) {
      throw new AppError('Missing signature header', 401);
    }

    const isValid = paystackProvider.verifyWebhookSignature(signature, rawBody);
    if (!isValid) {
      logger.warn('Rejected Paystack webhook with invalid signature');
      throw new AppError('Invalid webhook signature', 401);
    }

    let payload: any;
    try {
      const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
      payload = JSON.parse(bodyString);
    } catch {
      throw new AppError('Invalid JSON in webhook body', 400);
    }

    const event = payload?.event;
    logger.info(`Received Paystack webhook event: ${event}`);

    if (event === 'charge.success') {
      const reference = payload?.data?.reference;
      if (typeof reference === 'string' && reference.length > 0) {
        await this.verifyAndFinalizePayment(reference);
      }
    }

    return { received: true };
  }

  /**
   * Returns non-sensitive public configuration for frontend checkout.
   */
  static getPublicConfig() {
    return {
      provider: paystackProvider.name,
      isConfigured: paystackProvider.isConfigured(),
      isTestMode: paystackProvider.isTestMode(),
      publicKey: paystackProvider.isConfigured() ? env.PAYSTACK_PUBLIC_KEY || null : null,
    };
  }
}
