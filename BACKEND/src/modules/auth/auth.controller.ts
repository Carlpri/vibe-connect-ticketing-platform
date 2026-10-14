import { Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../shared/types';

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      sendSuccess(res, result, 'User registered successfully. Please verify your email.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getCurrentUser(req.user!.userId);
      sendSuccess(res, user, 'User profile fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.verifyEmail(req.body);
      sendSuccess(res, result, 'Email verified successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async resendVerificationEmail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resendVerificationEmail(req.body);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  static async sendPhoneOtp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.sendPhoneOtp(req.user!.userId, req.body);
      sendSuccess(res, result, 'Verification OTP sent successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async verifyPhone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.verifyPhone(req.user!.userId, req.body);
      sendSuccess(res, result, 'Phone number verified successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
