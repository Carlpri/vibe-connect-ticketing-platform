process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { ZodError, z } from 'zod';
import app from '../server';
import { errorHandler } from '../shared/middleware/errorHandler';
import { validateBody } from '../shared/middleware/validate';
import { env } from '../config/env';
import { AppError } from '../shared/errors/AppError';
import { authenticate, requireRole } from '../modules/auth/auth.middleware';

describe('VIBE-CONNECT Error Handling & Security Audit Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    // Start ephemeral server on a free port for integration testing
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // -------------------------------------------------------------
  // Test 1: Zod validation failure
  // -------------------------------------------------------------
  it('1. Returns 400 with safe field errors on Zod validation failure', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: '123', // less than 6 chars
        name: 'A', // less than 2 chars
      }),
    });

    const body = (await res.json()) as any;

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Validation failed');
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.length >= 3);

    // Verify fields are safe and do NOT leak submitted values
    const fields = body.errors.map((e: any) => e.field);
    assert.ok(fields.includes('email'));
    assert.ok(fields.includes('password'));
    assert.ok(fields.includes('name'));

    // Sensitive values must not be present
    const rawString = JSON.stringify(body);
    assert.ok(!rawString.includes('123'));
    assert.ok(!rawString.includes('stack'));
  });

  // -------------------------------------------------------------
  // Test 2: Duplicate email registration (Prisma P2002 handling)
  // -------------------------------------------------------------
  it('2. Returns 409 with safe message on duplicate resource (P2002 simulation)', async () => {
    const testApp = express();
    testApp.get('/test/p2002', () => {
      const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['email'] },
      });
      throw err;
    });
    testApp.use(errorHandler);

    const testServer = testApp.listen(0);
    const port = (testServer.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/test/p2002`);
      const body = (await res.json()) as any;

      assert.equal(res.status, 409);
      assert.equal(body.success, false);
      assert.equal(body.message, 'A record with this information already exists');
      // Ensure no raw SQL or DB constraint names in client response
      assert.ok(!JSON.stringify(body).includes('Unique constraint failed'));
    } finally {
      testServer.close();
    }
  });

  // -------------------------------------------------------------
  // Test 3: Missing resource (Prisma P2025 and 404 AppError)
  // -------------------------------------------------------------
  it('3. Returns 404 with safe message on missing record (P2025)', async () => {
    const testApp = express();
    testApp.get('/test/p2025', () => {
      const err = new Prisma.PrismaClientKnownRequestError('Record to delete does not exist', {
        code: 'P2025',
        clientVersion: '6.19.3',
      });
      throw err;
    });
    testApp.use(errorHandler);

    const testServer = testApp.listen(0);
    const port = (testServer.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/test/p2025`);
      const body = (await res.json()) as any;

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Resource not found');
      assert.ok(!JSON.stringify(body).includes('Record to delete does not exist'));
    } finally {
      testServer.close();
    }
  });

  // -------------------------------------------------------------
  // Test 4: Invalid JWT
  // -------------------------------------------------------------
  it('4. Returns 401 with safe message on invalid JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid.fake.token',
      },
    });

    const body = (await res.json()) as any;

    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Invalid or expired token');
    assert.ok(!JSON.stringify(body).includes('JsonWebTokenError'));
    assert.ok(!JSON.stringify(body).includes('jwt malformed'));
  });

  // -------------------------------------------------------------
  // Test 5: Missing authentication
  // -------------------------------------------------------------
  it('5. Returns 401 with safe message when authorization header is missing', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    const body = (await res.json()) as any;

    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Authentication token missing or invalid');
  });

  // -------------------------------------------------------------
  // Test 6: Insufficient permissions (role guard)
  // -------------------------------------------------------------
  it('6. Returns 403 when user lacks required role', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.get('/test/organizer-only', authenticate, requireRole('ORGANIZER', 'ADMIN'), (_req, res) => {
      res.json({ success: true, message: 'Welcome Organizer' });
    });
    testApp.use(errorHandler);

    const testServer = testApp.listen(0);
    const port = (testServer.address() as { port: number }).port;

    try {
      // Generate valid token for an ATTENDEE (insufficient privilege)
      const attendeeToken = jwt.sign(
        { userId: '11111111-1111-1111-1111-111111111111', email: 'attendee@example.com', role: 'ATTENDEE' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`http://127.0.0.1:${port}/test/organizer-only`, {
        headers: {
          Authorization: `Bearer ${attendeeToken}`,
        },
      });

      const body = (await res.json()) as any;

      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Forbidden: Insufficient privileges');
    } finally {
      testServer.close();
    }
  });

  // -------------------------------------------------------------
  // Test 7: Database connection or initialization error (P1000/PrismaClientInitializationError)
  // -------------------------------------------------------------
  it('7. Returns 500 without leaking credentials or paths on database initialization failure', async () => {
    const testApp = express();
    testApp.get('/test/db-fail', () => {
      const err = new Prisma.PrismaClientInitializationError(
        'Authentication failed against database server, the provided database credentials for `postgres` at aws-1-eu-west-3.pooler.supabase.com:5432 with password [SECRET_PASS] are not valid in C:\\VIBE-CONNECT\\src\\modules\\auth\\auth.service.ts:10:40',
        '6.19.3'
      );
      throw err;
    });
    testApp.use(errorHandler);

    const testServer = testApp.listen(0);
    const port = (testServer.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/test/db-fail`);
      const body = (await res.json()) as any;

      assert.equal(res.status, 500);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Database service unavailable. Please try again later.');

      const responseText = JSON.stringify(body);
      // Crucial: Must NEVER leak paths, credentials, or Supabase host
      assert.ok(!responseText.includes('C:\\VIBE-CONNECT'));
      assert.ok(!responseText.includes('aws-1-eu-west-3.pooler.supabase.com'));
      assert.ok(!responseText.includes('SECRET_PASS'));
      assert.ok(!responseText.includes('auth.service.ts'));
    } finally {
      testServer.close();
    }
  });

  // -------------------------------------------------------------
  // Test 8: Unexpected internal server error
  // -------------------------------------------------------------
  it('8. Returns generic 500 without leaking internal error message or stack trace', async () => {
    const testApp = express();
    testApp.get('/test/unhandled', () => {
      throw new Error('Critical internal crash at C:\\private\\source\\secrets.ts:55');
    });
    testApp.use(errorHandler);

    const testServer = testApp.listen(0);
    const port = (testServer.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/test/unhandled`);
      const body = (await res.json()) as any;

      assert.equal(res.status, 500);
      assert.equal(body.success, false);
      assert.equal(body.message, 'An unexpected internal server error occurred');

      const responseText = JSON.stringify(body);
      assert.ok(!responseText.includes('Critical internal crash'));
      assert.ok(!responseText.includes('secrets.ts'));
      assert.ok(!responseText.includes('stack'));
    } finally {
      testServer.close();
    }
  });

  // -------------------------------------------------------------
  // Test 9: Unknown route
  // -------------------------------------------------------------
  it('9. Returns 404 with structured JSON for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-route-999`);
    const body = (await res.json()) as any;

    assert.equal(res.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Endpoint not found: GET /api/non-existent-route-999');
  });

  // -------------------------------------------------------------
  // Test 10: Successful response format verification
  // -------------------------------------------------------------
  it('10. Confirms successful response contract { success: true, data, message }', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = (await res.json()) as any;

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(typeof body.message, 'string');
    assert.equal(typeof body.data, 'object');
    assert.equal(body.data.status, 'healthy');
  });
});
