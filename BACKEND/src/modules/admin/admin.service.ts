import { prisma } from '../../shared/utils/prisma';
import { AppError } from '../../shared/errors/AppError';

export interface UpdatePlatformConfigInput {
  serviceFeePercent?: number;
  serviceFeeFixedKes?: number;
  serviceFeePolicy?: 'CUSTOMER_SURCHARGE' | 'ORGANIZER_ABSORBS';
}

export class AdminService {
  /**
   * Get platform fee configuration.
   */
  static async getPlatformConfig() {
    let config = await prisma.platformConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await prisma.platformConfig.create({
        data: {
          id: 'default',
          serviceFeePercent: 5.0,
          serviceFeeFixedKes: 50,
          serviceFeePolicy: 'CUSTOMER_SURCHARGE',
        },
      });
    }

    return config;
  }

  /**
   * Update platform fee configuration.
   */
  static async updatePlatformConfig(userId: string, input: UpdatePlatformConfigInput) {
    if (input.serviceFeePercent !== undefined && (input.serviceFeePercent < 0 || input.serviceFeePercent > 50)) {
      throw new AppError('Service fee percent must be between 0 and 50%', 400);
    }
    if (input.serviceFeeFixedKes !== undefined && input.serviceFeeFixedKes < 0) {
      throw new AppError('Fixed service fee must be 0 or greater', 400);
    }

    const updated = await prisma.platformConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        serviceFeePercent: input.serviceFeePercent ?? 5.0,
        serviceFeeFixedKes: input.serviceFeeFixedKes ?? 50,
        serviceFeePolicy: input.serviceFeePolicy ?? 'CUSTOMER_SURCHARGE',
        updatedByUserId: userId,
      },
      update: {
        serviceFeePercent: input.serviceFeePercent !== undefined ? input.serviceFeePercent : undefined,
        serviceFeeFixedKes: input.serviceFeeFixedKes !== undefined ? input.serviceFeeFixedKes : undefined,
        serviceFeePolicy: input.serviceFeePolicy !== undefined ? input.serviceFeePolicy : undefined,
        updatedByUserId: userId,
      },
    });

    return updated;
  }

  /**
   * List platform users with filter.
   */
  static async listUsers(page = 1, limit = 50, role?: string, search?: string) {
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          _count: { select: { orders: true, events: true } },
        },
      }),
    ]);

    return {
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
