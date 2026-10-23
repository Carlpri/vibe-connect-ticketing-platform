import { z } from 'zod';
import { normalizePhoneNumber } from '../../shared/utils/phone';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return normalizePhoneNumber(val).isValid;
      },
      {
        message: 'Invalid phone number format. Please provide a valid phone number (e.g. 0712345678 or +254712345678)',
      }
    ),
  role: z.enum(['ATTENDEE', 'ORGANIZER']).default('ATTENDEE'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationEmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const sendPhoneOtpSchema = z.object({
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return normalizePhoneNumber(val).isValid;
      },
      {
        message: 'Invalid phone number format. Please provide a valid Kenyan number (e.g. 0712345678)',
      }
    ),
});

export const verifyPhoneSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, 'Verification code must be a 6-digit numeric OTP'),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationEmailInput = z.infer<typeof resendVerificationEmailSchema>;
export type SendPhoneOtpInput = z.infer<typeof sendPhoneOtpSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;
