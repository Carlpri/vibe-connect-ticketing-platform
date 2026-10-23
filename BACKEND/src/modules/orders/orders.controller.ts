import { Response, NextFunction, Request } from 'express';
import { OrdersService } from './orders.service';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types';
import { mpesaCallbackSchema } from './orders.schemas';
import { AppError } from '../../shared/errors/AppError';
import { MpesaService } from './mpesa.service';

export class OrdersController {
  /**
   * POST /api/orders
   * Requires: authenticate + requireFullyVerified
   */
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrdersService.createOrder(req.user!.userId, req.body);
      sendSuccess(res, order, 'Order created successfully. 15-minute reservation started.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders/my
   * Requires: authenticate
   */
  static async getMyOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await OrdersService.getMyOrders(req.user!.userId);
      sendSuccess(res, orders, 'Orders retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders/:id
   * Requires: authenticate
   */
  static async getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrdersService.getOrderById(req.params.id as string, req.user!.userId);
      sendSuccess(res, order, 'Order details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/pay
   * Requires: authenticate
   */
  static async initiatePayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await OrdersService.initiatePayment(
        req.params.id as string,
        req.user!.userId,
        req.body
      );
      sendSuccess(res, result, result.message, 202);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/mpesa/callback
   * Daraja webhook; payment is only finalized after provider status verification.
   */
  static async mpesaCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = mpesaCallbackSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('Invalid M-Pesa callback payload', 400);
      }
      await OrdersService.processMpesaCallback(parsed.data);
      res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      next(error);
    }
  }

  static async verifyMpesaSandbox(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await MpesaService.verifySandboxAuthentication();
      sendSuccess(res, { authenticated: true }, 'Daraja Sandbox authentication successful', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/confirm-payment
   * Requires: authenticate
   */
  static async confirmPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await OrdersService.confirmPayment();
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/orders/checkin
   * Requires: authenticate (Organizer or Admin check-in scanner)
   */
  static async checkinTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await OrdersService.checkinTicket(req.body.qrCode, req.user!.userId);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }
}
