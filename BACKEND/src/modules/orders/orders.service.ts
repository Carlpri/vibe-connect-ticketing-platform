import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';
import { CreateOrderInput } from './orders.schemas';
import { TicketsService } from '../tickets/tickets.service';
import { InitiatePaymentInput, MpesaCallbackInput } from './orders.schemas';
import { MpesaService } from './mpesa.service';
import { normalizeKenyanPhone } from './orders.schemas';
import { logger } from '../../shared/utils/logger';

export class OrdersService {
  /**
   * Reserve available tickets using database prices and a serializable transaction.
   */
  static async createOrder(userId: string, input: CreateOrderInput) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => {
          const now = new Date();
          const event = await tx.event.findUnique({
            where: { id: input.eventId },
            select: { status: true, endsAt: true },
          });

          if (!event) {
            throw new AppError('Event not found', 404);
          }
          if (event.status !== 'PUBLISHED' || event.endsAt <= now) {
            throw new AppError('This event is not available for booking', 400);
          }

          const requestedIds = input.items.map((item) => item.ticketTypeId);
          const ticketTypes = await tx.ticketType.findMany({
            where: {
              id: { in: requestedIds },
              eventId: input.eventId,
              isActive: true,
            },
          });
          if (ticketTypes.length !== requestedIds.length) {
            throw new AppError('One or more ticket types are unavailable for this event', 400);
          }

          const reservations = await tx.orderItem.findMany({
            where: {
              ticketTypeId: { in: requestedIds },
              order: {
                is: {
                  status: 'PENDING',
                  OR: [
                    { expiresAt: { gt: now } },
                    {
                      payments: {
                        some: {
                          status: 'PENDING',
                          createdAt: { gt: new Date(now.getTime() - 15 * 60 * 1000) },
                        },
                      },
                    },
                  ],
                },
              },
            },
            select: { ticketTypeId: true, quantity: true },
          });
          const reservedByType = new Map<string, number>();
          for (const reservation of reservations) {
            reservedByType.set(
              reservation.ticketTypeId,
              (reservedByType.get(reservation.ticketTypeId) ?? 0) + reservation.quantity
            );
          }

          const typesById = new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType]));
          let subtotalKes = 0;
          const items = input.items.map((item) => {
            const ticketType = typesById.get(item.ticketTypeId);
            if (!ticketType) {
              throw new AppError('One or more ticket types are unavailable for this event', 400);
            }
            if (
              (ticketType.salesStart && ticketType.salesStart > now) ||
              (ticketType.salesEnd && ticketType.salesEnd <= now)
            ) {
              throw new AppError(`Ticket sales are not open for ${ticketType.name}`, 400);
            }

            const reserved = reservedByType.get(ticketType.id) ?? 0;
            if (ticketType.capacity - ticketType.sold - reserved < item.quantity) {
              throw new AppError(`Not enough tickets available for ${ticketType.name}`, 409);
            }

            subtotalKes += ticketType.priceKes * item.quantity;
            if (!Number.isSafeInteger(subtotalKes) || subtotalKes > 2_147_483_647) {
              throw new AppError('Order total exceeds the supported amount', 400);
            }
            return {
              ticketTypeId: ticketType.id,
              quantity: item.quantity,
              unitPriceKes: ticketType.priceKes,
            };
          });

          const serviceFeeKes = subtotalKes > 0 ? 50 : 0;
          const totalKes = subtotalKes + serviceFeeKes;
          if (totalKes > 2_147_483_647) {
            throw new AppError('Order total exceeds the supported amount', 400);
          }
          const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

          return tx.order.create({
            data: {
              userId,
              eventId: input.eventId,
              totalKes,
              expiresAt,
              items: { create: items },
            },
            include: { items: true },
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
          if (attempt < 2) {
            continue;
          }
          throw new AppError('Inventory changed while reserving tickets. Please try again.', 409);
        }
        throw error;
      }
    }

    throw new AppError('Could not reserve tickets because inventory changed. Please try again.', 409);
  }

  /**
   * Get all orders belonging to the authenticated attendee.
   */
  static async getMyOrders(userId: string) {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            amountKes: true,
            phoneNumber: true,
            mpesaReceiptNumber: true,
            resultDesc: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  /**
   * Get an order by ID. Validates attendee ownership.
   */
  static async getOrderById(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            amountKes: true,
            phoneNumber: true,
            mpesaReceiptNumber: true,
            resultDesc: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new AppError('Forbidden: You do not have access to this order', 403);
    }

    return order;
  }

  /**
   * Request a Daraja STK push for an owned, unexpired pending order.
   */
  static async initiatePayment(orderId: string, userId: string, input: InitiatePaymentInput) {
    if (!MpesaService.isConfigured()) {
      throw new AppError('M-Pesa is not configured. Set the Daraja credentials and public HTTPS callback URL.', 503);
    }

    const payment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payments: { orderBy: { createdAt: 'desc' } } },
      });

      if (!order) throw new AppError('Order not found', 404);
      if (order.userId !== userId) {
        throw new AppError('Forbidden: You do not have access to this order', 403);
      }
      if (order.status !== 'PENDING') {
        throw new AppError(`Cannot pay for order with status ${order.status}`, 400);
      }
      if (order.expiresAt <= new Date()) {
        throw new AppError('This reservation has expired. Please reserve tickets again.', 400);
      }

      const pendingPayment = order.payments.find((entry) => entry.status === 'PENDING');
      if (pendingPayment?.checkoutRequestId) {
        return { payment: pendingPayment, shouldInitiate: false };
      }
      if (pendingPayment) {
        throw new AppError('A payment request is already being prepared for this order', 409);
      }

      const created = await tx.payment.create({
        data: {
          orderId,
          amountKes: order.totalKes,
          phoneNumber: input.phoneNumber,
          status: 'PENDING',
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
      });
      return { payment: created, shouldInitiate: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!payment.shouldInitiate) {
      return {
        paymentId: payment.payment.id,
        checkoutRequestId: payment.payment.checkoutRequestId,
        orderId,
        amountKes: payment.payment.amountKes,
        status: payment.payment.status,
        message: 'M-Pesa payment prompt is already pending. Complete it on your phone.',
      };
    }

    let response;
    try {
      response = await MpesaService.initiateStkPush({
        amountKes: payment.payment.amountKes,
        orderId,
        phoneNumber: input.phoneNumber,
      });
    } catch (error) {
      await prisma.payment.update({
        where: { id: payment.payment.id },
        data: {
          status: 'FAILED',
          resultDesc: 'M-Pesa request could not be initiated',
        },
      });
      throw error;
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.payment.id },
      data: {
        merchantRequestId: response.MerchantRequestID,
        checkoutRequestId: response.CheckoutRequestID,
      },
    });

    return {
      paymentId: updatedPayment.id,
      checkoutRequestId: updatedPayment.checkoutRequestId,
      orderId,
      amountKes: updatedPayment.amountKes,
      status: updatedPayment.status,
      message: response.CustomerMessage || 'Check your phone and enter your M-Pesa PIN to complete payment.',
    };
  }

  /**
   * Client-side payment confirmation is never trusted; only a verified provider callback may mark an order paid.
   */
  static async confirmPayment(): Promise<never> {
    throw new AppError('Payment confirmation is unavailable until a provider callback is verified', 501);
  }

  /**
   * Accepts a Daraja callback only after matching it to a stored request and confirming
   * successful payment status with Daraja's server-to-server STK query endpoint.
   */
  static async processMpesaCallback(input: MpesaCallbackInput): Promise<void> {
    const callback = input.Body.stkCallback;
    const payment = await prisma.payment.findUnique({
      where: { checkoutRequestId: callback.CheckoutRequestID },
      include: { order: true },
    });

    if (!payment || payment.merchantRequestId !== callback.MerchantRequestID) {
      logger.warn('Ignored M-Pesa callback with no matching payment request', {
        category: 'MPESA_CALLBACK_UNMATCHED',
      });
      return;
    }

    if (payment.status === 'SUCCESS') {
      await TicketsService.issueTicketsForPaidOrder(payment.orderId);
      return;
    }
    if (payment.status !== 'PENDING' || payment.order.status !== 'PENDING') {
      return;
    }

    const providerResult = await MpesaService.queryStkPush(callback.CheckoutRequestID);
    if (
      providerResult.ResponseCode !== '0' ||
      providerResult.CheckoutRequestID !== callback.CheckoutRequestID ||
      providerResult.MerchantRequestID !== callback.MerchantRequestID ||
      Number(providerResult.ResultCode) !== callback.ResultCode
    ) {
      logger.warn('M-Pesa STK query did not confirm callback result', {
        category: 'MPESA_QUERY_NOT_CONFIRMED',
        paymentId: payment.id,
        resultCode: providerResult.ResultCode,
      });
      throw new AppError('M-Pesa callback is not yet confirmed by the provider', 503);
    }

    const rawCallback = input as unknown as Prisma.InputJsonValue;
    if (callback.ResultCode !== 0) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: {
            status: 'FAILED',
            resultCode: callback.ResultCode,
            resultDesc: callback.ResultDesc,
            rawCallback,
          },
        });
      });
      return;
    }

    const metadata = new Map(
      (callback.CallbackMetadata?.Item ?? []).map((item) => [item.Name, item.Value])
    );
    const amount = metadata.get('Amount');
    const receiptNumber = metadata.get('MpesaReceiptNumber');
    const phoneNumber = metadata.get('PhoneNumber');

    if (
      typeof amount !== 'number' ||
      typeof receiptNumber !== 'string' ||
      (typeof phoneNumber !== 'number' && typeof phoneNumber !== 'string') ||
      amount !== payment.amountKes ||
      normalizeKenyanPhone(String(phoneNumber)) !== payment.phoneNumber
    ) {
      logger.warn('Rejected M-Pesa callback with mismatched payment details', {
        category: 'MPESA_CALLBACK_MISMATCH',
        paymentId: payment.id,
      });
      throw new AppError('M-Pesa callback did not match the pending payment', 400);
    }

    await prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({
        where: { id: payment.id },
        include: { order: true },
      });
      if (!current) throw new AppError('Payment record not found', 404);
      if (current.status === 'SUCCESS' && current.order.status === 'PAID') return;
      if (current.status !== 'PENDING' || current.order.status !== 'PENDING') return;

      const duplicateReceipt = await tx.payment.findUnique({
        where: { mpesaReceiptNumber: receiptNumber },
        select: { id: true },
      });
      if (duplicateReceipt && duplicateReceipt.id !== payment.id) {
        throw new AppError('M-Pesa receipt has already been applied to another payment', 409);
      }

      const now = new Date();
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          mpesaReceiptNumber: receiptNumber,
          paidAt: now,
          resultCode: callback.ResultCode,
          resultDesc: callback.ResultDesc,
          rawCallback,
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID', paidAt: now },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await TicketsService.issueTicketsForPaidOrder(payment.orderId);
  }

  /**
   * Validate QR Ticket check-in (for organizers / gate staff).
   */
  static async checkinTicket(qrCode: string, scannedByUserId: string) {
    return TicketsService.verifyAndCheckIn(qrCode, scannedByUserId);
  }
}
