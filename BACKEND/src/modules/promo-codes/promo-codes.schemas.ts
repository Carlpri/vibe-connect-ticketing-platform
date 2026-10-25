import { z } from 'zod';

export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Promo code must be at least 3 characters')
    .max(30, 'Promo code cannot exceed 30 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Promo code can only contain letters, numbers, hyphens, and underscores')
    .transform((val) => val.toUpperCase()),
  eventId: z.string().uuid('Invalid event ID').optional().nullable(),
  influencerName: z.string().trim().max(100).optional().nullable(),
  influencerEmail: z.string().email('Invalid influencer email').optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discountValue: z.number().int().positive('Discount value must be greater than 0'),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  maxUsesPerCustomer: z.number().int().positive().default(1).optional().nullable(),
  minOrderKes: z.number().int().min(0).default(0).optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(500).optional().nullable(),
}).refine(
  (data) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discountValue'],
  }
).refine(
  (data) => {
    if (data.startsAt && data.expiresAt && data.startsAt >= data.expiresAt) {
      return false;
    }
    return true;
  },
  {
    message: 'Start date must be before expiration date',
    path: ['expiresAt'],
  }
);

export const updatePromoCodeSchema = z.object({
  influencerName: z.string().trim().max(100).optional().nullable(),
  influencerEmail: z.string().email().optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().int().positive().optional(),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  maxUsesPerCustomer: z.number().int().positive().optional().nullable(),
  minOrderKes: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const validatePromoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Promo code is required')
    .transform((val) => val.toUpperCase()),
  eventId: z.string().uuid('Invalid event ID'),
  subtotalKes: z.number().int().min(0, 'Subtotal must be non-negative'),
});

export const listPromoCodesQuerySchema = z.object({
  eventId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>;
export type ListPromoCodesQuery = z.infer<typeof listPromoCodesQuerySchema>;
