import { Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types';

export class AnalyticsController {
  static async getOrganizerDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AnalyticsService.getOrganizerDashboardOverview(req.user!.userId);
      sendSuccess(res, data, 'Organizer dashboard analytics retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async getEventAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.eventId as string;
      const data = await AnalyticsService.getEventDetailedAnalytics(eventId, req.user!.userId, req.user!.role);
      sendSuccess(res, data, 'Event analytics retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async getAdminDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AnalyticsService.getAdminDashboardOverview();
      sendSuccess(res, data, 'Admin dashboard overview retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
