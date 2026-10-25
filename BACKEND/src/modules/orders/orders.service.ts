import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';
import { CreateOrderInput, InitiatePaymentInput } from './orders.schemas';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentsService } from '../payments/payments.service';
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

          // Check for optional promo code discount
          let discountKes = 0;
          let promoCodeRecord: any = null;

          if (input.promoCode) {
            const normalizedCode = input.promoCode.trim().toUpperCase();
            const promo = await tx.promoCode.findFirst({
              where: {
                code: normalizedCode,
                OR: [{ eventId: input.eventId }, { eventId: null }],
              },
            });

            if (!promo) {
              throw new AppError(`Promo code '${normalizedCode}' is not valid for this event`, 404);
            }
            if (!promo.isActive) {
              throw new AppError(`Promo code '${normalizedCode}' is inactive or has been disabled`, 400);
            }
            if (promo.startsAt && promo.startsAt > now) {
              throw new AppError(`Promo code '${normalizedCode}' is not yet active`, 400);
            }
            if (promo.expiresAt && promo.expiresAt <= now) {
              throw new AppError(`Promo code '${normalizedCode}' has expired`, 400);
            }
            if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
              throw new AppError(`Promo code '${normalizedCode}' has reached its maximum total uses`, 400);
            }
            if (promo.minOrderKes && subtotalKes < promo.minOrderKes) {
              throw new AppError(
                `Promo code requires a minimum order subtotal of KES ${promo.minOrderKes.toLocaleString()}`,
                400
              );
            }
            if (promo.maxUsesPerCustomer) {
              const userUsageCount = await tx.promoCodeUsage.count({
                where: { promoCodeId: promo.id, userId },
              });
              if (userUsageCount >= promo.maxUsesPerCustomer) {
                throw new AppError(
                  `You have already used promo code '${normalizedCode}' the maximum allowed times`,
                  400
                );
              }
            }

            if (promo.discountType === 'PERCENTAGE') {
              discountKes = Math.round((subtotalKes * promo.discountValue) / 100);
            } else {
              discountKes = Math.min(promo.discountValue, subtotalKes);
            }
            discountKes = Math.min(discountKes, subtotalKes);
            promoCodeRecord = promo;
          }

          // Service Fee Calculation via PlatformConfig
          const config = await tx.platformConfig.findUnique({
            where: { id: 'default' },
          });

          const feePolicy = config?.serviceFeePolicy ?? 'CUSTOMER_SURCHARGE';
          let serviceFeeKes = 0;

          if (feePolicy === 'CUSTOMER_SURCHARGE' && subtotalKes > 0) {
            const feePercent = config?.serviceFeePercent ?? 0;
            const feeFixed = config?.serviceFeeFixedKes ?? 50;
            const discountedAmount = Math.max(0, subtotalKes - discountKes);
            serviceFeeKes = Math.round(discountedAmount * (feePercent / 100)) + feeFixed;
          }

          const totalKes = Math.max(0, subtotalKes - discountKes + serviceFeeKes);
          if (totalKes > 2_147_483_647) {
            throw new AppError('Order total exceeds the supported amount', 400);
          }
          const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

          return tx.order.create({
            data: {
              userId,
              eventId: input.eventId,
              subtotalKes,
              discountKes,
              serviceFeeKes,
              totalKes,
              promoCodeId: promoCodeRecord?.id ?? null,
              promoCodeSnapshot: promoCodeRecord?.code ?? null,
              discountTypeSnapshot: promoCodeRecord?.discountType ?? null,
              discountValueSnapshot: promoCodeRecord?.discountValue ?? null,
              influencerSnapshot: promoCodeRecord?.influencerName ?? null,
              expiresAt,
              items: { create: items },
            },
            include: { items: true, promoCode: true },
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
        event: {
          select: { id: true, title: true, slug: true, city: true, venue: true, startsAt: true },
        },
        promoCode: {
          select: { code: true, discountType: true, discountValue: true, influencerName: true },
        },
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            provider: true,
            reference: true,
            amountKes: true,
            currency: true,
            channel: true,
            customerEmail: true,
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
        event: {
          select: { id: true, title: true, slug: true, city: true, venue: true, startsAt: true },
        },
        promoCode: {
          select: { code: true, discountType: true, discountValue: true, influencerName: true },
        },
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            provider: true,
            reference: true,
            amountKes: true,
            currency: true,
            channel: true,
            customerEmail: true,
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
   * Delegates payment initialization to PaymentsService.
   */
  static async initiatePayment(orderId: string, userId: string, input?: InitiatePaymentInput) {
    return PaymentsService.initiateOrderPayment(orderId, userId, input);
  }

  /**
   * Client-side payment confirmation is never trusted; only verified provider callbacks/webhooks may mark an order paid.
   */
  static async confirmPayment(): Promise<never> {
    throw new AppError('Payment confirmation is unavailable until verified by provider webhook', 501);
  }

  /**
   * Validate QR Ticket check-in (for organizers / gate staff).
   */
  static async checkinTicket(qrCode: string, scannedByUserId: string) {
    return TicketsService.verifyAndCheckIn(qrCode, scannedByUserId);
  }
}

