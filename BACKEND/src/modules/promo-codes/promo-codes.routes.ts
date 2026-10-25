import { Router } from 'express';
import { authenticate, optionalAuthenticate, requireRole } from '../auth/auth.middleware';
import { validateBody, validateQuery } from '../../shared/middleware/validate';
import { PromoCodesController } from './promo-codes.controller';
import {
  createPromoCodeSchema,
  updatePromoCodeSchema,
  validatePromoCodeSchema,
  listPromoCodesQuerySchema,
} from './promo-codes.schemas';

const router = Router();

// Validate promo code at checkout (supports both logged-in users and guests)
router.post(
  '/validate',
  optionalAuthenticate,
  validateBody(validatePromoCodeSchema),
  PromoCodesController.validatePromoCode
);

// Influencer sales attribution report
router.get(
  '/influencers/attribution',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  PromoCodesController.getInfluencerAttribution
);

// List promo codes
router.get(
  '/',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateQuery(listPromoCodesQuerySchema),
  PromoCodesController.listPromoCodes
);

// Create promo code
router.post(
  '/',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateBody(createPromoCodeSchema),
  PromoCodesController.createPromoCode
);

// Get single promo code
router.get(
  '/:id',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  PromoCodesController.getPromoCodeById
);

// Update promo code
router.patch(
  '/:id',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  validateBody(updatePromoCodeSchema),
  PromoCodesController.updatePromoCode
);

// Delete / deactivate promo code
router.delete(
  '/:id',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  PromoCodesController.deletePromoCode
);

export default router;
