import { Router } from 'express';
import { AuthController } from './auth.controller';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationEmailSchema,
  sendPhoneOtpSchema,
  verifyPhoneSchema,
} from './auth.schemas';
import { validateBody } from '../../shared/middleware/validate';
import { authenticate } from './auth.middleware';

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

// Phone OTP verification endpoints (authenticated)
router.post('/send-phone-otp', authenticate, validateBody(sendPhoneOtpSchema), AuthController.sendPhoneOtp);
router.post('/verify-phone', authenticate, validateBody(verifyPhoneSchema), AuthController.verifyPhone);

export default router;
