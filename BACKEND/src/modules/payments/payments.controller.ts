import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types';
import { AppError } from '../../shared/errors/AppError';

export class PaymentsController {
  /**
   * POST /api/payments/initialize/:orderId
   * Requires: authenticate
   */
  static async initializePayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = (req.params.orderId || req.body.orderId) as string;
      if (!orderId) {
        throw new AppError('Order ID is required', 400);
      }

      const result = await PaymentsService.initiateOrderPayment(
        orderId,
        req.user!.userId,
        req.body
      );
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/verify/:reference
   * Can be checked by the authenticated customer or checkout callback
   */
  static async verifyPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reference = ((req.params.reference || req.query.reference || req.query.trxref) as string)?.trim();
      if (!reference) {
        throw new AppError('Payment reference is required', 400);
      }

      const result = await PaymentsService.verifyAndFinalizePayment(reference, req.user?.userId);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/webhook
   * Paystack webhook endpoint
   */
  static async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string | undefined;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const result = await PaymentsService.handleWebhook(signature, rawBody);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/config
   * Safe public configuration (never exposes secret keys)
   */
  static getConfig(
    _req: Request,
    res: Response,
    next: NextFunction
  ): void {
    try {
      const config = PaymentsService.getPublicConfig();
      sendSuccess(res, config, 'Payment configuration retrieved', 200);
    } catch (error) {
      next(error);
    }
  }
}
