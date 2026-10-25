import { Response, NextFunction } from 'express';
import { PromoCodesService } from './promo-codes.service';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types';

export class PromoCodesController {
  static async createPromoCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PromoCodesService.createPromoCode(req.user!.userId, req.user!.role, req.body);
      sendSuccess(res, result, 'Promo code created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listPromoCodes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PromoCodesService.listPromoCodes(req.user!.userId, req.user!.role, req.query as any);
      sendSuccess(res, result, 'Promo codes retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async getPromoCodeById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await PromoCodesService.getPromoCodeById(id, req.user!.userId, req.user!.role);
      sendSuccess(res, result, 'Promo code retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async updatePromoCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await PromoCodesService.updatePromoCode(id, req.user!.userId, req.user!.role, req.body);
      sendSuccess(res, result, 'Promo code updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async deletePromoCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await PromoCodesService.deletePromoCode(id, req.user!.userId, req.user!.role);
      sendSuccess(res, result, 'Promo code deleted or deactivated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async validatePromoCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, eventId, subtotalKes } = req.body;
      const result = await PromoCodesService.validateCodeForOrder(
        code,
        eventId,
        subtotalKes,
        req.user?.userId
      );
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getInfluencerAttribution(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.query.eventId as string | undefined;
      const result = await PromoCodesService.getInfluencerAttribution(
        req.user!.userId,
        req.user!.role,
        eventId
      );
      sendSuccess(res, result, 'Influencer attribution data retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
