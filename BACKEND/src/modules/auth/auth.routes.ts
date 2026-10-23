import { Router } from 'express';
import { AuthController } from './auth.controller';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationEmailSchema,
  sendPhoneOtpSchema,
  userIdParamSchema,
  verifyPhoneSchema,
} from './auth.schemas';
import { validateBody, validateParams } from '../../shared/middleware/validate';
import { authenticate, requireRole } from './auth.middleware';

const router = Router();

// -------------------------------------------------------------
// Public Endpoints
// -------------------------------------------------------------
router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);

// Email verification endpoints (public - token in body)
router.post('/verify-email', validateBody(verifyEmailSchema), AuthController.verifyEmail);
router.post(
  '/resend-verification-email',
  validateBody(resendVerificationEmailSchema),
  AuthController.resendVerificationEmail
);

// -------------------------------------------------------------
// Authenticated Endpoints
// -------------------------------------------------------------
router.get('/me', authenticate, AuthController.getMe);
router.get(
  '/organizer-requests',
  authenticate,
  requireRole('ADMIN'),
  AuthController.listPendingOrganizerApplications
);
router.post(
  '/organizer-requests/:userId/approve',
  authenticate,
  requireRole('ADMIN'),
  validateParams(userIdParamSchema),
  AuthController.approveOrganizerApplication
);
router.post(
  '/organizer-requests/:userId/reject',
  authenticate,
  requireRole('ADMIN'),
  validateParams(userIdParamSchema),
  AuthController.rejectOrganizerApplication
);

// Phone OTP verification endpoints (authenticated)
router.post('/send-phone-otp', authenticate, validateBody(sendPhoneOtpSchema), AuthController.sendPhoneOtp);
router.post('/verify-phone', authenticate, validateBody(verifyPhoneSchema), AuthController.verifyPhone);

export default router;
