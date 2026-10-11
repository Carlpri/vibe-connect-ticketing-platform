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
    };
