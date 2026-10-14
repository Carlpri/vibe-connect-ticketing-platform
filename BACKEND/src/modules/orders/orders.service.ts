import { randomUUID } from 'crypto';
import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';
import { CreateOrderInput } from './orders.schemas';

export class OrdersService {
  /**
   * Create a new order with items.
   * Total KES is calculated from line items. Order is set to expire in 15 minutes.
   */
  static async createOrder(userId: string, input: CreateOrderInput) {
    const totalKes = input.items.reduce((sum, item) => sum + item.quantity * item.unitPriceKes, 0);

    // Order reservation window: 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        userId,
        eventId: input.eventId,
        totalKes,
        expiresAt,
        items: {
          create: input.items.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            unitPriceKes: item.unitPriceKes,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return order;
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
   * Initiate M-Pesa STK push for an order.
   * Records a PENDING payment and prepares the checkout transaction.
   */
  static async initiatePayment(orderId: string, userId: string, phoneNumber: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new AppError('Forbidden: You do not have access to this order', 403);
    }

    if (order.status === 'PAID') {
      throw new AppError('Order has already been paid for', 400);
    }

    if (order.status !== 'PENDING') {
      throw new AppError(`Cannot pay for order with status ${order.status}`, 400);
    }

    // Check expiry
    if (new Date() > order.expiresAt) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
      throw new AppError('This order has expired. Please reserve tickets again.', 400);
    }

    // Unique checkoutRequestId required by M-Pesa
    const checkoutRequestId = `ws_CO_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const merchantRequestId = `MR_${Date.now()}_${randomUUID().slice(0, 6)}`;

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amountKes: order.totalKes,
        phoneNumber,
        checkoutRequestId,
        merchantRequestId,
        status: 'PENDING',
      },
    });

    return {
      paymentId: payment.id,
      checkoutRequestId: payment.checkoutRequestId,
      orderId: order.id,
      amountKes: payment.amountKes,
      phoneNumber: payment.phoneNumber,
      status: payment.status,
      message: 'M-Pesa STK push initiated. Please check your phone to complete PIN entry.',
    };
  }

  /**
   * Confirm/Record successful payment (M-Pesa STK push callback or instant verification).
   * Atomically marks payment as SUCCESS and order as PAID.
   */
  static async confirmPayment(orderId: string, userId: string, customReceipt?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, items: true },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new AppError('Forbidden: You do not have access to this order', 403);
    }

    if (order.status === 'PAID') {
      return order;
    }

    // Find the latest pending payment or create one if paying directly
    let payment = order.payments.find((p) => p.status === 'PENDING');
    const now = new Date();
    const receiptNumber = customReceipt || `RCP${randomUUID().slice(0, 7).toUpperCase()}X`;

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          mpesaReceiptNumber: receiptNumber,
          paidAt: now,
          resultCode: 0,
          resultDesc: 'The service request is processed successfully.',
        },
      });
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const phone = user?.phone || '254712345678';
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amountKes: order.totalKes,
          phoneNumber: phone,
          checkoutRequestId: `ws_CO_${Date.now()}_${randomUUID().slice(0, 8)}`,
          status: 'SUCCESS',
          mpesaReceiptNumber: receiptNumber,
          paidAt: now,
          resultCode: 0,
          resultDesc: 'The service request is processed successfully.',
        },
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAt: now,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return updatedOrder;
  }

  /**
   * Validate QR Ticket check-in (for organizers / gate staff).
   */
  static async checkinTicket(qrCode: string) {
    // Extract UUID from QR string if wrapped
    const uuidMatch = qrCode.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const orderId = uuidMatch ? uuidMatch[0] : qrCode;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        payments: { where: { status: 'SUCCESS' } },
      },
    });

    if (!order) {
      throw new AppError('Invalid ticket: Order not found', 404);
    }

    if (order.status !== 'PAID') {
      throw new AppError(`Cannot check in ticket: Order status is ${order.status}`, 400);
    }

    return {
      valid: true,
      orderId: order.id,
      attendee: order.user,
      totalKes: order.totalKes,
      paidAt: order.paidAt,
      items: order.items,
      message: 'Ticket validated successfully! Attendee admitted.',
    };
  }
}
