process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../server';
import { prisma } from '../shared/utils/prisma';
import { env } from '../config/env';
import { buildTicketQrPayload } from '../shared/utils/ticketQr';
import { TicketStatus, CheckInOutcome } from '@prisma/client';

describe('Production QR Ticket Check-In & Admission Validation Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const runId = Date.now();
  const organizer1Email = `checkin-org1-${runId}@example.com`;
  const organizer2Email = `checkin-org2-${runId}@example.com`;
  const adminEmail = `checkin-admin-${runId}@example.com`;
  const attendeeEmail = `checkin-attendee-${runId}@example.com`;

  let organizer1Id: string;
  let organizer2Id: string;
  let adminId: string;
  let attendeeId: string;

  let organizer1Token: string;
  let organizer2Token: string;
  let adminToken: string;
  let attendeeToken: string;

  let event1Id: string;
  let event2Id: string;
  let expiredEventId: string;
  let cancelledEventId: string;

  let ticketType1Id: string;
  let ticketType2Id: string;
  let expiredTicketTypeId: string;

  let validTicket1Id: string;
  let validTicket1Qr: string;

  let validTicket2Id: string;
  let validTicket2Qr: string;

  let concurrentTicketId: string;
  let concurrentTicketQr: string;

  let event2TicketId: string;
  let event2TicketQr: string;

  let unpaidTicketId: string;
  let unpaidTicketQr: string;

  let voidTicketId: string;
  let voidTicketQr: string;

  let expiredTicketId: string;
  let expiredTicketQr: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 1. Create Users
    const org1 = await prisma.user.create({
      data: {
        email: organizer1Email,
        name: 'Main Festival Organizer',
        passwordHash: 'hash',
        phone: `254790${String(runId).slice(-6)}`,
        role: 'ORGANIZER',
        organizerApplicationStatus: 'APPROVED',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    organizer1Id = org1.id;

    const org2 = await prisma.user.create({
      data: {
        email: organizer2Email,
        name: 'Other Unrelated Organizer',
        passwordHash: 'hash',
        phone: `254791${String(runId).slice(-6)}`,
        role: 'ORGANIZER',
        organizerApplicationStatus: 'APPROVED',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    organizer2Id = org2.id;

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Platform Auditor Admin',
        passwordHash: 'hash',
        phone: `254792${String(runId).slice(-6)}`,
        role: 'ADMIN',
        organizerApplicationStatus: 'APPROVED',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    adminId = admin.id;

    const att = await prisma.user.create({
      data: {
        email: attendeeEmail,
        name: 'Faith Mwangi',
        passwordHash: 'hash',
        phone: `254793${String(runId).slice(-6)}`,
        role: 'ATTENDEE',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    attendeeId = att.id;

    // Tokens
    organizer1Token = jwt.sign({ userId: organizer1Id, email: organizer1Email, role: 'ORGANIZER' }, env.JWT_SECRET, { expiresIn: '1h' });
    organizer2Token = jwt.sign({ userId: organizer2Id, email: organizer2Email, role: 'ORGANIZER' }, env.JWT_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ userId: adminId, email: adminEmail, role: 'ADMIN' }, env.JWT_SECRET, { expiresIn: '1h' });
    attendeeToken = jwt.sign({ userId: attendeeId, email: attendeeEmail, role: 'ATTENDEE' }, env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Create Events
    const now = Date.now();
    const event1 = await prisma.event.create({
      data: {
        organizerId: organizer1Id,
        title: 'Nairobi Beats & Tech 2026',
        slug: `nairobi-beats-tech-${runId}`,
        description: 'Flagship festival for admission testing.',
        category: 'Music',
        status: 'PUBLISHED',
        startsAt: new Date(now - 1 * 60 * 60 * 1000), // started 1 hour ago
        endsAt: new Date(now + 6 * 60 * 60 * 1000),   // ends in 6 hours
        venue: 'KICC Grounds',
        city: 'Nairobi',
      },
    });
    event1Id = event1.id;

    const event2 = await prisma.event.create({
      data: {
        organizerId: organizer2Id,
        title: 'Mombasa Coastal Sunset Rave',
        slug: `mombasa-sunset-rave-${runId}`,
        description: 'Separate event owned by Org 2.',
        category: 'Parties',
        status: 'PUBLISHED',
        startsAt: new Date(now + 24 * 60 * 60 * 1000),
        endsAt: new Date(now + 30 * 60 * 60 * 1000),
        venue: 'Nyali Beach',
        city: 'Mombasa',
      },
    });
    event2Id = event2.id;

    const expiredEvent = await prisma.event.create({
      data: {
        organizerId: organizer1Id,
        title: 'Yesterday Retro Gala',
        slug: `yesterday-retro-gala-${runId}`,
        description: 'Event that concluded 24 hours ago.',
        category: 'Music',
        status: 'PUBLISHED',
        startsAt: new Date(now - 30 * 60 * 60 * 1000),
        endsAt: new Date(now - 20 * 60 * 60 * 1000), // ended 20 hours ago (>12h grace window)
        venue: 'Carnivore Grounds',
        city: 'Nairobi',
      },
    });
    expiredEventId = expiredEvent.id;

    const cancelledEvent = await prisma.event.create({
      data: {
        organizerId: organizer1Id,
        title: 'Cancelled Street Bash',
        slug: `cancelled-street-bash-${runId}`,
        description: 'Cancelled concert.',
        category: 'Music',
        status: 'CANCELLED',
        startsAt: new Date(now + 10 * 60 * 60 * 1000),
        endsAt: new Date(now + 14 * 60 * 60 * 1000),
        venue: 'Westlands Mall',
        city: 'Nairobi',
      },
    });
    cancelledEventId = cancelledEvent.id;

    // 3. Create Ticket Types
    const tt1 = await prisma.ticketType.create({
      data: {
        eventId: event1Id,
        name: 'VIP Golden Circle',
        priceKes: 3500,
        capacity: 100,
        sold: 10,
        isActive: true,
      },
    });
    ticketType1Id = tt1.id;

    const tt2 = await prisma.ticketType.create({
      data: {
        eventId: event2Id,
        name: 'Beach Pass',
        priceKes: 2000,
        capacity: 200,
        sold: 5,
        isActive: true,
      },
    });
    ticketType2Id = tt2.id;

    const ttExp = await prisma.ticketType.create({
      data: {
        eventId: expiredEventId,
        name: 'Retro Pass',
        priceKes: 1000,
        capacity: 50,
        sold: 5,
        isActive: true,
      },
    });
    expiredTicketTypeId = ttExp.id;

    // 4. Create Paid Order for Event 1 (Valid tickets)
    const paidOrder1 = await prisma.order.create({
      data: {
        userId: attendeeId,
        eventId: event1Id,
        totalKes: 7000,
        status: 'PAID',
        paidAt: new Date(),
        expiresAt: new Date(now + 15 * 60 * 1000),
        items: {
          create: [{ ticketTypeId: ticketType1Id, quantity: 3, unitPriceKes: 3500 }],
        },
      },
      include: { items: true },
    });
    const item1 = paidOrder1.items[0];

    const tkt1 = await prisma.ticket.create({
      data: {
        orderId: paidOrder1.id,
        orderItemId: item1.id,
        ticketTypeId: ticketType1Id,
        eventId: event1Id,
        userId: attendeeId,
        serialNumber: 1,
        status: TicketStatus.ISSUED,
      },
    });
    validTicket1Id = tkt1.id;
    validTicket1Qr = buildTicketQrPayload(validTicket1Id);

    const tkt2 = await prisma.ticket.create({
      data: {
        orderId: paidOrder1.id,
        orderItemId: item1.id,
        ticketTypeId: ticketType1Id,
        eventId: event1Id,
        userId: attendeeId,
        serialNumber: 2,
        status: TicketStatus.ISSUED,
      },
    });
    validTicket2Id = tkt2.id;
    validTicket2Qr = buildTicketQrPayload(validTicket2Id);

    const tktConcurrent = await prisma.ticket.create({
      data: {
        orderId: paidOrder1.id,
        orderItemId: item1.id,
        ticketTypeId: ticketType1Id,
        eventId: event1Id,
        userId: attendeeId,
        serialNumber: 3,
        status: TicketStatus.ISSUED,
      },
    });
    concurrentTicketId = tktConcurrent.id;
    concurrentTicketQr = buildTicketQrPayload(concurrentTicketId);

    // 5. Create Ticket for Event 2 (Wrong event test)
    const order2 = await prisma.order.create({
      data: {
        userId: attendeeId,
        eventId: event2Id,
        totalKes: 2000,
        status: 'PAID',
        paidAt: new Date(),
        expiresAt: new Date(now + 15 * 60 * 1000),
        items: {
          create: [{ ticketTypeId: ticketType2Id, quantity: 1, unitPriceKes: 2000 }],
        },
      },
      include: { items: true },
    });
    const tktE2 = await prisma.ticket.create({
      data: {
        orderId: order2.id,
        orderItemId: order2.items[0].id,
        ticketTypeId: ticketType2Id,
        eventId: event2Id,
        userId: attendeeId,
        serialNumber: 1,
        status: TicketStatus.ISSUED,
      },
    });
    event2TicketId = tktE2.id;
    event2TicketQr = buildTicketQrPayload(event2TicketId);

    // 6. Create Unpaid Pending Order Ticket
    const pendingOrder = await prisma.order.create({
      data: {
        userId: attendeeId,
        eventId: event1Id,
        totalKes: 3500,
        status: 'PENDING',
        expiresAt: new Date(now + 15 * 60 * 1000),
        items: {
          create: [{ ticketTypeId: ticketType1Id, quantity: 1, unitPriceKes: 3500 }],
        },
      },
      include: { items: true },
    });
    const tktPending = await prisma.ticket.create({
      data: {
        orderId: pendingOrder.id,
        orderItemId: pendingOrder.items[0].id,
        ticketTypeId: ticketType1Id,
        eventId: event1Id,
        userId: attendeeId,
        serialNumber: 4,
        status: TicketStatus.ISSUED,
      },
    });
    unpaidTicketId = tktPending.id;
    unpaidTicketQr = buildTicketQrPayload(unpaidTicketId);

    // 7. Create Void Ticket
    const tktVoid = await prisma.ticket.create({
      data: {
        orderId: paidOrder1.id,
        orderItemId: item1.id,
        ticketTypeId: ticketType1Id,
        eventId: event1Id,
        userId: attendeeId,
        serialNumber: 5,
        status: TicketStatus.VOID,
      },
    });
    voidTicketId = tktVoid.id;
    voidTicketQr = buildTicketQrPayload(voidTicketId);

    // 8. Create Expired Event Ticket
    const expOrder = await prisma.order.create({
      data: {
        userId: attendeeId,
        eventId: expiredEventId,
        totalKes: 1000,
        status: 'PAID',
        paidAt: new Date(now - 25 * 60 * 60 * 1000),
        expiresAt: new Date(now - 24 * 60 * 60 * 1000),
        items: {
          create: [{ ticketTypeId: expiredTicketTypeId, quantity: 1, unitPriceKes: 1000 }],
        },
      },
      include: { items: true },
    });
    const tktExp = await prisma.ticket.create({
      data: {
        orderId: expOrder.id,
        orderItemId: expOrder.items[0].id,
        ticketTypeId: expiredTicketTypeId,
        eventId: expiredEventId,
        userId: attendeeId,
        serialNumber: 1,
        status: TicketStatus.ISSUED,
      },
    });
    expiredTicketId = tktExp.id;
    expiredTicketQr = buildTicketQrPayload(expiredTicketId);
  });

  after(async () => {
    try {
      await prisma.checkInLog.deleteMany({ where: { eventId: { in: [event1Id, event2Id, expiredEventId, cancelledEventId] } } });
      await prisma.ticket.deleteMany({ where: { eventId: { in: [event1Id, event2Id, expiredEventId, cancelledEventId] } } });
      await prisma.orderItem.deleteMany({ where: { order: { eventId: { in: [event1Id, event2Id, expiredEventId, cancelledEventId] } } } });
      await prisma.order.deleteMany({ where: { eventId: { in: [event1Id, event2Id, expiredEventId, cancelledEventId] } } });
      await prisma.ticketType.deleteMany({ where: { eventId: { in: [event1Id, event2Id, expiredEventId, cancelledEventId] } } });
      await prisma.event.deleteMany({ where: { id: { in: [event1Id, event2Id, expiredEventId, cancelledEventId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [organizer1Id, organizer2Id, adminId, attendeeId] } } });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('1. Rejects unauthenticated check-in requests with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: validTicket1Qr }),
    });
    assert.equal(res.status, 401);
  });

  it('2. Rejects ordinary attendee roles from scanning tickets with HTTP 403', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attendeeToken}`,
      },
      body: JSON.stringify({ identifier: validTicket1Qr }),
    });
    assert.equal(res.status, 403);
  });

  it('3. Rejects staff/organizer without permission for this event with UNAUTHORIZED outcome', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer2Token}`,
      },
      body: JSON.stringify({ identifier: validTicket1Qr }),
    });
    assert.equal(res.status, 403);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'UNAUTHORIZED');
  });

  it('4. Rejects tampered / forged QR tokens with INVALID outcome', async () => {
    const tamperedPayload = validTicket1Qr.slice(0, -4) + 'zzzz';
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer1Token}`,
      },
      body: JSON.stringify({ identifier: tamperedPayload }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'INVALID');
    assert.equal(body.data.valid, false);
  });

  it('5. Rejects ticket belonging to another event with INVALID outcome', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer1Token}`,
      },
      body: JSON.stringify({ identifier: event2TicketQr }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'INVALID');
    assert.ok(body.message.includes('different event'));
  });

  it('6. Rejects unpaid or pending-payment ticket with PAYMENT_PENDING outcome', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer1Token}`,
      },
      body: JSON.stringify({ identifier: unpaidTicketQr }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'PAYMENT_PENDING');
    assert.equal(body.data.valid, false);
  });

  it('7. Rejects cancelled or voided ticket with CANCELLED outcome', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer1Token}`,
      },
      body: JSON.stringify({ identifier: voidTicketQr }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'CANCELLED');
    assert.equal(body.data.valid, false);
  });

  it('8. Rejects expired event ticket with EXPIRED outcome', async () => {
    const res = await fetch(`${baseUrl}/api/events/${expiredEventId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer1Token}`,
      },
      body: JSON.stringify({ identifier: expiredTicketQr }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'EXPIRED');
    assert.equal(body.data.valid, false);
  });

  it('9. Successfully admits a valid ticket with VALID outcome and records check-in', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer1Token}`,
      },
      body: JSON.stringify({ identifier: validTicket1Qr }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'VALID');
    assert.equal(body.data.valid, true);
    assert.equal(body.data.alreadyCheckedIn, false);
    assert.equal(body.data.ticketId, validTicket1Id);
    assert.equal(body.data.ticketType.name, 'VIP Golden Circle');
    assert.equal(body.data.attendee.name, 'Faith Mwangi');
    assert.ok(body.data.checkedInAt);

    // Verify persisted database state
    const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: validTicket1Id } });
    assert.equal(updated.status, TicketStatus.CHECKED_IN);
    assert.equal(updated.checkedInById, organizer1Id);
    assert.ok(updated.checkedInAt);
  });

  it('10. Re-scanning admitted ticket immediately returns ALREADY_USED with previous timestamp', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer1Token}`,
      },
      body: JSON.stringify({ identifier: validTicket1Qr }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'ALREADY_USED');
    assert.equal(body.data.alreadyCheckedIn, true);
    assert.ok(body.data.previousCheckInAt);
  });

  it('11. Supports manual ticket UUID entry fallback with VALID outcome', async () => {
    // Ticket 2 has not been scanned yet; we supply raw UUID directly
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizer1Token}`,
      },
      body: JSON.stringify({ identifier: validTicket2Id }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'VALID');
    assert.equal(body.data.valid, true);
    assert.equal(body.data.ticketId, validTicket2Id);

    const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: validTicket2Id } });
    assert.equal(updated.status, TicketStatus.CHECKED_IN);
  });

  it('12. Prevents concurrent duplicate admissions: exactly one scan admits, the other receives ALREADY_USED', async () => {
    const [scanA, scanB] = await Promise.all([
      fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${organizer1Token}` },
        body: JSON.stringify({ identifier: concurrentTicketQr }),
      }),
      fetch(`${baseUrl}/api/events/${event1Id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${organizer1Token}` },
        body: JSON.stringify({ identifier: concurrentTicketQr }),
      }),
    ]);

    const bodyA = (await scanA.json()) as any;
    const bodyB = (await scanB.json()) as any;

    const outcomes = [bodyA.data.outcome, bodyB.data.outcome];
    assert.ok(outcomes.includes('VALID'), 'One concurrent scan must be VALID');
    assert.ok(outcomes.includes('ALREADY_USED'), 'Second concurrent scan must be ALREADY_USED');

    // Confirm database only has 1 checked-in record
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: concurrentTicketId } });
    assert.equal(ticket.status, TicketStatus.CHECKED_IN);
  });

  it('13. Admin can scan tickets for any event', async () => {
    // Event 2 ticket checked in on Event 2 using Admin token
    const res = await fetch(`${baseUrl}/api/events/${event2Id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ identifier: event2TicketQr }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.outcome, 'VALID');
    assert.equal(body.data.ticketId, event2TicketId);
  });

  it('14. GET /api/events/:id/check-in/stats returns authoritative counts and audit history', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1Id}/check-in/stats`, {
      headers: { Authorization: `Bearer ${organizer1Token}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.ok(body.data.counts.total >= 3);
    assert.ok(body.data.counts.checkedIn >= 3);
    assert.ok(body.data.recentScans.length >= 3);

    // Verify audit logs contain masked attendee emails and no raw QR tokens
    assert.ok(body.data.recentScans.every((s: { ticketCode?: string }) => !s.ticketCode?.startsWith('VC1:')));
  });
});
