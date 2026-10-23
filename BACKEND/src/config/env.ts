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
  TICKET_QR_SECRET: z.string().optional(),

  // Application & Frontend URLs
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Safaricom Daraja M-Pesa Express
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_CALLBACK_URL: z.string().url().optional(),
  MPESA_TRANSACTION_TYPE: z.enum(['CustomerPayBillOnline', 'CustomerBuyGoodsOnline']).default('CustomerPayBillOnline'),

  // Email Provider (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('VIBE-CONNECT <onboarding@resend.dev>'),
  EMAIL_VERIFICATION_EXPIRES_MINUTES: z.string().transform(Number).default('30'),
  EMAIL_RESEND_COOLDOWN_SECONDS: z.string().transform(Number).default('60'),

  // SMS Provider (Africa's Talking)
  AT_API_KEY: z.string().optional(),
  AT_USERNAME: z.string().optional(),
  AT_SENDER_ID: z.string().optional(),
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

const configuredJwtSecret = process.env.JWT_SECRET?.trim();
if (
  process.env.NODE_ENV === 'production' &&
  (!configuredJwtSecret ||
    configuredJwtSecret.length < 32 ||
    configuredJwtSecret === 'vibe-connect-default-secret-key-change-in-production')
) {
  throw new Error('A strong JWT_SECRET of at least 32 characters is required in production');
}

const raw = parsed.success ? parsed.data : (process.env as any);

const atApiKey = raw.AT_API_KEY || raw.AFRICASTALKING_API_KEY;
const atUsername = raw.AT_USERNAME || raw.AFRICASTALKING_USERNAME;
const atSenderId = raw.AT_SENDER_ID || raw.AFRICASTALKING_SENDER_ID;

export const env = {
  NODE_ENV: (raw.NODE_ENV as any) || 'development',
  PORT: Number(raw.PORT) || 3000,
  DATABASE_URL: raw.DATABASE_URL || '',
  DIRECT_URL: raw.DIRECT_URL || '',
  JWT_SECRET: configuredJwtSecret || 'vibe-connect-default-secret-key-change-in-production',
  JWT_EXPIRES_IN: raw.JWT_EXPIRES_IN || '7d',
  TICKET_QR_SECRET: raw.TICKET_QR_SECRET || raw.JWT_SECRET || 'vibe-connect-default-secret-key-change-in-production',
  FRONTEND_URL: raw.FRONTEND_URL || 'http://localhost:5173',
  MPESA_ENV: raw.MPESA_ENV || 'sandbox',
  MPESA_CONSUMER_KEY: raw.MPESA_CONSUMER_KEY || '',
  MPESA_CONSUMER_SECRET: raw.MPESA_CONSUMER_SECRET || '',
  MPESA_SHORTCODE: raw.MPESA_SHORTCODE || '',
  MPESA_PASSKEY: raw.MPESA_PASSKEY || '',
  MPESA_CALLBACK_URL: raw.MPESA_CALLBACK_URL || '',
  MPESA_TRANSACTION_TYPE: raw.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',

  // Email Provider (Resend)
  RESEND_API_KEY: raw.RESEND_API_KEY,
  EMAIL_FROM: raw.EMAIL_FROM || 'VIBE-CONNECT <onboarding@resend.dev>',
  EMAIL_VERIFICATION_EXPIRES_MINUTES: Number(raw.EMAIL_VERIFICATION_EXPIRES_MINUTES) || 30,
  EMAIL_RESEND_COOLDOWN_SECONDS: Number(raw.EMAIL_RESEND_COOLDOWN_SECONDS) || 60,

  // SMS Provider (Africa's Talking) - Dual naming supported
  AT_API_KEY: atApiKey,
  AT_USERNAME: atUsername,
  AT_SENDER_ID: atSenderId,
  AFRICASTALKING_API_KEY: atApiKey,
  AFRICASTALKING_USERNAME: atUsername,
  AFRICASTALKING_SENDER_ID: atSenderId,

  OTP_EXPIRATION_MINUTES: Number(raw.OTP_EXPIRATION_MINUTES) || 5,
  OTP_MAX_ATTEMPTS: Number(raw.OTP_MAX_ATTEMPTS) || 5,
  OTP_RESEND_COOLDOWN_SECONDS: Number(raw.OTP_RESEND_COOLDOWN_SECONDS) || 60,
};
