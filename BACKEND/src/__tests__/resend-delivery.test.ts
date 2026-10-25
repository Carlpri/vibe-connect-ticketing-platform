import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  EmailService,
  ResendEmailProvider,
  MockEmailProvider,
  selectEmailProvider,
  type SendVerificationEmailParams,
} from '../shared/services/email.service';
import { prisma } from '../shared/utils/prisma';
import { hashVerificationCode, generateSecureToken } from '../shared/utils/crypto';
import { AuthService } from '../modules/auth/auth.service';

describe('Resend Email Delivery & Verification Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    EmailService.resetProvider();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    EmailService.resetProvider();
    process.env = { ...originalEnv };
  });

  describe('1. Recipient Selection & Parameter Binding', () => {
    it('binds recipient dynamically to the exact user email being verified', async () => {
      let passedRecipient: string[] | undefined;
      let passedSubject: string | undefined;
      let passedHtml: string | undefined;

      const mockResendClient: any = {
        emails: {
          send: async (payload: any) => {
            passedRecipient = payload.to;
            passedSubject = payload.subject;
            passedHtml = payload.html;
            return { data: { id: 're_test_msg_001' }, error: null };
          },
        },
      };

      const provider = new ResendEmailProvider('re_test_key_valid_12345', 'VIBE-CONNECT <noreply@vibe-connect.co.ke>', mockResendClient);
      const params: SendVerificationEmailParams = {
        to: 'customer.test@example.com',
        name: 'Jane Customer',
        token: 'test-secure-token-123',
        expiresInMinutes: 30,
      };

      const result = await provider.sendVerificationEmail(params, 'https://www.vibe-connect.co.ke/verify-email?token=test', '<p>Verify</p>');

      assert.equal(result.success, true);
      assert.deepEqual(passedRecipient, ['customer.test@example.com']);
      assert.equal(passedSubject, 'Verify your Vibe-Connect email');
      assert.ok(passedHtml?.includes('Verify'));
    });

    it('rejects invalid or empty recipient emails without calling the provider', async () => {
      let sendCalled = false;
      const mockResendClient: any = {
        emails: {
          send: async () => {
            sendCalled = true;
            return { data: { id: 'should_not_be_called' }, error: null };
          },
        },
      };

      const provider = new ResendEmailProvider('re_test_key_123', 'VIBE-CONNECT <noreply@vibe-connect.co.ke>', mockResendClient);
      const result = await provider.sendVerificationEmail(
        { to: 'not-an-email', name: 'Bad Email', token: 'xyz' },
        'https://www.vibe-connect.co.ke/verify',
        '<p>Test</p>'
      );

      assert.equal(result.success, false);
      assert.equal(sendCalled, false);
      assert.equal(result.error, 'Invalid recipient email address');
    });
  });

  describe('2. Provider Acceptance & Message ID Tracking', () => {
    it('returns success=true and records provider messageId when Resend accepts the email', async () => {
      const mockResendClient: any = {
        emails: {
          send: async () => {
            return {
              data: { id: 'msg_resend_prod_998877' },
              error: null,
            };
          },
        },
      };

      const provider = new ResendEmailProvider('re_test_key_123', 'VIBE-CONNECT <noreply@vibe-connect.co.ke>', mockResendClient);
      EmailService.setProvider(provider);

      const result = await EmailService.sendVerificationEmail({
        to: 'attendee@vibe-connect.co.ke',
        name: 'Attendee One',
        token: 'secure_tok_1',
      });

      assert.equal(result.success, true);
      assert.equal(result.provider, 'resend');
      assert.equal(result.messageId, 'msg_resend_prod_998877');
      assert.equal(result.isMocked, undefined);
    });
  });

  describe('3. Provider Rejection Handling', () => {
    it('handles Resend API rejection (e.g. unverified domain or rate limit) without reporting success', async () => {
      const mockResendClient: any = {
        emails: {
          send: async () => {
            return {
              data: null,
              error: {
                message: 'The domain vibe-connect.co.ke is not verified. Please verify your domain in Resend.',
                name: 'validation_error',
              },
            };
          },
        },
      };

      const provider = new ResendEmailProvider('re_test_key_123', 'VIBE-CONNECT <noreply@vibe-connect.co.ke>', mockResendClient);
      EmailService.setProvider(provider);

      const result = await EmailService.sendVerificationEmail({
        to: 'user@example.com',
        name: 'Test User',
        token: 'tok_reject',
      });

      assert.equal(result.success, false);
      assert.equal(result.provider, 'resend');
      assert.ok(result.error?.includes('not verified'));
      assert.equal(result.messageId, undefined);
    });
  });

  describe('4. Network Failure & Exception Handling', () => {
    it('handles network timeout or DNS failure gracefully without claiming delivery', async () => {
      const mockResendClient: any = {
        emails: {
          send: async () => {
            throw new Error('connect ECONNREFUSED 104.18.2.161:443');
          },
        },
      };

      const provider = new ResendEmailProvider('re_test_key_123', 'VIBE-CONNECT <noreply@vibe-connect.co.ke>', mockResendClient);
      EmailService.setProvider(provider);

      const result = await EmailService.sendVerificationEmail({
        to: 'network.user@example.com',
        name: 'Network User',
        token: 'tok_net',
      });

      assert.equal(result.success, false);
      assert.equal(result.provider, 'resend');
      assert.ok(result.error?.includes('ECONNREFUSED'));
    });
  });

  describe('5. Missing API Credentials & Provider Selection Strategy', () => {
    it('fails clearly in production if RESEND_API_KEY is missing or placeholder', () => {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = '';
      process.env.EMAIL_PROVIDER = 'resend';

      assert.throws(
        () => selectEmailProvider(null),
        /Production email provider misconfiguration: RESEND_API_KEY is required/
      );
    });

    it('fails clearly in production if EMAIL_PROVIDER is set to mock', () => {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = 're_live_valid_key_12345';
      process.env.EMAIL_PROVIDER = 'mock';

      assert.throws(
        () => selectEmailProvider(null),
        /Production email provider misconfiguration: EMAIL_PROVIDER is set to "mock"/
      );
    });

    it('selects ResendEmailProvider in production when valid credentials are present', () => {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = 're_live_valid_key_12345';
      process.env.EMAIL_PROVIDER = 'auto';

      const provider = selectEmailProvider(null);
      assert.equal(provider.name, 'resend');
      assert.ok(provider instanceof ResendEmailProvider);
    });

    it('selects MockEmailProvider in development when no API key is provided', () => {
      process.env.NODE_ENV = 'development';
      process.env.RESEND_API_KEY = '';
      process.env.EMAIL_PROVIDER = 'auto';

      const provider = selectEmailProvider(null);
      assert.equal(provider.name, 'mock');
      assert.ok(provider instanceof MockEmailProvider);
    });

    it('selects MockEmailProvider in test environment by default', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.EMAIL_PROVIDER;

      const provider = selectEmailProvider(null);
      assert.equal(provider.name, 'mock');
    });
  });

  describe('6. Rate Limiting & Cooldown Enforced in Resend Flow', () => {
    it('blocks rapid successive verification requests with HTTP 429 cooldown', async () => {
      const email = `cooldown-${Date.now()}@test-resend.co.ke`;

      // Setup user with active cooldown in database
      const user = await prisma.user.create({
        data: {
          email,
          name: 'Cooldown Tester',
          passwordHash: 'hash_test',
          emailVerified: false,
          phoneVerified: false,
          emailVerificationCooldownUntil: new Date(Date.now() + 45 * 1000), // 45s remaining
        },
      });

      try {
        await assert.rejects(
          async () => {
            await AuthService.resendVerificationEmail({ email });
          },
          (err: any) => {
            assert.equal(err.statusCode, 429);
            assert.ok(err.message.includes('Please wait'));
            return true;
          }
        );
      } finally {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      }
    });
  });

  describe('7. Verification Token Expiry, Single-Use, and Persisted Status', () => {
    it('rejects expired verification tokens with HTTP 400', async () => {
      const email = `expired-${Date.now()}@test-resend.co.ke`;
      const rawToken = generateSecureToken(32);
      const hashedToken = hashVerificationCode(rawToken);

      const user = await prisma.user.create({
        data: {
          email,
          name: 'Expired Tester',
          passwordHash: 'hash_test',
          emailVerified: false,
          phoneVerified: false,
          emailVerificationTokenHash: hashedToken,
          emailVerificationExpiresAt: new Date(Date.now() - 10 * 60 * 1000), // Expired 10 mins ago
        },
      });

      try {
        await assert.rejects(
          async () => {
            await AuthService.verifyEmail({ token: rawToken });
          },
          (err: any) => {
            assert.equal(err.statusCode, 400);
            assert.ok(err.message.includes('Invalid or expired'));
            return true;
          }
        );
      } finally {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      }
    });

    it('successfully verifies account, updates database status, and invalidates token for single-use', async () => {
      const email = `verify-success-${Date.now()}@test-resend.co.ke`;
      const rawToken = generateSecureToken(32);
      const hashedToken = hashVerificationCode(rawToken);

      const user = await prisma.user.create({
        data: {
          email,
          name: 'Success Tester',
          passwordHash: 'hash_test',
          emailVerified: false,
          phoneVerified: false,
          emailVerificationTokenHash: hashedToken,
          emailVerificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // Valid for 30m
        },
      });

      try {
        // 1. First verification attempt -> Should succeed
        const res = await AuthService.verifyEmail({ token: rawToken });
        assert.equal(res.emailVerified, true);
        assert.equal(res.email, email);

        // 2. Verify database was persisted with emailVerified=true and token cleared
        const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
        assert.equal(updatedUser.emailVerified, true);
        assert.equal(updatedUser.emailVerificationTokenHash, null);
        assert.equal(updatedUser.emailVerificationExpiresAt, null);

        // 3. Second verification attempt with same token -> Must be rejected (single use)
        await assert.rejects(
          async () => {
            await AuthService.verifyEmail({ token: rawToken });
          },
          (err: any) => {
            assert.equal(err.statusCode, 400);
            return true;
          }
        );
      } finally {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      }
    });
  });
});
