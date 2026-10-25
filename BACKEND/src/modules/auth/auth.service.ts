import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/utils/prisma';
import { env } from '../../config/env';
import {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationEmailInput,
  SendPhoneOtpInput,
  VerifyPhoneInput,
} from './auth.schemas';
import { TokenPayload, UserRole } from '../../shared/types';
import { AppError } from '../../shared/errors/AppError';
import {
  generateSecureToken,
  generateSecureOtp,
  hashVerificationCode,
  timingSafeMatch,
} from '../../shared/utils/crypto';
import { normalizePhoneNumber } from '../../shared/utils/phone';
import { EmailService } from '../../shared/services/email.service';
import { SmsService } from '../../shared/services/sms.service';
import { logger } from '../../shared/utils/logger';

export class AuthService {
  /**
   * Registers a new user with unverified email and phone flags.
   * Generates and dispatches an initial email verification token.
   */
  static async register(input: RegisterInput) {
    const email = input.email.toLowerCase();

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new AppError('An account with this email already exists', 409);
    }

    let normalizedPhone: string | null = null;
    if (input.phone) {
      const phoneValidation = normalizePhoneNumber(input.phone);
      if (!phoneValidation.isValid) {
        throw new AppError(phoneValidation.error || 'Invalid phone number', 400);
      }
      normalizedPhone = phoneValidation.e164!;

      const existingPhone = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingPhone) {
        throw new AppError('An account with this phone number already exists', 409);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    // Generate initial email verification token
    const rawEmailToken = generateSecureToken(32);
    const emailVerificationTokenHash = hashVerificationCode(rawEmailToken);
    const emailVerificationExpiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000);
    const emailVerificationCooldownUntil = new Date(Date.now() + env.EMAIL_RESEND_COOLDOWN_SECONDS * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name,
        phone: normalizedPhone,
        role: input.role as UserRole,
        organizerApplicationStatus: input.role === 'ORGANIZER' ? 'PENDING' : 'NONE',
        emailVerified: false,
        phoneVerified: false,
        emailVerificationTokenHash,
        emailVerificationExpiresAt,
        emailVerificationCooldownUntil,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        organizerApplicationStatus: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    // Send verification email asynchronously
    const emailResult = await EmailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: rawEmailToken,
    });

    if (!emailResult.success) {
      logger.warn(`Could not dispatch verification email during registration for ${user.email}`, {
        category: 'REGISTRATION_EMAIL_FAILED',
        error: emailResult.error,
      });
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    const verificationUrl = EmailService.getVerificationUrl(rawEmailToken);

    return {
      user,
      token,
      verificationEmailSent: emailResult.success,
      verificationUrl: emailResult.isMocked || env.NODE_ENV !== 'production' ? verificationUrl : undefined,
    };
  }

  /**
   * Authenticates user via email and password.
   */
  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        organizerApplicationStatus: user.organizerApplicationStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Fetches fresh user profile with verification flags.
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        organizerApplicationStatus: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  static async listPendingOrganizerApplications() {
    return prisma.user.findMany({
      where: { organizerApplicationStatus: 'PENDING' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async reviewOrganizerApplication(userId: string, decision: 'APPROVED' | 'REJECTED') {
    const update = await prisma.user.updateMany({
      where: { id: userId, organizerApplicationStatus: 'PENDING' },
      data: {
        role: decision === 'APPROVED' ? 'ORGANIZER' : 'ATTENDEE',
        organizerApplicationStatus: decision,
      },
    });

    if (update.count === 0) {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!userExists) throw new AppError('Organizer application not found', 404);
      throw new AppError('Organizer application is no longer pending', 409);
    }

    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizerApplicationStatus: true,
      },
    });
  }

  /**
   * Verifies an email address using a hashed single-use verification token.
   */
  static async verifyEmail(input: VerifyEmailInput) {
    const hashedToken = hashVerificationCode(input.token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationTokenHash: hashedToken,
        emailVerificationExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    // Atomic update to prevent concurrent replay
    const updateResult = await prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerificationTokenHash: hashedToken,
      },
      data: {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationCooldownUntil: null,
      },
    });

    if (updateResult.count === 0) {
      throw new AppError('Verification token has already been used', 400);
    }

    return {
      emailVerified: true,
      email: user.email,
    };
  }

  /**
   * Resends an email verification link with rate limiting and cooldown.
   */
  static async resendVerificationEmail(input: ResendVerificationEmailInput) {
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent account enumeration, return generic message if user not found or already verified
    if (!user || user.emailVerified) {
      return {
        sent: false,
        message: 'If an unverified account exists with that email address, a verification link has been sent.',
      };
    }

    // Check resend cooldown
    if (user.emailVerificationCooldownUntil && user.emailVerificationCooldownUntil > new Date()) {
      const waitSeconds = Math.ceil((user.emailVerificationCooldownUntil.getTime() - Date.now()) / 1000);
      throw new AppError(`Please wait ${waitSeconds} second(s) before requesting another verification email`, 429);
    }

    const rawToken = generateSecureToken(32);
    const emailVerificationTokenHash = hashVerificationCode(rawToken);
    const emailVerificationExpiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000);
    const emailVerificationCooldownUntil = new Date(Date.now() + env.EMAIL_RESEND_COOLDOWN_SECONDS * 1000);

    // Invalidate previous token and set new one
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationTokenHash,
        emailVerificationExpiresAt,
        emailVerificationCooldownUntil,
      },
    });

    const emailResult = await EmailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: rawToken,
      redirectUrl: input.redirectUrl,
      origin: input.origin,
    });

    if (!emailResult.success) {
      throw new AppError('Failed to send verification email. Please try again later.', 502);
    }

    const verificationUrl = EmailService.getVerificationUrl(rawToken, input.redirectUrl, input.origin);

    return {
      sent: true,
      message: emailResult.isMocked
        ? 'Verification link generated.'
        : 'Verification email sent successfully.',
      verificationUrl: emailResult.isMocked || env.NODE_ENV !== 'production' ? verificationUrl : undefined,
    };

  }

  /**
   * Generates and dispatches a 6-digit SMS OTP to verify a phone number.
   */
  static async sendPhoneOtp(userId: string, input: SendPhoneOtpInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    let targetPhone = user.phone;

    // If new or updated phone provided
    if (input.phone) {
      const phoneValidation = normalizePhoneNumber(input.phone);
      if (!phoneValidation.isValid) {
        throw new AppError(phoneValidation.error || 'Invalid phone number format', 400);
      }
      targetPhone = phoneValidation.e164!;

      // Ensure another user is not using this phone number
      const existing = await prisma.user.findFirst({
        where: {
          phone: targetPhone,
          id: { not: userId },
        },
      });

      if (existing) {
        throw new AppError('This phone number is already registered to another account', 409);
      }
    }

    if (!targetPhone) {
      throw new AppError('No phone number provided. Please submit a valid phone number to verify.', 400);
    }

    // Check resend cooldown
    if (user.phoneVerificationCooldownUntil && user.phoneVerificationCooldownUntil > new Date()) {
      const waitSeconds = Math.ceil((user.phoneVerificationCooldownUntil.getTime() - Date.now()) / 1000);
      throw new AppError(`Please wait ${waitSeconds} second(s) before requesting another OTP`, 429);
    }

    const rawOtp = generateSecureOtp();
    const phoneVerificationOtpHash = hashVerificationCode(rawOtp);
    const phoneVerificationExpiresAt = new Date(Date.now() + env.OTP_EXPIRATION_MINUTES * 60 * 1000);
    const phoneVerificationCooldownUntil = new Date(Date.now() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000);

    const isPhoneChanged = user.phone !== targetPhone;

    // Invalidate previous OTP, reset attempt count, update cooldown and phone if changed
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: targetPhone,
        ...(isPhoneChanged ? { phoneVerified: false } : {}),
        phoneVerificationOtpHash,
        phoneVerificationExpiresAt,
        phoneVerificationAttempts: 0,
        phoneVerificationCooldownUntil,
      },
    });

    const smsResult = await SmsService.sendOtpSms(targetPhone, rawOtp, env.OTP_EXPIRATION_MINUTES);

    if (!smsResult.success) {
      throw new AppError('Failed to send SMS OTP. Please try again later.', 502);
    }

    return {
      phone: targetPhone,
      expiresInMinutes: env.OTP_EXPIRATION_MINUTES,
    };
  }

  /**
   * Validates submitted OTP code against stored hash, enforcing expiration and attempt limits.
   */
  static async verifyPhone(userId: string, input: VerifyPhoneInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.phoneVerificationOtpHash || !user.phoneVerificationExpiresAt) {
      throw new AppError('No pending phone verification found. Please request a new OTP.', 400);
    }

    // Check expiration
    if (user.phoneVerificationExpiresAt < new Date()) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerificationOtpHash: null,
          phoneVerificationExpiresAt: null,
        },
      });
      throw new AppError('Verification code has expired. Please request a new OTP.', 400);
    }

    // Check failed attempts limit
    if (user.phoneVerificationAttempts >= env.OTP_MAX_ATTEMPTS) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerificationOtpHash: null,
          phoneVerificationExpiresAt: null,
        },
      });
      throw new AppError(
        'Too many failed attempts. This verification code is no longer valid. Please request a new one.',
        400
      );
    }

    const submittedHash = hashVerificationCode(input.code);
    const isMatch = timingSafeMatch(submittedHash, user.phoneVerificationOtpHash);

    if (!isMatch) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerificationAttempts: {
            increment: 1,
          },
        },
      });

      const remainingAttempts = Math.max(0, env.OTP_MAX_ATTEMPTS - updatedUser.phoneVerificationAttempts);
      throw new AppError(
        remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
          : 'Too many failed attempts. This verification code has been invalidated. Please request a new one.',
        400
      );
    }

    // Success: Mark phone verified, clear OTP data
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerificationOtpHash: null,
        phoneVerificationExpiresAt: null,
        phoneVerificationAttempts: 0,
        phoneVerificationCooldownUntil: null,
      },
    });

    return {
      phoneVerified: true,
      phone: user.phone,
    };
  }

  private static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }
}
