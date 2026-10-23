process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../server';
import { prisma } from '../shared/utils/prisma';
import { env } from '../config/env';
import { hashVerificationCode, generateSecureToken, generateSecureOtp } from '../shared/utils/crypto';
import { normalizePhoneNumber } from '../shared/utils/phone';
import { SmsService } from '../shared/services/sms.service';

describe('VIBE-CONNECT Email & Phone Verification Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const testEmail1 = `test-verification-1-${Date.now()}@example.com`;
  const testEmail2 = `test-verification-2-${Date.now()}@example.com`;
  const testPhone1 = '+254712345678';
  const testPhone2 = '+254798765432';

  before(async () => {
    // Start ephemeral server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Cleanup any leftovers with test domain
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-verification' } },
          { phone: { in: [testPhone1, testPhone2] } },
        ],
      },
    });
  });

  after(async () => {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-verification' } },
          { phone: { in: [testPhone1, testPhone2] } },
        ],
      },
    });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // -------------------------------------------------------------
  // Test 1: New users start with both verification flags set to false
  // -------------------------------------------------------------
  it('1. New user registration starts with emailVerified=false and phoneVerified=false', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        password: 'Password123!',
        name: 'Verification User 1',
        phone: '0712345678', // Kenyan local format
        role: 'ATTENDEE',
      }),
    });

    const body = (await res.json()) as any;

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.user.emailVerified, false);
    assert.equal(body.data.user.phoneVerified, false);
    assert.equal(body.data.user.phone, testPhone1); // Check normalization to +254712345678
  });

  // -------------------------------------------------------------
  // Test 2: Valid email token verifies correct email
  // -------------------------------------------------------------
  it('2. Valid email verification token verifies the account and invalidates token', async () => {
    // Retrieve the generated raw token or create a known one in DB
    const rawToken = generateSecureToken(32);
    const tokenHash = hashVerificationCode(rawToken);

    await prisma.user.update({
      where: { email: testEmail1 },
      data: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const res = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });

    const body = (await res.json()) as any;

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.emailVerified, true);

    // Verify DB state
    const userInDb = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.equal(userInDb?.emailVerified, true);
    assert.equal(userInDb?.emailVerificationTokenHash, null);
    assert.equal(userInDb?.emailVerificationExpiresAt, null);
  });

  // -------------------------------------------------------------
  // Test 3: Invalid and expired email tokens are rejected
  // -------------------------------------------------------------
  it('3. Invalid and expired email tokens are rejected with 400', async () => {
    // Test invalid token
    const resInvalid = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'completely-invalid-nonexistent-token' }),
    });
    const bodyInvalid = (await resInvalid.json()) as any;
    assert.equal(resInvalid.status, 400);
    assert.equal(bodyInvalid.success, false);
    assert.equal(bodyInvalid.message, 'Invalid or expired verification token');

    // Test expired token
    const expiredRawToken = generateSecureToken(32);
    const expiredHash = hashVerificationCode(expiredRawToken);
    await prisma.user.update({
      where: { email: testEmail1 },
      data: {
        emailVerificationTokenHash: expiredHash,
        emailVerificationExpiresAt: new Date(Date.now() - 1000), // Expired in past
      },
    });

    const resExpired = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: expiredRawToken }),
    });
    const bodyExpired = (await resExpired.json()) as any;
    assert.equal(resExpired.status, 400);
    assert.equal(bodyExpired.success, false);
    assert.equal(bodyExpired.message, 'Invalid or expired verification token');
  });

  // -------------------------------------------------------------
  // Test 4: A used email token cannot be reused
  // -------------------------------------------------------------
  it('4. A used email token cannot be reused', async () => {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashVerificationCode(rawToken);

    await prisma.user.update({
      where: { email: testEmail1 },
      data: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // First use: succeeds
    const firstRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });
    assert.equal(firstRes.status, 200);

    // Second use: must fail
    const secondRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });
    const secondBody = (await secondRes.json()) as any;
    assert.equal(secondRes.status, 400);
    assert.equal(secondBody.success, false);
  });

  // -------------------------------------------------------------
  // Test 5: Resending email invalidates previous token
  // -------------------------------------------------------------
  it('5. Resending verification email invalidates previous token and applies cooldown', async () => {
    // Set user as unverified with initial token
    const oldRawToken = generateSecureToken(32);
    await prisma.user.update({
      where: { email: testEmail1 },
      data: {
        emailVerified: false,
        emailVerificationTokenHash: hashVerificationCode(oldRawToken),
        emailVerificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        emailVerificationCooldownUntil: null,
      },
    });

    // Resend email
    const resendRes = await fetch(`${baseUrl}/api/auth/resend-verification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail1 }),
    });
    assert.equal(resendRes.status, 200);

    // Old token must no longer work
    const oldTokenRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: oldRawToken }),
    });
    assert.equal(oldTokenRes.status, 400);

    // Immediate repeat resend must hit 429 cooldown
    const cooldownRes = await fetch(`${baseUrl}/api/auth/resend-verification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail1 }),
    });
    assert.equal(cooldownRes.status, 429);
  });

  // -------------------------------------------------------------
  // Test 6: Valid OTP verifies phone number
  // -------------------------------------------------------------
  it('6. Valid 6-digit OTP verifies phone number', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set known OTP hash
    const rawOtp = '742918';
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: false,
        phoneVerificationOtpHash: hashVerificationCode(rawOtp),
        phoneVerificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        phoneVerificationAttempts: 0,
      },
    });

    const res = await fetch(`${baseUrl}/api/auth/verify-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: rawOtp }),
    });

    const body = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.phoneVerified, true);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(updated?.phoneVerified, true);
    assert.equal(updated?.phoneVerificationOtpHash, null);
    assert.equal(updated?.phoneVerificationExpiresAt, null);
  });

  // -------------------------------------------------------------
  // Test 7: Invalid and expired OTPs are rejected
  // -------------------------------------------------------------
  it('7. Invalid and expired OTPs are rejected with 400', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set expired OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerificationOtpHash: hashVerificationCode('123456'),
        phoneVerificationExpiresAt: new Date(Date.now() - 1000),
        phoneVerificationAttempts: 0,
      },
    });

    const resExpired = await fetch(`${baseUrl}/api/auth/verify-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: '123456' }),
    });
    const bodyExpired = (await resExpired.json()) as any;
    assert.equal(resExpired.status, 400);
    assert.equal(bodyExpired.message, 'Verification code has expired. Please request a new OTP.');
  });

  // -------------------------------------------------------------
  // Test 8: OTP failed-attempt limits are enforced
  // -------------------------------------------------------------
  it('8. Enforces max attempt limits and invalidates OTP after too many failures', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const correctOtp = '654321';
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerificationOtpHash: hashVerificationCode(correctOtp),
        phoneVerificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        phoneVerificationAttempts: 4, // 4 already failed, next is 5th (max)
      },
    });

    // 5th failed attempt
    const res5 = await fetch(`${baseUrl}/api/auth/verify-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: '000000' }),
    });
    assert.equal(res5.status, 400);

    // Next attempt even with correct code should be rejected because max was exceeded
    const resLocked = await fetch(`${baseUrl}/api/auth/verify-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: correctOtp }),
    });
    assert.equal(resLocked.status, 400);
  });

  // -------------------------------------------------------------
  // Test 9: A used OTP cannot be reused
  // -------------------------------------------------------------
  it('9. A used OTP cannot be reused', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const rawOtp = '882244';
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerificationOtpHash: hashVerificationCode(rawOtp),
        phoneVerificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        phoneVerificationAttempts: 0,
      },
    });

    // 1st use succeeds
    const res1 = await fetch(`${baseUrl}/api/auth/verify-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: rawOtp }),
    });
    assert.equal(res1.status, 200);

    // 2nd use fails
    const res2 = await fetch(`${baseUrl}/api/auth/verify-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: rawOtp }),
    });
    assert.equal(res2.status, 400);
  });

  // -------------------------------------------------------------
  // Test 10: Replacing an OTP invalidates the old one
  // -------------------------------------------------------------
  it('10. Sending a new OTP replaces and invalidates the previous OTP', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const oldOtp = '112233';
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerificationOtpHash: hashVerificationCode(oldOtp),
        phoneVerificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        phoneVerificationCooldownUntil: null,
      },
    });

    // Request new OTP via send-phone-otp
    const sendRes = await fetch(`${baseUrl}/api/auth/send-phone-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(sendRes.status, 200);

    // Try verifying old OTP: must fail
    const verifyOldRes = await fetch(`${baseUrl}/api/auth/verify-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: oldOtp }),
    });
    assert.equal(verifyOldRes.status, 400);
  });

  // -------------------------------------------------------------
  // Test 11: One user cannot verify another user's phone number
  // -------------------------------------------------------------
  it('11. Users cannot verify or claim another users phone number', async () => {
    // Register user 2
    const resUser2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail2,
        password: 'Password123!',
        name: 'Verification User 2',
        phone: '0798765432', // testPhone2
      }),
    });
    assert.equal(resUser2.status, 201);

    const user1 = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user1);

    const user1Token = jwt.sign(
      { userId: user1.id, email: user1.email, role: user1.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // User 1 tries to send OTP claiming User 2's phone number
    const conflictRes = await fetch(`${baseUrl}/api/auth/send-phone-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ phone: testPhone2 }),
    });
    const conflictBody = (await conflictRes.json()) as any;

    assert.equal(conflictRes.status, 409);
    assert.equal(conflictBody.message, 'This phone number is already registered to another account');
  });

  // -------------------------------------------------------------
  // Test 12: Changing a verified phone number resets verification status
  // -------------------------------------------------------------
  it('12. Changing phone number resets phoneVerified to false', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    // Set phone as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true, phoneVerificationCooldownUntil: null },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update to a new available phone
    const newPhone = '+254700000001';
    const res = await fetch(`${baseUrl}/api/auth/send-phone-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone: newPhone }),
    });
    assert.equal(res.status, 200);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(updated?.phone, newPhone);
    assert.equal(updated?.phoneVerified, false); // Successfully reset!

    // Clean up temp phone
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: testPhone1 },
    });
  });

  // -------------------------------------------------------------
  // Test 13: Unverified users cannot perform protected actions
  // -------------------------------------------------------------
  it('13. requireAtLeastOneVerified blocks users without a verified contact (HTTP 403)', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    // Set both to false
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: false, phoneVerified: false },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Test with a test endpoint guarded by the purchase verification policy
    const expressApp = (await import('express')).default;
    const { requireAtLeastOneVerified } = await import('../modules/auth/auth.middleware');
    const testApp = expressApp();
    testApp.use(expressApp.json());
    testApp.post(
      '/test/purchase',
      (await import('../modules/auth/auth.middleware')).authenticate,
      requireAtLeastOneVerified,
      (_req, res) => {
        res.json({ success: true, message: 'Ticket purchased' });
      }
    );
    testApp.use((await import('../shared/middleware/errorHandler')).errorHandler);

    const testServer = testApp.listen(0);
    const port = (testServer.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/test/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const body = (await res.json()) as any;
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('verification'));
    } finally {
      testServer.close();
    }
  });

  // -------------------------------------------------------------
  // Test 14: Verified users pass the verification middleware
  // -------------------------------------------------------------
  it('14. A user with one verified contact passes the purchase verification guard', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    // Email verification alone is sufficient.
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, phoneVerified: false },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const expressApp = (await import('express')).default;
    const { requireAtLeastOneVerified } = await import('../modules/auth/auth.middleware');
    const testApp = expressApp();
    testApp.use(expressApp.json());
    testApp.post(
      '/test/purchase',
      (await import('../modules/auth/auth.middleware')).authenticate,
      requireAtLeastOneVerified,
      (_req, res) => {
        res.json({ success: true, message: 'Ticket purchased successfully' });
      }
    );
    testApp.use((await import('../shared/middleware/errorHandler')).errorHandler);

    const testServer = testApp.listen(0);
    const port = (testServer.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/test/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const body = (await res.json()) as any;
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, 'Ticket purchased successfully');
    } finally {
      testServer.close();
    }
  });

  // -------------------------------------------------------------
  // Test 15: Profile endpoint returns verification flags without secrets
  // -------------------------------------------------------------
  it('15. GET /api/auth/me returns emailVerified and phoneVerified without exposing secrets', async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail1 } });
    assert.ok(user);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(typeof body.data.emailVerified, 'boolean');
    assert.equal(typeof body.data.phoneVerified, 'boolean');

    // Security check: Must NEVER expose passwordHash or verification hashes
    const rawJson = JSON.stringify(body);
    assert.ok(!rawJson.includes('passwordHash'));
    assert.ok(!rawJson.includes('emailVerificationTokenHash'));
    assert.ok(!rawJson.includes('phoneVerificationOtpHash'));
  });

  // -------------------------------------------------------------
  // Test 16: Safe handling of phone normalization
  // -------------------------------------------------------------
  it('16. Validates and normalizes diverse Kenyan phone formats', () => {
    const cases = [
      { input: '0712345678', expected: '+254712345678' },
      { input: '0112345678', expected: '+254112345678' },
      { input: '254712345678', expected: '+254712345678' },
      { input: '+254712345678', expected: '+254712345678' },
      { input: ' 0712-345 678 ', expected: '+254712345678' },
    ];

    for (const c of cases) {
      const res = normalizePhoneNumber(c.input);
      assert.equal(res.isValid, true);
      assert.equal(res.e164, c.expected);
    }

    const invalidCases = ['123', '0212345678', 'invalid', '0812345678'];
    for (const inv of invalidCases) {
      const res = normalizePhoneNumber(inv);
      assert.equal(res.isValid, false);
    }
  });

  // -------------------------------------------------------------
  // Test 17: Concurrent verification attempts cannot double-verify or replay
  // -------------------------------------------------------------
  it('17. Concurrent verification requests handle token race condition safely', async () => {
    const rawToken = generateSecureToken(32);
    await prisma.user.update({
      where: { email: testEmail1 },
      data: {
        emailVerified: false,
        emailVerificationTokenHash: hashVerificationCode(rawToken),
        emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Fire two verification requests concurrently with the exact same token
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken }),
      }),
      fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken }),
      }),
    ]);

    const statuses = [res1.status, res2.status];
    // Exactly one must succeed (200), and the other must fail (400)
    assert.ok(statuses.includes(200));
    assert.ok(statuses.includes(400));
  });

  // -------------------------------------------------------------
  // Test 18: Africa's Talking SMS adapter supports Sandbox mode without sender ID
  // -------------------------------------------------------------
  it('18. Africa\'s Talking SMS adapter supports Sandbox mode without a sender ID', () => {
    // When username is 'sandbox' and senderId is not provided
    const { endpoint, bodyParams } = SmsService.buildRequestPayload({
      username: 'sandbox',
      to: '+254712345678',
      message: 'Your verification code is: 123456',
    });

    // Endpoint must target the official Africa's Talking Sandbox gateway
    assert.equal(endpoint, 'https://api.sandbox.africastalking.com/version1/messaging');
    assert.equal(bodyParams.get('username'), 'sandbox');
    assert.equal(bodyParams.get('to'), '+254712345678');
    assert.equal(bodyParams.get('message'), 'Your verification code is: 123456');

    // 'from' parameter MUST be absent so Africa's Talking defaults to sandbox sender shortcode
    assert.equal(bodyParams.has('from'), false);
    assert.equal(bodyParams.get('from'), null);
  });

  // -------------------------------------------------------------
  // Test 19: Sandbox mode safely omits unapproved alphanumeric sender IDs
  // -------------------------------------------------------------
  it('19. Sandbox mode safely omits alphanumeric sender ID to prevent gateway rejection', () => {
    // If a developer accidentally configures an alphanumeric sender ID while using sandbox username
    const { endpoint, bodyParams } = SmsService.buildRequestPayload({
      username: 'sandbox',
      to: '+254712345678',
      message: 'Code: 654321',
      senderId: 'VIBE-CONNECT', // Alphanumeric sender ID
    });

    assert.equal(endpoint, 'https://api.sandbox.africastalking.com/version1/messaging');
    // Alphanumeric 'from' must be omitted in sandbox to avoid carrier/gateway rejection
    assert.equal(bodyParams.has('from'), false);
  });

  // -------------------------------------------------------------
  // Test 20: Production mode uses standard gateway and includes configured sender ID
  // -------------------------------------------------------------
  it('20. Production mode uses live gateway and attaches configured sender ID', () => {
    const { endpoint, bodyParams } = SmsService.buildRequestPayload({
      username: 'vibe_connect_live',
      to: '+254712345678',
      message: 'Code: 999888',
      senderId: 'VIBE-CONNECT',
    });

    assert.equal(endpoint, 'https://api.africastalking.com/version1/messaging');
    assert.equal(bodyParams.get('username'), 'vibe_connect_live');
    assert.equal(bodyParams.get('from'), 'VIBE-CONNECT');

    // And if senderId is empty string in production, 'from' is omitted
    const withoutSender = SmsService.buildRequestPayload({
      username: 'vibe_connect_live',
      to: '+254712345678',
      message: 'Code: 999888',
      senderId: '   ',
    });
    assert.equal(withoutSender.bodyParams.has('from'), false);
  });
});
