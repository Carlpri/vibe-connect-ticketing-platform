import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { normalizePhoneNumber } from '../shared/utils/phone';

const prisma = new PrismaClient();

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assertProductionTarget(): void {
  if (process.env.NODE_ENV !== 'production' || process.env.ADMIN_SEED_TARGET !== 'production') {
    throw new Error('Admin seeding is allowed only for an explicitly selected production target.');
  }

  const databaseUrl = requiredEnv('DATABASE_URL');
  const expectedHost = requiredEnv('ADMIN_SEED_EXPECTED_DATABASE_HOST').toLowerCase();
  const expectedDatabase = requiredEnv('ADMIN_SEED_EXPECTED_DATABASE_NAME');
  const parsedUrl = new URL(databaseUrl);

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new Error('Admin seeding requires a PostgreSQL database.');
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
  if (parsedUrl.hostname.toLowerCase() !== expectedHost || databaseName !== expectedDatabase) {
    throw new Error('The configured database does not match the explicitly confirmed production host and database name.');
  }
}

async function seedAdmin(): Promise<'created' | 'promoted'> {
  assertProductionTarget();

  const email = requiredEnv('ADMIN_SEED_EMAIL').toLowerCase();
  const normalizedPhone = normalizePhoneNumber(requiredEnv('ADMIN_SEED_PHONE'));
  if (!normalizedPhone.isValid || !normalizedPhone.e164) {
    throw new Error('The supplied admin phone number is invalid.');
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
      select: { id: true, phone: true },
    });
    const phoneOwner = await tx.user.findUnique({
      where: { phone: normalizedPhone.e164 },
      select: { id: true },
    });

    if (phoneOwner && phoneOwner.id !== existing?.id) {
      throw new Error('The supplied phone number belongs to a different account.');
    }

    if (existing) {
      const phoneChanged = existing.phone !== normalizedPhone.e164;
      await tx.user.update({
        where: { id: existing.id },
        data: {
          role: 'ADMIN',
          phone: normalizedPhone.e164,
          ...(phoneChanged
            ? {
                phoneVerified: false,
                phoneVerificationOtpHash: null,
                phoneVerificationExpiresAt: null,
                phoneVerificationAttempts: 0,
              }
            : {}),
        },
      });
      return 'promoted';
    }

    const name = requiredEnv('ADMIN_SEED_NAME');
    const password = requiredEnv('ADMIN_SEED_PASSWORD');
    if (password.length < 12) {
      throw new Error('A new admin password must contain at least 12 characters.');
    }

    await tx.user.create({
      data: {
        email,
        name,
        phone: normalizedPhone.e164,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
        emailVerified: false,
        phoneVerified: false,
      },
    });
    return 'created';
  });
}

seedAdmin()
  .then(async (result) => {
    console.info(
      result === 'created'
        ? 'Admin account created. Email and phone remain unverified.'
        : 'Existing account promoted to admin. Password and email verification status were preserved.'
    );
  })
  .catch((error: unknown) => {
    console.error(
      'Admin seed failed:',
      error instanceof Error ? error.message : 'Unexpected error'
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
