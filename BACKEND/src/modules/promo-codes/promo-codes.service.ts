import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';
import { CreatePromoCodeInput, UpdatePromoCodeInput, ListPromoCodesQuery } from './promo-codes.schemas';

export class PromoCodesService {
  /**
   * Create a new promo code. Organizers can create codes for their events; Admins can create platform or event codes.
   */
  static async createPromoCode(userId: string, role: string, data: CreatePromoCodeInput) {
    if (data.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: data.eventId },
        select: { id: true, organizerId: true },
      });
      if (!event) {
        throw new AppError('Event not found', 404);
      }
      if (role !== 'ADMIN' && event.organizerId !== userId) {
        throw new AppError('Forbidden: You can only create promo codes for your own events', 403);
      }
    } else if (role !== 'ADMIN') {
      throw new AppError('Only administrators can create platform-wide promo codes', 403);
    }

    const existing = await prisma.promoCode.findFirst({
      where: {
        code: data.code,
        eventId: data.eventId ?? null,
      },
    });

    if (existing) {
      throw new AppError(`Promo code '${data.code}' already exists for this scope`, 409);
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: data.code,
        eventId: data.eventId ?? null,
        createdByUserId: userId,
        influencerName: data.influencerName ?? null,
        influencerEmail: data.influencerEmail ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        startsAt: data.startsAt ?? null,
        expiresAt: data.expiresAt ?? null,
        maxUses: data.maxUses ?? null,
        maxUsesPerCustomer: data.maxUsesPerCustomer ?? 1,
        minOrderKes: data.minOrderKes ?? 0,
        isActive: data.isActive,
        notes: data.notes ?? null,
      },
      include: {
        event: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    return promoCode;
  }

  /**
   * List promo codes with usage and attribution metrics.
   */
  static async listPromoCodes(userId: string, role: string, query: ListPromoCodesQuery) {
    const where: any = {};

    if (role !== 'ADMIN') {
      where.OR = [
        { createdByUserId: userId },
        { event: { organizerId: userId } },
      ];
    }

    if (query.eventId) {
      where.eventId = query.eventId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { influencerName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [total, codes] = await Promise.all([
      prisma.promoCode.count({ where }),
      prisma.promoCode.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: { id: true, title: true, slug: true },
          },
          _count: {
            select: { usages: true, orders: true },
          },
        },
      }),
    ]);

    // Attach aggregated revenue and discount totals
    const codesWithStats = await Promise.all(
      codes.map(async (code) => {
        const usageStats = await prisma.promoCodeUsage.aggregate({
          where: { promoCodeId: code.id },
          _sum: { discountKes: true },
        });

        const orderStats = await prisma.order.aggregate({
          where: { promoCodeId: code.id, status: 'PAID' },
          _sum: { totalKes: true, subtotalKes: true },
          _count: { id: true },
        });

        return {
          ...code,
          stats: {
            totalUsages: code.currentUses,
            paidOrdersCount: orderStats._count.id,
            totalDiscountGivenKes: usageStats._sum.discountKes || 0,
            grossSalesGeneratedKes: orderStats._sum.subtotalKes || 0,
            netRevenueAfterDiscountKes: orderStats._sum.totalKes || 0,
          },
        };
      })
    );

    return {
      items: codesWithStats,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Get single promo code by ID with full usage history.
   */
  static async getPromoCodeById(id: string, userId: string, role: string) {
    const code = await prisma.promoCode.findUnique({
      where: { id },
      include: {
        event: {
          select: { id: true, title: true, slug: true, organizerId: true },
        },
        usages: {
          include: {
            order: {
              select: {
                id: true,
                totalKes: true,
                subtotalKes: true,
                status: true,
                createdAt: true,
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!code) {
      throw new AppError('Promo code not found', 404);
    }

    if (role !== 'ADMIN' && code.createdByUserId !== userId && code.event?.organizerId !== userId) {
      throw new AppError('Forbidden: Access denied to this promo code', 403);
    }

    return code;
  }

  /**
   * Update promo code.
   */
  static async updatePromoCode(id: string, userId: string, role: string, data: UpdatePromoCodeInput) {
    const existing = await prisma.promoCode.findUnique({
      where: { id },
      include: { event: { select: { organizerId: true } } },
    });

    if (!existing) {
      throw new AppError('Promo code not found', 404);
    }

    if (role !== 'ADMIN' && existing.createdByUserId !== userId && existing.event?.organizerId !== userId) {
      throw new AppError('Forbidden: You can only edit your own promo codes', 403);
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        influencerName: data.influencerName !== undefined ? data.influencerName : existing.influencerName,
        influencerEmail: data.influencerEmail !== undefined ? data.influencerEmail : existing.influencerEmail,
        discountType: data.discountType ?? existing.discountType,
        discountValue: data.discountValue ?? existing.discountValue,
        startsAt: data.startsAt !== undefined ? data.startsAt : existing.startsAt,
        expiresAt: data.expiresAt !== undefined ? data.expiresAt : existing.expiresAt,
        maxUses: data.maxUses !== undefined ? data.maxUses : existing.maxUses,
        maxUsesPerCustomer: data.maxUsesPerCustomer !== undefined ? data.maxUsesPerCustomer : existing.maxUsesPerCustomer,
        minOrderKes: data.minOrderKes !== undefined ? data.minOrderKes : existing.minOrderKes,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        notes: data.notes !== undefined ? data.notes : existing.notes,
      },
      include: {
        event: { select: { id: true, title: true } },
      },
    });

    return updated;
  }

  /**
   * Delete or deactivate promo code.
   */
  static async deletePromoCode(id: string, userId: string, role: string) {
    const existing = await prisma.promoCode.findUnique({
      where: { id },
      include: { event: { select: { organizerId: true } } },
    });

    if (!existing) {
      throw new AppError('Promo code not found', 404);
    }

    if (role !== 'ADMIN' && existing.createdByUserId !== userId && existing.event?.organizerId !== userId) {
      throw new AppError('Forbidden: You can only delete your own promo codes', 403);
    }

    if (existing.currentUses > 0) {
      // Deactivate instead of hard delete to preserve historical reporting
      return prisma.promoCode.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.promoCode.delete({ where: { id } });
  }

  /**
   * Validate a promo code against an event subtotal.
   * Can be invoked public/checkout or internal during order creation.
   */
  static async validateCodeForOrder(codeStr: string, eventId: string, subtotalKes: number, userId?: string) {
    const normalizedCode = codeStr.trim().toUpperCase();
    const now = new Date();

    const promoCode = await prisma.promoCode.findFirst({
      where: {
        code: normalizedCode,
        OR: [
          { eventId: eventId },
          { eventId: null }, // Platform-wide codes
        ],
      },
    });

    if (!promoCode) {
      throw new AppError(`Promo code '${normalizedCode}' is not valid for this event`, 404);
    }

    if (!promoCode.isActive) {
      throw new AppError(`Promo code '${normalizedCode}' is inactive or has been disabled`, 400);
    }

    if (promoCode.startsAt && promoCode.startsAt > now) {
      throw new AppError(`Promo code '${normalizedCode}' is not yet active`, 400);
    }

    if (promoCode.expiresAt && promoCode.expiresAt <= now) {
      throw new AppError(`Promo code '${normalizedCode}' has expired`, 400);
    }

    if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
      throw new AppError(`Promo code '${normalizedCode}' has reached its maximum total uses`, 400);
    }

    if (promoCode.minOrderKes && subtotalKes < promoCode.minOrderKes) {
      throw new AppError(
        `This promo code requires a minimum order subtotal of KES ${promoCode.minOrderKes.toLocaleString()}`,
        400
      );
    }

    if (userId && promoCode.maxUsesPerCustomer) {
      const userUsageCount = await prisma.promoCodeUsage.count({
        where: {
          promoCodeId: promoCode.id,
          userId,
        },
      });

      if (userUsageCount >= promoCode.maxUsesPerCustomer) {
        throw new AppError(
          `You have already used this promo code the maximum allowed number of times (${promoCode.maxUsesPerCustomer})`,
          400
        );
      }
    }

    // Calculate discount amount
    let discountKes = 0;
    if (promoCode.discountType === 'PERCENTAGE') {
      discountKes = Math.round((subtotalKes * promoCode.discountValue) / 100);
    } else {
      discountKes = Math.min(promoCode.discountValue, subtotalKes);
    }

    // Discount cannot exceed subtotal
    discountKes = Math.min(discountKes, subtotalKes);
    const netSubtotalKes = Math.max(0, subtotalKes - discountKes);

    return {
      valid: true,
      promoCodeId: promoCode.id,
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      influencerName: promoCode.influencerName,
      discountKes,
      subtotalKes,
      netSubtotalKes,
      message: `Promo code '${promoCode.code}' applied: KES ${discountKes.toLocaleString()} off!`,
    };
  }

  /**
   * Aggregate influencer marketing performance report.
   */
  static async getInfluencerAttribution(userId: string, role: string, eventId?: string) {
    const where: any = {
      influencerName: { not: null },
    };

    if (role !== 'ADMIN') {
      where.OR = [
        { createdByUserId: userId },
        { event: { organizerId: userId } },
      ];
    }

    if (eventId) {
      where.eventId = eventId;
    }

    const promoCodes = await prisma.promoCode.findMany({
      where,
      include: {
        event: { select: { id: true, title: true } },
        usages: {
          include: {
            order: {
              select: {
                id: true,
                totalKes: true,
                subtotalKes: true,
                status: true,
                items: { select: { quantity: true } },
              },
            },
          },
        },
      },
    });

    const influencerStats = promoCodes.map((code) => {
      const paidUsages = code.usages.filter((u) => u.order.status === 'PAID');
      const totalTicketsSold = paidUsages.reduce(
        (sum, u) => sum + u.order.items.reduce((iSum, item) => iSum + item.quantity, 0),
        0
      );
      const totalGrossSales = paidUsages.reduce((sum, u) => sum + u.order.subtotalKes, 0);
      const totalDiscountGiven = paidUsages.reduce((sum, u) => sum + u.discountKes, 0);
      const netSales = paidUsages.reduce((sum, u) => sum + u.order.totalKes, 0);

      return {
        id: code.id,
        code: code.code,
        influencerName: code.influencerName,
        influencerEmail: code.influencerEmail,
        eventTitle: code.event?.title ?? 'Platform Wide',
        eventId: code.eventId,
        discountType: code.discountType,
        discountValue: code.discountValue,
        isActive: code.isActive,
        currentUses: code.currentUses,
        paidOrdersCount: paidUsages.length,
        totalTicketsSold,
        totalGrossSalesKes: totalGrossSales,
        totalDiscountGivenKes: totalDiscountGiven,
        netRevenueGeneratedKes: netSales,
      };
    });

    return influencerStats;
  }
}
