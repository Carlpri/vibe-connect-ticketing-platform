import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Application & Frontend URLs
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Email Provider (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('VIBE-CONNECT <onboarding@resend.dev>'),
  EMAIL_VERIFICATION_EXPIRES_MINUTES: z.string().transform(Number).default('30'),
  EMAIL_RESEND_COOLDOWN_SECONDS: z.string().transform(Number).default('60'),

  // SMS Provider (Africa's Talking)
  AFRICASTALKING_API_KEY: z.string().optional(),
  AFRICASTALKING_USERNAME: z.string().optional(),
  AFRICASTALKING_SENDER_ID: z.string().optional(),
  OTP_EXPIRATION_MINUTES: z.string().transform(Number).default('5'),
  OTP_MAX_ATTEMPTS: z.string().transform(Number).default('5'),
  OTP_RESEND_COOLDOWN_SECONDS: z.string().transform(Number).default('60'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Warning: Some environment variables are missing or using defaults:');
  console.warn(parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: Number(process.env.PORT) || 3000,
      DATABASE_URL: process.env.DATABASE_URL || '',
      DIRECT_URL: process.env.DIRECT_URL || '',
      JWT_SECRET: process.env.JWT_SECRET || 'vibe-connect-default-secret-key-change-in-production',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM || 'VIBE-CONNECT <onboarding@resend.dev>',
      EMAIL_VERIFICATION_EXPIRES_MINUTES: Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES) || 30,
      EMAIL_RESEND_COOLDOWN_SECONDS: Number(process.env.EMAIL_RESEND_COOLDOWN_SECONDS) || 60,
      AFRICASTALKING_API_KEY: process.env.AFRICASTALKING_API_KEY,
      AFRICASTALKING_USERNAME: process.env.AFRICASTALKING_USERNAME,
      AFRICASTALKING_SENDER_ID: process.env.AFRICASTALKING_SENDER_ID,
      OTP_EXPIRATION_MINUTES: Number(process.env.OTP_EXPIRATION_MINUTES) || 5,
      OTP_MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
      OTP_RESEND_COOLDOWN_SECONDS: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
    };
