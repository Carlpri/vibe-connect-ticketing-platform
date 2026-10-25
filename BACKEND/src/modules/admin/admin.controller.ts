import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types';

export class AdminController {
  static async getPlatformConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await AdminService.getPlatformConfig();
      sendSuccess(res, config, 'Platform configuration retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async updatePlatformConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await AdminService.updatePlatformConfig(req.user!.userId, req.body);
      sendSuccess(res, config, 'Platform configuration updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const role = req.query.role as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await AdminService.listUsers(page, limit, role, search);
      sendSuccess(res, result, 'Platform users retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
