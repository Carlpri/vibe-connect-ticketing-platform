import { Response, NextFunction } from 'express';
import { OrdersService } from './orders.service';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types';

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
        req.body.phoneNumber
      );
      sendSuccess(res, result, result.message, 200);
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
      const order = await OrdersService.confirmPayment(
        req.params.id as string,
        req.user!.userId,
        req.body?.mpesaReceiptNumber
      );
      sendSuccess(res, order, 'Payment confirmed and tickets issued successfully', 200);
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
      const result = await OrdersService.checkinTicket(req.body.qrCode);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }
}
