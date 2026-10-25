import { Response, NextFunction } from 'express';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types';
import { TicketsService } from './tickets.service';

export class TicketsController {
  /** GET /api/tickets/my — list attendee passes (QR only when email + phone verified). */
  static async getMyTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TicketsService.getMyTickets(req.user!.userId);
      sendSuccess(res, result, 'Tickets retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/tickets/order/:orderId — list tickets for one paid order (caller must own order). */
  static async getTicketsForOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TicketsService.getTicketsForOrder(
        req.params.orderId as string,
        req.user!.userId
      );
      sendSuccess(res, result, 'Order tickets retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/tickets/scan — organizer gate scanner. */
  static async scanTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TicketsService.verifyAndCheckIn(req.body.qrCode, req.user!.userId);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }
}

